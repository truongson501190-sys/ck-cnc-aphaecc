"""
Batch Processor
===============

Xử lý nhiều tài liệu cùng lúc với hiệu năng cao.
"""

from __future__ import annotations

import logging
import time
from typing import List, Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)


class BatchProcessor:
    """
    Xử lý batch các tài liệu với parallel processing.
    """

    def __init__(self, gateway, max_workers: int = 4, batch_size: int = 10):
        self.gateway = gateway
        self.max_workers = max_workers
        self.batch_size = batch_size

    def process_documents(
        self,
        documents: List[Dict[str, Any]],
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Xử lý batch các tài liệu.

        documents: list của dict chứa image_bytes, filename, user_id
        """
        results = []
        total = len(documents)
        processed = 0

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {}
            for i, doc in enumerate(documents):
                future = executor.submit(
                    self._process_single,
                    doc.get("image_bytes"),
                    doc.get("filename", f"doc_{i}"),
                    doc.get("user_id", "batch"),
                )
                futures[future] = i

            for future in as_completed(futures):
                idx = futures[future]
                try:
                    result = future.result(timeout=300)  # 5 phút timeout
                except Exception as e:
                    result = {"error": str(e), "index": idx}
                results.append((idx, result))
                processed += 1
                if progress_callback:
                    progress_callback(processed, total)

        # Sắp xếp theo thứ tự ban đầu
        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]

    def _process_single(self, image_bytes: bytes, filename: str, user_id: str) -> Dict:
        """Xử lý một tài liệu đơn lẻ."""
        try:
            context = self.gateway.process_document(image_bytes, filename, user_id)
            return {
                "success": True,
                "document_id": context.document_id,
                "confidence": context.confidence,
                "needs_review": context.needs_review,
                "fields": context.fields,
                "processing_time": context.processing_time,
            }
        except Exception as e:
            logger.exception("Batch processing failed for %s", filename)
            return {
                "success": False,
                "filename": filename,
                "error": str(e),
            }

    def process_parallel(self, documents: List[Dict], batch_size: Optional[int] = None) -> List[Dict]:
        """Xử lý batch với chia nhỏ theo batch_size."""
        if batch_size is None:
            batch_size = self.batch_size

        all_results = []
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i+batch_size]
            logger.info("Processing batch %d-%d", i, min(i+batch_size, len(documents)))
            results = self.process_documents(batch)
            all_results.extend(results)
        return all_results