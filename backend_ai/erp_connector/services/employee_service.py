from typing import List, Optional
from ..adapters.base_adapter import BaseAdapter
from ..models import Employee
from ..exceptions import DataNotFoundError


class EmployeeService:
    def __init__(self, adapter: BaseAdapter):
        self.adapter = adapter
        self._cache: dict[str, Employee] = {}
    
    def get_all(self) -> List[Employee]:
        return self.adapter.fetch_employees()
    
    def get_by_code(self, code: str) -> Optional[Employee]:
        if code in self._cache:
            return self._cache[code]
        employee = self.adapter.fetch_employee_by_code(code)
        if employee:
            self._cache[code] = employee
        return employee
    
    def get_by_code_or_raise(self, code: str) -> Employee:
        employee = self.get_by_code(code)
        if not employee:
            raise DataNotFoundError("Nhân viên", code)
        return employee
    
    def search(self, keyword: str) -> List[Employee]:
        all_employees = self.get_all()
        keyword_lower = keyword.lower()
        return [
            e for e in all_employees
            if keyword_lower in e.code.lower()
            or keyword_lower in e.name.lower()
            or keyword_lower in e.department.lower()
        ]
    
    def exists(self, code: str) -> bool:
        return self.get_by_code(code) is not None
    
    def clear_cache(self):
        self._cache.clear()