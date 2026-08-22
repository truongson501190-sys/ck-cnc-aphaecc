from typing import List, Optional
from ..adapters.base_adapter import BaseAdapter
from ..models import Tool
from ..exceptions import DataNotFoundError


class ToolService:
    def __init__(self, adapter: BaseAdapter):
        self.adapter = adapter
        self._cache: dict[str, Tool] = {}
    
    def get_all(self) -> List[Tool]:
        return self.adapter.fetch_tools()
    
    def get_by_code(self, code: str) -> Optional[Tool]:
        if code in self._cache:
            return self._cache[code]
        tool = self.adapter.fetch_tool_by_code(code)
        if tool:
            self._cache[code] = tool
        return tool
    
    def get_by_code_or_raise(self, code: str) -> Tool:
        tool = self.get_by_code(code)
        if not tool:
            raise DataNotFoundError("Dụng cụ", code)
        return tool
    
    def search(self, keyword: str) -> List[Tool]:
        all_tools = self.get_all()
        keyword_lower = keyword.lower()
        return [
            t for t in all_tools
            if keyword_lower in t.code.lower()
            or keyword_lower in t.name.lower()
            or keyword_lower in t.type.lower()
        ]
    
    def exists(self, code: str) -> bool:
        return self.get_by_code(code) is not None
    
    def clear_cache(self):
        self._cache.clear()