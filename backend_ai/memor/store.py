class MemoryStore:
    def __init__(self, db_repo=None):
        self._db_repo = db_repo
        self._cache = {}  # fallback memory

    def store(self, doc_id: str, data: Dict[str, Any]) -> bool:
        # Nếu có db_repo, ghi vào database
        if self._db_repo:
            try:
                # Cập nhật document với data
                asyncio.create_task(self._db_repo.update(doc_id, **data))
                return True
            except Exception:
                pass
        # Fallback memory
        self._cache[doc_id] = data
        return True

    def retrieve(self, doc_id: str) -> Optional[Dict]:
        # Ưu tiên database
        if self._db_repo:
            try:
                loop = asyncio.get_event_loop()
                doc = loop.run_until_complete(self._db_repo.get(doc_id))
                if doc:
                    return {
                        "text": doc.raw_text,
                        "fields": doc.fields,
                        "confidence": doc.confidence,
                        "needs_review": doc.needs_review,
                        "reasoning": doc.reasoning,
                        "status": doc.status,
                        "timestamp": doc.created_at.isoformat() if doc.created_at else None,
                    }
            except Exception:
                pass
        # Fallback memory
        return self._cache.get(doc_id)