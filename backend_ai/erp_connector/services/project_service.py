from typing import List, Optional
from ..adapters.base_adapter import BaseAdapter
from ..models import Project
from ..exceptions import DataNotFoundError


class ProjectService:
    def __init__(self, adapter: BaseAdapter):
        self.adapter = adapter
        self._cache: dict[str, Project] = {}
    
    def get_all(self, status: Optional[str] = "active") -> List[Project]:
        return self.adapter.fetch_projects(status=status)
    
    def get_by_code(self, code: str) -> Optional[Project]:
        if code in self._cache:
            return self._cache[code]
        project = self.adapter.fetch_project_by_code(code)
        if project:
            self._cache[code] = project
        return project
    
    def get_by_code_or_raise(self, code: str) -> Project:
        project = self.get_by_code(code)
        if not project:
            raise DataNotFoundError("Dự án", code)
        return project
    
    def search(self, keyword: str) -> List[Project]:
        all_projects = self.get_all()
        keyword_lower = keyword.lower()
        return [
            p for p in all_projects
            if keyword_lower in p.code.lower()
            or keyword_lower in p.name.lower()
            or keyword_lower in p.customer.lower()
        ]
    
    def exists(self, code: str) -> bool:
        return self.get_by_code(code) is not None
    
    def clear_cache(self):
        self._cache.clear()