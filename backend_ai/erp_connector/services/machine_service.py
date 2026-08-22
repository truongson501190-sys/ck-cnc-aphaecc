from typing import List, Optional
from ..adapters.base_adapter import BaseAdapter
from ..models import Machine
from ..exceptions import DataNotFoundError


class MachineService:
    def __init__(self, adapter: BaseAdapter):
        self.adapter = adapter
        self._cache: dict[str, Machine] = {}
    
    def get_all(self) -> List[Machine]:
        return self.adapter.fetch_machines()
    
    def get_by_code(self, code: str) -> Optional[Machine]:
        if code in self._cache:
            return self._cache[code]
        machine = self.adapter.fetch_machine_by_code(code)
        if machine:
            self._cache[code] = machine
        return machine
    
    def get_by_code_or_raise(self, code: str) -> Machine:
        machine = self.get_by_code(code)
        if not machine:
            raise DataNotFoundError("Máy", code)
        return machine
    
    def search(self, keyword: str) -> List[Machine]:
        all_machines = self.get_all()
        keyword_lower = keyword.lower()
        return [
            m for m in all_machines
            if keyword_lower in m.code.lower()
            or keyword_lower in m.name.lower()
        ]
    
    def exists(self, code: str) -> bool:
        return self.get_by_code(code) is not None
    
    def clear_cache(self):
        self._cache.clear()