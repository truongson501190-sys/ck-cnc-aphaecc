# backend_ai/engines/learning/learning_engine.py

from database.vector_db import MemoryEngine

class LearningEngine:
    def __init__(self, memory_engine: MemoryEngine):
        self.memory = memory_engine
    
    def learn_from_user(self, field_name: str, wrong_val: str, correct_val: str, context: str):
        """
        Học từ sửa của người dùng
        """
        full_context = f"{context} - Trường '{field_name}': '{wrong_val}' -> '{correct_val}'"
        self.memory.learn_from_user(
            field_name=field_name,
            wrong_val=wrong_val,
            correct_val=correct_val,
            context=full_context
        )