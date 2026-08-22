# backend_ai/engines/assistant/chat.py

import json
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from engines.memory.store import MemoryStore
from engines.knowledge.knowledge_base import KnowledgeBase
from engines.analytics.analyzer import AnalyticsEngine

logger = logging.getLogger(__name__)

class ChatAssistant:
    """
    Assistant Engine - Chat với AI
    """
    
    def __init__(self):
        self.memory = MemoryStore()
        self.knowledge = KnowledgeBase()
        self.analytics = AnalyticsEngine()
        self.contexts = {}
    
    def answer(self, question: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Trả lời câu hỏi của người dùng.
        Nếu có context chứa scan_id/document_id, assistant sẽ trả lời dựa trên
        dữ liệu đã lưu trong memory thay vì chỉ dựa trên text tĩnh.
        """
        logger.info(f"💬 Question: {question}")
        self.analytics.log_event(
            "assistant_chat",
            {
                "question": question,
                "context": context or {},
            },
        )
        
        if context and self._has_document_context(context):
            return self._answer_document_context(question, context)

        intent = self._detect_intent(question)
        
        if intent == "business":
            return self._answer_business(question)
        elif intent == "stats":
            return self._answer_stats(question)
        elif intent == "search":
            return self._answer_search(question)
        elif intent == "knowledge":
            return self._answer_knowledge(question)
        elif intent == "help":
            return self._answer_help()
        else:
            return self._answer_general(question)
    
    def _has_document_context(self, context: Dict[str, Any]) -> bool:
        return bool(
            context.get("scan_id") or
            context.get("document_id") or
            context.get("doc_id") or
            context.get("fields")
        )

    def _answer_document_context(self, question: str, context: Dict[str, Any]) -> str:
        """Trả lời dựa trên dữ liệu tài liệu đã lưu trong memory."""
        doc_id = str(
            context.get("scan_id") or
            context.get("document_id") or
            context.get("doc_id") or
            ""
        )
        document = self.memory.get(doc_id) if doc_id else None

        if document is None:
            document = {
                "filename": context.get("filename") or "context-document",
                "fields": context.get("fields", {}),
                "confidence": context.get("confidence", 0.0),
                "reasoning": context.get("reasoning", []),
            }

        fields = document.get("fields", {})
        confidence = float(document.get("confidence", 0.0))
        filename = document.get("filename", "Unknown")
        reasoning = document.get("reasoning", [])
        if isinstance(reasoning, str):
            reasoning = [reasoning]
        question_lower = question.lower()

        if any(k in question_lower for k in ["đã nhập", "nhập erp", "import", "erp"]):
            import_status = self.analytics.get_import_status(doc_id)
            if import_status.get("imported"):
                return (
                    f"✅ {filename} đã có lịch sử import ERP trong analytics.\n"
                    f"- Event: {import_status.get('event_type')}\n"
                    f"- Thời điểm: {import_status.get('created_at')}"
                )
            return f"⚠️ {filename} chưa có event import ERP nào với scan_id {doc_id}"

        if "tóm tắt" in question_lower or "summary" in question_lower:
            summary_lines = [f"📄 {filename}"]
            summary_lines.append(f"- Confidence: {confidence * 100:.1f}%")
            for key, value in fields.items():
                summary_lines.append(f"- {key}: {value}")
            return "\n".join(summary_lines)

        if any(k in question_lower for k in ["xác nhận", "điều kiện", "auto"]):
            if confidence >= 0.98:
                return f"✅ {filename} đủ điều kiện tự động nhập ERP với confidence {confidence * 100:.1f}%"
            return f"⚠️ {filename} chưa đủ ngưỡng auto-import. Confidence hiện tại: {confidence * 100:.1f}%"

        if any(k in question_lower for k in ["lý do", "reason", "suy luận"]):
            return "\n".join(["🧠 Lý do suy luận:"] + [str(item) for item in reasoning[:5]])

        return (
            f"📄 Tài liệu: {filename}\n"
            f"- Confidence: {confidence * 100:.1f}%\n"
            f"- Trường chính: {', '.join(f'{k}={v}' for k, v in fields.items())}"
        )

    def _detect_intent(self, question: str) -> str:
        """Nhận diện ý định của câu hỏi"""
        question_lower = question.lower()

        if any(k in question_lower for k in ["tổng quan", "dashboard", "báo cáo", "gần đây", "xu hướng", "tài liệu mới"]):
            return "business"
        elif any(k in question_lower for k in ["thống kê", "bao nhiêu", "số lượng", "tổng", "nhiều nhất"]):
            return "stats"
        elif any(k in question_lower for k in ["tìm", "tra cứu", "kiểm tra", "xem"]):
            return "search"
        elif any(k in question_lower for k in ["máy", "ca", "sản phẩm", "công nhân"]):
            return "knowledge"
        elif any(k in question_lower for k in ["giúp", "hướng dẫn", "làm thế nào", "cách"]):
            return "help"
        else:
            return "general"

    def _answer_business(self, question: str) -> str:
        """Trả lời trên dữ liệu dashboard / thời sự / xu hướng."""
        question_lower = question.lower()
        stats = self.analytics.get_stats(period_days=30)
        daily = self.analytics.get_daily_stats(days=7)
        machines = self.analytics.get_most_common_machines(limit=5)
        docs = self.memory.get_all(limit=5)

        if "tài liệu mới" in question_lower or "gần đây" in question_lower or "recent" in question_lower:
            snippets = ["📄 Tài liệu gần đây:"]
            for doc in docs[:5]:
                snippets.append(f"- {doc.get('filename')} (confidence {float(doc.get('confidence', 0.0))*100:.1f}%)")
            return "\n".join(snippets)

        if "xu hướng" in question_lower or "trend" in question_lower:
            lines = ["📈 Xu hướng import 7 ngày:"]
            for day in daily:
                lines.append(f"- {day['date']}: {day['count']} event")
            return "\n".join(lines)

        answer = ["📊 Tổng quan ERP AI:"]
        answer.append(f"- Tổng sự kiện 30 ngày: {stats.get('total_events', 0)}")
        answer.append(f"- Độ tin cậy trung bình: {stats.get('avg_confidence', 0.0)*100:.1f}%")
        if machines:
            answer.append("- Máy được sử dụng nhiều nhất:")
            for machine in machines:
                answer.append(f"  • {machine['machine']}: {machine['count']} lần")
        return "\n".join(answer)
    
    def _answer_stats(self, question: str) -> str:
        """Trả lời câu hỏi thống kê"""
        # Lấy thống kê
        stats = self.analytics.get_stats(period_days=30)
        daily = self.analytics.get_daily_stats(days=7)
        machines = self.analytics.get_most_common_machines(limit=5)
        
        answer = f"📊 **Thống kê 30 ngày qua:**\n"
        answer += f"- Tổng số tài liệu đã xử lý: {stats.get('total_events', 0)}\n"
        answer += f"- Độ tin cậy trung bình: {stats.get('avg_confidence', 0)*100:.1f}%\n"
        
        if machines:
            answer += "\n🏭 **Máy sử dụng nhiều nhất:**\n"
            for m in machines:
                answer += f"- {m['machine']}: {m['count']} lần\n"
        
        if daily:
            answer += "\n📅 **7 ngày gần nhất:**\n"
            for d in daily[:5]:
                answer += f"- {d['date']}: {d['count']} tài liệu\n"
        
        return answer
    
    def _answer_search(self, question: str) -> str:
        """Trả lời câu hỏi tra cứu"""
        # Tìm từ khóa
        import re
        keywords = re.findall(r'[A-Z0-9\-_]+', question.upper())
        
        if not keywords:
            return "🔍 Vui lòng nhập mã cần tra cứu (ví dụ: MC06, SP-001)"
        
        results = []
        for kw in keywords:
            # Tìm trong memory
            docs = self.memory.get_all(limit=50)
            for doc in docs:
                text = doc.get('text', '').upper()
                if kw in text:
                    fields = doc.get('fields', {})
                    results.append({
                        "id": doc.get('id'),
                        "filename": doc.get('filename'),
                        "fields": fields,
                        "confidence": doc.get('confidence', 0)
                    })
        
        if not results:
            return f"❌ Không tìm thấy kết quả cho '{keywords[0]}'"
        
        answer = f"🔍 **Kết quả tìm kiếm cho '{keywords[0]}':**\n"
        for r in results[:5]:
            answer += f"\n📄 {r['filename']} (conf: {r['confidence']*100:.1f}%)\n"
            for key, value in r['fields'].items():
                if key != 'document_type':
                    answer += f"  - {key}: {value}\n"
        
        return answer
    
    def _answer_knowledge(self, question: str) -> str:
        """Trả lời câu hỏi về tri thức"""
        question_lower = question.lower()
        
        # Kiểm tra từ khóa
        if "máy" in question_lower:
            machine_match = re.search(r'(MC\d{2})', question.upper())
            if machine_match:
                code = machine_match.group(1)
                info = self.knowledge.get("machine_codes", {}).get(code)
                if info:
                    return f"📌 **{code}**:\n- Tên: {info.get('name', 'N/A')}\n- Loại: {info.get('type', 'N/A')}\n- Công suất: {info.get('capacity', 'N/A')}"
                else:
                    return f"❌ Không tìm thấy thông tin về {code}"
        
        if "ca" in question_lower:
            shift_match = re.search(r'(ca\s*([1-3]))', question_lower)
            if shift_match:
                shift = shift_match.group(2)
                shift_name = self.knowledge.get("shift_names", {}).get(shift)
                return f"📌 **Ca {shift}**: {shift_name or 'Không có thông tin'}"
        
        return "❓ Tôi chưa có đủ thông tin để trả lời. Bạn có thể hỏi về máy (MCxx), ca (ca 1/2/3), hoặc sản phẩm."
    
    def _answer_help(self) -> str:
        """Hướng dẫn sử dụng"""
        return """
🤖 **Trợ giúp - ERP AI Assistant**

Tôi có thể giúp bạn:

📊 **Thống kê**: 
  - "Hôm nay có bao nhiêu tài liệu?"
  - "Thống kê máy sử dụng nhiều nhất"

🔍 **Tra cứu**:
  - "Tìm MC06"
  - "Tra cứu SP-001"

📚 **Tri thức**:
  - "Máy MC06 là gì?"
  - "Ca 2 là ca gì?"

💡 **Gợi ý**: Hãy hỏi cụ thể để tôi trả lời chính xác nhất!
"""
    
    def _answer_general(self, question: str) -> str:
        """Trả lời câu hỏi chung"""
        # Fallback
        return f"🤔 Tôi chưa hiểu câu hỏi: '{question}'\n\n💡 Gõ 'giúp' để xem các câu hỏi có thể."