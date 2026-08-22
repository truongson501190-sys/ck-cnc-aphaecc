# backend_ai/database/chromadb/vector_store.py

import json
import hashlib
from typing import Dict, Any, List, Optional
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

from config.settings import settings

class VectorStore:
    """ChromaDB vector store cho embedding và tìm kiếm ngữ nghĩa"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.persist_dir = settings.chroma_path
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        
        # Embedding function
        self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        
        # Collection
        self.collection_name = "erp_ai_docs"
        self._ensure_collection()
        
        logger.info(f"✅ Vector store initialized at {self.persist_dir}")
    
    def _ensure_collection(self):
        """Đảm bảo collection tồn tại"""
        try:
            self.collection = self.client.get_collection(self.collection_name)
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                embedding_function=self.embedding_fn
            )
    
    def add_document(self, doc_id: str, text: str, metadata: Dict[str, Any]) -> bool:
        """
        Thêm document vào vector store
        """
        try:
            self.collection.add(
                documents=[text],
                metadatas=[metadata],
                ids=[doc_id]
            )
            return True
        except Exception as e:
            logger.error(f"❌ Add document error: {e}")
            return False
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Tìm kiếm document tương tự
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=limit
            )
            
            items = []
            if results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    items.append({
                        "id": results['ids'][0][i],
                        "text": doc,
                        "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                        "distance": results['distances'][0][i] if results['distances'] else None
                    })
            
            return items
            
        except Exception as e:
            logger.error(f"❌ Search error: {e}")
            return []
    
    def delete_document(self, doc_id: str) -> bool:
        """Xóa document khỏi vector store"""
        try:
            self.collection.delete(ids=[doc_id])
            return True
        except Exception as e:
            logger.error(f"❌ Delete error: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Thống kê vector store"""
        try:
            count = self.collection.count()
            return {"total_documents": count, "collection": self.collection_name}
        except:
            return {"total_documents": 0, "collection": self.collection_name}

vector_store = VectorStore()