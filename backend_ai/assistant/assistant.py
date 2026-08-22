"""
Assistant
=========

Lớp chính điều phối trợ lý AI.
Kết hợp LLM, tools, session management để trả lời câu hỏi và thực hiện tác vụ.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Union

from .prompts import (
    SYSTEM_PROMPT,
    EXPLAIN_PROMPT,
    CORRECT_PROMPT,
    QUERY_PROMPT,
    FALLBACK_PROMPT,
)
from .tools import AssistantTools
from .session_manager import SessionManager

logger = logging.getLogger(__name__)


class Assistant:
    """
    Trợ lý AI thông minh cho hệ thống xử lý tài liệu.
    """

    def __init__(
        self,
        llm=None,
        gateway=None,
        knowledge=None,
        memory=None,
        validator=None,
        tools: Optional[AssistantTools] = None,
        session_manager: Optional[SessionManager] = None,
        config: Optional[Dict[str, Any]] = None,
    ):
        self.llm = llm  # BaseModelAdapter hoặc None (nếu không có LLM, dùng rule-based)
        self.gateway = gateway
        self.knowledge = knowledge
        self.memory = memory
        self.validator = validator

        # Tools
        self.tools = tools or AssistantTools(
            gateway=gateway,
            knowledge=knowledge,
            memory=memory,
            validator=validator,
        )

        # Session manager
        self.session_manager = session_manager or SessionManager()

        # Config
        self.config = config or {}
        self.max_history = self.config.get("max_history", 20)
        self.use_llm = self.config.get("use_llm", True) and llm is not None

        logger.info("Assistant initialized (LLM enabled: %s)", self.use_llm)

    # ----------------------------------------------------------------
    # Phương thức chính
    # ----------------------------------------------------------------

    def chat(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Xử lý tin nhắn từ người dùng.

        :param user_id: ID người dùng
        :param message: Nội dung tin nhắn
        :param session_id: ID phiên (nếu có)
        :param context: Context bổ sung (ví dụ: document_id đang xem)
        :return: Dict chứa phản hồi và thông tin phiên
        """
        # 1. Lấy hoặc tạo session
        if session_id:
            session = self.session_manager.get_session(session_id)
            if session is None:
                # Session không tồn tại, tạo mới
                session = self.session_manager.create_session(user_id, context)
                session_id = session.session_id
        else:
            session = self.session_manager.create_session(user_id, context)
            session_id = session.session_id

        # 2. Lưu tin nhắn người dùng
        self.session_manager.add_message(session_id, "user", message)

        # 3. Xác định ý định và thực thi
        response = self._process_message(session_id, message)

        # 4. Lưu phản hồi
        self.session_manager.add_message(session_id, "assistant", response["content"])

        # 5. Trả về kết quả
        return {
            "session_id": session_id,
            "response": response["content"],
            "metadata": response.get("metadata", {}),
            "context": self.session_manager.get_context(session_id),
        }

    def _process_message(self, session_id: str, message: str) -> Dict[str, Any]:
        """
        Xử lý tin nhắn: phân tích ý định, gọi tool hoặc LLM.
        """
        # Lấy context session
        context = self.session_manager.get_context(session_id)

        # Phân tích ý định
        intent, params = self._parse_intent(message, context)

        logger.debug("Intent: %s, params: %s", intent, params)

        if intent == "explain":
            return self._handle_explain(params, context)
        elif intent == "correct":
            return self._handle_correct(params, context)
        elif intent == "query":
            return self._handle_query(params, context)
        elif intent == "tool":
            return self._handle_tool(params, context)
        elif intent == "greeting":
            return self._handle_greeting()
        else:
            # Fallback: dùng LLM hoặc rule-based
            return self._handle_fallback(message, context)

    # ----------------------------------------------------------------
    # Xử lý ý định
    # ----------------------------------------------------------------

    def _parse_intent(self, message: str, context: Dict[str, Any]) -> tuple:
        """
        Phân tích ý định từ tin nhắn.
        Trả về (intent, params)
        """
        msg = message.lower().strip()

        # Các pattern đơn giản (có thể dùng LLM để phân loại nếu cần)
        if re.search(r"giải thích|tại sao|vì sao|explain", msg):
            # Lấy document_id từ context hoặc từ tin nhắn
            doc_id = context.get("document_id")
            if not doc_id:
                # Tìm trong tin nhắn: "giải thích doc_123"
                match = re.search(r"doc[_\-](\w+)", msg)
                if match:
                    doc_id = f"doc_{match.group(1)}"
            return "explain", {"document_id": doc_id}

        if re.search(r"sửa|correct|điều chỉnh|fix", msg):
            doc_id = context.get("document_id")
            return "correct", {"document_id": doc_id}

        if re.search(r"tìm|tra cứu|lookup|search|khách hàng|sản phẩm", msg):
            return "query", {"query": message}

        if re.search(r"thống kê|statistic|tổng quan", msg):
            return "tool", {"tool_name": "get_statistics"}

        if re.search(r"xin chào|hello|hi|chào", msg):
            return "greeting", {}

        # Có thể là tool call trực tiếp: /tool get_document_status doc_123
        if msg.startswith("/tool"):
            parts = msg.split()
            if len(parts) >= 2:
                tool_name = parts[1]
                params = {}
                if len(parts) >= 3:
                    params["document_id"] = parts[2]
                return "tool", {"tool_name": tool_name, **params}

        # Mặc định là query (dùng LLM)
        return "query", {"query": message}

    def _handle_explain(self, params: Dict, context: Dict) -> Dict[str, Any]:
        """Giải thích kết quả xử lý tài liệu."""
        doc_id = params.get("document_id")
        if not doc_id:
            return {
                "content": "Tôi cần biết ID của tài liệu để giải thích. Bạn vui lòng cung cấp nhé.",
                "metadata": {"intent": "explain", "error": "missing_document_id"}
            }

        # Lấy dữ liệu từ memory
        if self.memory is None:
            return {"content": "Hệ thống không có bộ nhớ để truy xuất tài liệu."}

        data = self.memory.retrieve(doc_id)
        if data is None:
            return {
                "content": f"Không tìm thấy tài liệu '{doc_id}'. Vui lòng kiểm tra lại ID.",
                "metadata": {"intent": "explain", "document_id": doc_id}
            }

        # Tạo prompt giải thích
        prompt = EXPLAIN_PROMPT.format(
            filename=data.get("filename", "không rõ"),
            raw_text=data.get("text", "")[:500],
            fields=json.dumps(data.get("fields", {}), ensure_ascii=False, indent=2),
            confidence=data.get("confidence", 0.0),
            needs_review="Có" if data.get("needs_review", True) else "Không",
            reasoning=data.get("reasoning", ""),
        )

        # Nếu có LLM, dùng để sinh giải thích
        if self.use_llm:
            try:
                response = self.llm.generate(prompt, system=SYSTEM_PROMPT)
                explanation = response.get("text", "")
            except Exception as e:
                logger.warning("LLM explain failed: %s", e)
                explanation = self._generate_explain_fallback(data)
        else:
            explanation = self._generate_explain_fallback(data)

        return {
            "content": explanation,
            "metadata": {"intent": "explain", "document_id": doc_id}
        }

    def _generate_explain_fallback(self, data: Dict) -> str:
        """Sinh giải thích thủ công khi không có LLM."""
        fields = data.get("fields", {})
        confidence = data.get("confidence", 0.0)
        needs_review = data.get("needs_review", True)

        lines = [
            f"📄 Tài liệu: {data.get('filename', 'không rõ')}",
            f"🔍 Độ tin cậy: {confidence*100:.1f}%",
            f"📊 Cần xem xét: {'Có' if needs_review else 'Không'}",
            "",
            "📋 Các trường trích xuất:",
        ]
        for k, v in fields.items():
            lines.append(f"  - {k}: {v}")

        if needs_review:
            lines.append("")
            lines.append("⚠️ Tài liệu cần được xem xét lại vì độ tin cậy thấp hoặc validation thất bại.")
            lines.append("Gợi ý: Kiểm tra lại các trường quan trọng và sửa nếu cần.")

        return "\n".join(lines)

    def _handle_correct(self, params: Dict, context: Dict) -> Dict[str, Any]:
        """Đề xuất sửa lỗi cho tài liệu."""
        doc_id = params.get("document_id")
        if not doc_id:
            return {"content": "Vui lòng cung cấp ID tài liệu cần sửa."}

        # Lấy gợi ý từ tools
        result = self.tools.call_tool("suggest_corrections", document_id=doc_id)
        if not result.get("success"):
            return {"content": f"Không thể đề xuất sửa lỗi: {result.get('error')}"}

        suggestions = result["result"]["suggestions"]
        if not suggestions:
            return {
                "content": "✅ Tài liệu này không có lỗi nào cần sửa.",
                "metadata": {"intent": "correct", "document_id": doc_id}
            }

        # Tạo phản hồi
        lines = ["🔧 Đề xuất sửa lỗi:", ""]
        for i, s in enumerate(suggestions, 1):
            lines.append(f"{i}. Trường '{s['field']}':")
            lines.append(f"   - Giá trị hiện tại: {s.get('current_value', 'trống')}")
            lines.append(f"   - Vấn đề: {s.get('issue', 'không rõ')}")
            lines.append(f"   - Gợi ý: {s.get('suggestion', 'kiểm tra lại')}")
            if s.get("confidence"):
                lines.append(f"   - Độ tin cậy gợi ý: {s['confidence']*100:.0f}%")
            lines.append("")

        return {
            "content": "\n".join(lines),
            "metadata": {"intent": "correct", "document_id": doc_id, "suggestion_count": len(suggestions)}
        }

    def _handle_query(self, params: Dict, context: Dict) -> Dict[str, Any]:
        """Xử lý truy vấn thông tin."""
        query = params.get("query", "")

        # Nếu có LLM, dùng để trả lời
        if self.use_llm:
            try:
                # Lấy thêm context từ knowledge base
                customer_info = ""
                product_info = ""
                history = ""

                # Tìm kiếm trong memory nếu có
                if self.memory:
                    # Tìm kiếm đơn giản
                    search_results = self.memory.search(query, limit=5)
                    if search_results:
                        history = json.dumps(search_results, ensure_ascii=False, indent=2)

                prompt = QUERY_PROMPT.format(
                    question=query,
                    customer_info=customer_info or "Không có thông tin khách hàng",
                    product_info=product_info or "Không có thông tin sản phẩm",
                    history=history or "Không có lịch sử",
                )
                response = self.llm.generate(prompt, system=SYSTEM_PROMPT)
                answer = response.get("text", "Xin lỗi, tôi không có câu trả lời cho câu hỏi này.")
            except Exception as e:
                logger.warning("LLM query failed: %s", e)
                answer = "Xin lỗi, tôi không thể xử lý câu hỏi này ngay bây giờ."
        else:
            answer = self._handle_fallback(query, context)["content"]

        return {
            "content": answer,
            "metadata": {"intent": "query"}
        }

    def _handle_tool(self, params: Dict, context: Dict) -> Dict[str, Any]:
        """Gọi trực tiếp một công cụ."""
        tool_name = params.get("tool_name")
        if not tool_name:
            return {"content": "Vui lòng chỉ định tên công cụ."}

        # Lọc params dành cho tool
        tool_params = {k: v for k, v in params.items() if k not in ["tool_name"]}

        result = self.tools.call_tool(tool_name, **tool_params)
        if not result.get("success"):
            return {"content": f"Tool '{tool_name}' thất bại: {result.get('error')}"}

        # Định dạng kết quả
        output = json.dumps(result["result"], ensure_ascii=False, indent=2)
        return {
            "content": f"✅ Kết quả từ tool '{tool_name}':\n{output}",
            "metadata": {"intent": "tool", "tool_name": tool_name}
        }

    def _handle_greeting(self) -> Dict[str, Any]:
        """Xử lý lời chào."""
        return {
            "content": (
                "Xin chào! Tôi là trợ lý AI của hệ thống xử lý tài liệu.\n\n"
                "Tôi có thể giúp bạn:\n"
                "- Giải thích kết quả xử lý tài liệu\n"
                "- Đề xuất sửa lỗi cho các trường dữ liệu\n"
                "- Tra cứu thông tin khách hàng, sản phẩm\n"
                "- Tìm kiếm tài liệu\n"
                "- Xem thống kê hệ thống\n\n"
                "Hãy hỏi tôi bất cứ điều gì bạn cần!"
            ),
            "metadata": {"intent": "greeting"}
        }

    def _handle_fallback(self, message: str, context: Dict) -> Dict[str, Any]:
        """Xử lý fallback khi không xác định được ý định."""
        # Nếu có LLM, dùng để trả lời tự do
        if self.use_llm:
            try:
                # Lấy history từ session
                history = self.session_manager.get_history(context.get("session_id"), limit=5)
                history_text = "\n".join([f"{h['role']}: {h['content']}" for h in history])

                prompt = f"""
                Người dùng hỏi: {message}

                Lịch sử hội thoại:
                {history_text}

                Hãy trả lời một cách tự nhiên, hữu ích.
                Nếu không biết, hãy gợi ý người dùng hỏi về các chủ đề đã được hỗ trợ.
                """

                response = self.llm.generate(prompt, system=SYSTEM_PROMPT)
                answer = response.get("text", FALLBACK_PROMPT)
            except Exception as e:
                logger.warning("LLM fallback failed: %s", e)
                answer = FALLBACK_PROMPT
        else:
            answer = FALLBACK_PROMPT

        return {
            "content": answer,
            "metadata": {"intent": "fallback"}
        }

    # ----------------------------------------------------------------
    # Phương thức tiện ích
    # ----------------------------------------------------------------

    def get_session_history(self, session_id: str, limit: int = 10) -> List[Dict]:
        """Lấy lịch sử hội thoại của phiên."""
        return self.session_manager.get_history(session_id, limit=limit)

    def delete_session(self, session_id: str) -> bool:
        """Xoá phiên."""
        return self.session_manager.delete_session(session_id)

    def get_tools_list(self) -> List[str]:
        """Danh sách công cụ có sẵn."""
        return self.tools.list_tools()