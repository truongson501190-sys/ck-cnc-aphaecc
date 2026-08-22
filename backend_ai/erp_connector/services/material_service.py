from typing import List, Optional
from ..adapters.base_adapter import BaseAdapter
from ..models import Material
from ..exceptions import DataNotFoundError


class MaterialService:
    def __init__(self, adapter: BaseAdapter):
        self.adapter = adapter
        self._cache: dict[str, Material] = {}
    
    def get_all(self) -> List[Material]:
        return self.adapter.fetch_materials()
    
    def get_by_code(self, code: str) -> Optional[Material]:
        if code in self._cache:
            return self._cache[code]
        material = self.adapter.fetch_material_by_code(code)
        if material:
            self._cache[code] = material
        return material
    
    def get_by_code_or_raise(self, code: str) -> Material:
        material = self.get_by_code(code)
        if not material:
            raise DataNotFoundError("Vật liệu", code)
        return material
    
    def search(self, keyword: str) -> List[Material]:
        all_materials = self.get_all()
        keyword_lower = keyword.lower()
        return [
            m for m in all_materials
            if keyword_lower in m.code.lower()
            or keyword_lower in m.name.lower()
        ]
    
    def exists(self, code: str) -> bool:
        return self.get_by_code(code) is not None
    
    def clear_cache(self):
        self._cache.clear()