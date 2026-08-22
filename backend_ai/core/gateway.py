"""
Gateway
=======

Central AI Gateway - Powered by Multi-Agent Framework
With Database, Cache, Monitoring, and Optimizations
"""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Any, Dict, Optional, List, Tuple

# Configuration
from config.settings import settings

# Agent Framework
from agents import (
    AgentManager,
    VisionAgent,
    OCRAgent,
    LLMFallbackAgent,
    BrainAgent,
    ValidationAgent,
    ReasoningAgent,
    KnowledgeAgent,
    ConfidenceAgent,
    MemoryAgent,
    ERPImportAgent,
    AnalyticsAgent,
    ReasoningMergeAgent,
)

# Engines
from engines.vision.processor import VisionProcessor
from engines.brain.interpreter import Interpreter
from engines.reasoning.reasoner import Reasoner
from engines.validation.validator import Validator
from engines.memory.store import MemoryStore
from engines.knowledge.knowledge_base import KnowledgeBase
from engines.analytics.analyzer import AnalyticsEngine
from engines.automation.importer import ERPImporter
from engines.assistant.chat import ChatAssistant
from engines.ocr.hybrid_runner import OCRHybridRunner

# Database
from database.core import init_database, get_session_maker
from database.models import Document
from database.repositories import DocumentRepository, UserRepository

# Cache, Monitoring, Optimizations
from cache import get_cache
from monitoring import get_logger, get_metrics, HealthChecker
from optimizations import BatchProcessor, ParallelExecutor

# Models
from models.base_model_adapter import BaseModelAdapter
from models.qwen.qwen_vl import QwenVLModel

# Processing Context
from .processing_context import ProcessingContext

try:
    from engines.learning.learner import Learner
except ImportError:
    Learner = None

logger = logging.getLogger(__name__)


class Gateway:
    """
    Central AI Gateway sử dụng AgentManager để điều phối pipeline.
    Tích hợp database, cache, metrics và monitoring.
    """

    def __init__(
        self,
        vision: Optional[VisionProcessor] = None,
        ocr_runner = None,
        brain: Optional[Interpreter] = None,
        reasoner: Optional[Reasoner] = None,
        validator: Optional[Validator] = None,
        memory: Optional[MemoryStore] = None,
        knowledge: Optional[KnowledgeBase] = None,
        analytics: Optional[AnalyticsEngine] = None,
        importer: Optional[ERPImporter] = None,
        chat: Optional[ChatAssistant] = None,
        learner: Optional[Any] = None,
        llm: Optional[BaseModelAdapter] = None,
        enable_llm: bool = True,
        agent_manager: Optional[AgentManager] = None,
        # Database
        enable_db: bool = True,
        # Cache
        enable_cache: bool = True,
    ):
        logger.info("Initializing Gateway with full Agent Framework...")

        # Engine instances
        self.vision = vision or VisionProcessor()
        self.ocr = ocr_runner or OCRHybridRunner()
        self.brain = brain or Interpreter()
        self.reasoner = reasoner or Reasoner()
        self.validator = validator or Validator()
        self.memory = memory or MemoryStore()
        self.knowledge = knowledge or KnowledgeBase()
        self.analytics = analytics or AnalyticsEngine()
        self.importer = importer or ERPImporter()
        self.chat = chat or ChatAssistant()
        self.learner = learner

        # LLM
        self._llm: Optional[BaseModelAdapter] = llm
        self._enable_llm = enable_llm
        self._llm_loaded = False
        self._llm_load_error: Optional[str] = None

        # ========== Database ==========
        self._enable_db = enable_db
        self._db_session = None
        self._document_repo = None
        self._user_repo = None
        if enable_db:
            self._init_database()

        # ========== Cache ==========
        self._enable_cache = enable_cache
        self.cache = get_cache() if enable_cache else None

        # ========== Monitoring ==========
        self.logger = get_logger()
        self.metrics = get_metrics()
        self.health_checker = HealthChecker(self)

        # ========== Optimizations ==========
        self.batch_processor = BatchProcessor(self)
        self.parallel_executor = ParallelExecutor()

        # ========== Agent Manager ==========
        self.agent_manager = agent_manager or AgentManager("gateway")
        self._register_all_agents()

        logger.info("Gateway ready with %d agents, DB=%s, Cache=%s",
                   len(self.agent_manager._agents), enable_db, enable_cache)

    def _init_database(self):
        """Khởi tạo kết nối database."""
        try:
            # Lấy session maker
            maker = get_session_maker()
            self._db_session = maker()
            self._document_repo = DocumentRepository(self._db_session)
            self._user_repo = UserRepository(self._db_session)
            logger.info("Database connection initialized")
        except Exception as e:
            logger.error("Failed to initialize database: %s", e)
            self._enable_db = False
            self._db_session = None

    def _register_all_agents(self):
        """Đăng ký tất cả agent theo đúng thứ tự phụ thuộc."""
        # Phase 3.2: Vision, OCR, LLM Fallback
        self.agent_manager.register(VisionAgent(self.vision))
        self.agent_manager.register(OCRAgent(self.ocr))
        self.agent_manager.register(LLMFallbackAgent(
            llm=self.llm,
            config={"enable": self._enable_llm}
        ))

        # Phase 3.3: Brain, Validation
        self.agent_manager.register(BrainAgent(self.brain))
        self.agent_manager.register(ValidationAgent(self.validator))

        # Phase 3.4: Reasoning
        self.agent_manager.register(ReasoningAgent(self.reasoner))

        # Phase 3.5: Knowledge
        self.agent_manager.register(KnowledgeAgent(self.knowledge))

        # Phase 3.6: Confidence, Memory, ERP
        self.agent_manager.register(ConfidenceAgent())
        self.agent_manager.register(MemoryAgent(self.memory))
        self.agent_manager.register(ERPImportAgent(self.importer))

        # Phase 3.7: Analytics, Reasoning Merge
        self.agent_manager.register(AnalyticsAgent(self.analytics))
        self.agent_manager.register(ReasoningMergeAgent())

    @property
    def llm(self) -> Optional[BaseModelAdapter]:
        """Lazy-load LLM."""
        if not self._enable_llm:
            return None
        if self._llm_loaded:
            return self._llm

        self._llm_loaded = True
        try:
            model = QwenVLModel(model_name=settings.qwen_model_name)
            if model.load_model():
                self._llm = model
                logger.info("Qwen VL model loaded.")
            else:
                self._llm_load_error = "Model load failed"
                self._llm = None
                logger.error("Qwen VL model failed to load.")
        except Exception as e:
            self._llm_load_error = str(e)
            self._llm = None
            logger.exception("Exception loading Qwen VL: %s", e)
        return self._llm

    # -------------------------------------------------------------------------
    # Phương thức xử lý chính (có cache + database)
    # -------------------------------------------------------------------------

    def process_document(
        self,
        image_bytes: bytes,
        filename: str,
        user_id: str = "system",
        skip_cache: bool = False,
    ) -> ProcessingContext:
        """
        Xử lý tài liệu thông qua pipeline agent.
        Hỗ trợ cache và lưu vào database.
        """
        start = time.time()
        document_id = f"{int(start)}_{filename}"

        self.logger.info("Processing document: %s (user: %s)", filename, user_id)

        # ========== 1. Kiểm tra cache ==========
        if self._enable_cache and not skip_cache:
            cache_key = self._get_cache_key(image_bytes, filename, user_id)
            cached = self.cache.get(cache_key)
            if cached:
                self.logger.info("Cache hit for %s", filename)
                self.metrics.counter_inc("cache_hit")
                # Tạo ProcessingContext từ cache
                cached["image"] = None  # không lưu image trong cache
                cached["processing_time"] = time.time() - start
                return ProcessingContext(**cached)

        self.metrics.counter_inc("cache_miss")

        # ========== 2. Chạy pipeline ==========
        context = {
            "image_bytes": image_bytes,
            "filename": filename,
            "user_id": user_id,
            "document_id": document_id,
            "processing_time": 0.0,
            "llm_used": False,
        }

        with self.metrics.timer_context("document_processing"):
            try:
                result_context = self.agent_manager.run(context)
            except Exception as e:
                self.logger.exception("Pipeline failed: %s", e)
                result_context = context
                result_context["error"] = str(e)

        elapsed = time.time() - start

        # ========== 3. Trích xuất kết quả ==========
        raw_text = result_context.get("raw_text", "")
        fields = result_context.get("fields", {})
        confidence = result_context.get("confidence", 0.0)
        reasoning = result_context.get("reasoning", "")
        needs_review = result_context.get("needs_review", True)
        source = "hybrid" if result_context.get("llm_used", False) else "ocr"
        ocr_engine = result_context.get("ocr_engine_used", "")
        llm_used = result_context.get("llm_used", False)
        error = result_context.get("error")

        # ========== 4. Tạo ProcessingContext ==========
        ctx = ProcessingContext(
            document_id=document_id,
            filename=filename,
            image=result_context.get("primary_image"),
            raw_text=raw_text,
            fields=fields,
            confidence=confidence,
            reasoning=reasoning,
            needs_review=needs_review,
            source=source,
            processing_time=elapsed,
            ocr_engine_used=ocr_engine,
            llm_used=llm_used,
            error=error,
        )

        # ========== 5. Lưu cache ==========
        if self._enable_cache and not skip_cache:
            cache_data = ctx.to_dict()
            cache_data.pop("image", None)  # không lưu image vào cache
            self.cache.set(cache_key, cache_data, ttl=settings.CACHE_TTL)

        # ========== 6. Lưu database ==========
        if self._enable_db and self._db_session:
            try:
                doc = Document(
                    id=document_id,
                    user_id=user_id,
                    filename=filename,
                    status="completed" if not error else "failed",
                    confidence=confidence,
                    needs_review=needs_review,
                    raw_text=raw_text,
                    fields=fields,
                    reasoning=reasoning,
                    error=error,
                    ocr_engine_used=ocr_engine,
                    llm_used=llm_used,
                    source=source,
                    processing_time=elapsed,
                )
                self._db_session.add(doc)
                self._db_session.commit()
                self.metrics.counter_inc("documents_saved_to_db")
                self.logger.debug("Document %s saved to database", document_id)
            except Exception as e:
                self.logger.error("Failed to save document to database: %s", e)
                self._db_session.rollback()

        # ========== 7. Log metrics ==========
        self.metrics.counter_inc("documents_processed_total")
        self.metrics.gauge_set("document_confidence", confidence, {"doc_id": document_id})
        self.metrics.histogram_observe("document_processing_time_seconds", elapsed)

        self.logger.info("Document %s processed in %.3f s", document_id, elapsed)
        return ctx

    def _get_cache_key(self, image_bytes: bytes, filename: str, user_id: str) -> str:
        """Tạo cache key duy nhất."""
        content_hash = hashlib.md5(image_bytes).hexdigest()
        return f"doc:{content_hash}:{filename}:{user_id}"

    # -------------------------------------------------------------------------
    # Phương thức truy vấn từ database
    # -------------------------------------------------------------------------

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin tài liệu từ database."""
        if not self._enable_db or not self._document_repo:
            return None
        try:
            doc = self._document_repo.get(document_id)
            if doc:
                return {
                    "id": doc.id,
                    "filename": doc.filename,
                    "status": doc.status,
                    "confidence": doc.confidence,
                    "needs_review": doc.needs_review,
                    "fields": doc.fields,
                    "raw_text": doc.raw_text[:500] if doc.raw_text else None,
                    "processing_time": doc.processing_time,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                }
        except Exception as e:
            self.logger.error("Failed to get document: %s", e)
        return None

    def get_user_documents(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lấy danh sách tài liệu của user."""
        if not self._enable_db or not self._document_repo:
            return []
        try:
            docs = self._document_repo.list_by_user(user_id, limit=limit)
            return [
                {
                    "id": doc.id,
                    "filename": doc.filename,
                    "status": doc.status,
                    "confidence": doc.confidence,
                    "needs_review": doc.needs_review,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                }
                for doc in docs
            ]
        except Exception as e:
            self.logger.error("Failed to get user documents: %s", e)
            return []

    # -------------------------------------------------------------------------
    # Phương thức khác
    # -------------------------------------------------------------------------

    def learn_from_correction(
        self,
        document_id: str,
        corrected_fields: Dict[str, Any],
        user_id: str,
    ) -> None:
        self.logger.info("Learning from correction for %s", document_id)
        self.memory.update(
            document_id,
            {"corrected_fields": corrected_fields, "user": user_id}
        )
        if self.learner:
            try:
                self.learner.learn(document_id, corrected_fields, user_id)
            except Exception as e:
                self.logger.warning("Learner failed: %s", e)

        # Lưu correction vào database nếu có
        if self._enable_db and self._db_session:
            try:
                from database.models import Correction
                # Lấy document hiện tại
                doc = self._document_repo.get(document_id)
                if doc:
                    correction = Correction(
                        document_id=document_id,
                        user_id=user_id,
                        original_fields=doc.fields or {},
                        corrected_fields=corrected_fields,
                    )
                    self._db_session.add(correction)
                    self._db_session.commit()
            except Exception as e:
                self.logger.error("Failed to save correction: %s", e)
                self._db_session.rollback()

    def ask(self, question: str, context: Optional[Dict[str, Any]] = None) -> Any:
        return self.chat.answer(question, context)

    def health_check(self) -> Dict[str, Any]:
        """Kiểm tra sức khoẻ toàn bộ hệ thống."""
        llm_available = False
        if self._llm_loaded and self._llm is not None:
            try:
                llm_available = self._llm.is_available()
            except Exception:
                pass

        db_status = "ok" if self._enable_db and self._db_session else "disabled"
        cache_status = "ok" if self._enable_cache and self.cache else "disabled"

        return {
            "gateway_mode": "multi-agent",
            "status": "healthy",
            "agent_manager": self.agent_manager.get_summary(),
            "agents_status": self.agent_manager.get_status(),
            "database": {
                "enabled": self._enable_db,
                "status": db_status,
            },
            "cache": {
                "enabled": self._enable_cache,
                "status": cache_status,
                "stats": self.cache.get_stats() if self.cache else None,
            },
            "llm": {
                "enabled": self._enable_llm,
                "loaded": self._llm_loaded,
                "available": llm_available,
                "error": self._llm_load_error,
            },
            "metrics": self.metrics.get_all_metrics(),
        }

    def get_stats(self) -> Dict[str, Any]:
        """Lấy thống kê tổng quan."""
        stats = {
            "total_processed": self.metrics.get_counter("documents_processed_total"),
            "cache_hits": self.metrics.get_counter("cache_hit"),
            "cache_misses": self.metrics.get_counter("cache_miss"),
        }
        if self.cache:
            stats["cache_stats"] = self.cache.get_stats()
        return stats

    def close(self):
        self.logger.info("Closing Gateway...")
        try:
            if hasattr(self.memory, "close"):
                self.memory.close()
        except Exception:
            pass
        try:
            if self.llm:
                self.llm.unload()
        except Exception:
            pass
        try:
            if self._db_session:
                self._db_session.close()
        except Exception:
            pass
        self.agent_manager.reset_all()
        self.logger.info("Gateway closed.")


# -----------------------------------------------------------------------------
# Global instance
# -----------------------------------------------------------------------------
_gateway: Optional[Gateway] = None

def get_gateway() -> Gateway:
    global _gateway
    if _gateway is None:
        _gateway = Gateway()
    return _gateway