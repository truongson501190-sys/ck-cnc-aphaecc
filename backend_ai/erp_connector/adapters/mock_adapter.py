from typing import List, Optional
from ..models import Machine, Material, Project, Tool, Employee
from .base_adapter import BaseAdapter


class MockAdapter(BaseAdapter):
    """Adapter mô phỏng dữ liệu để test - KHÔNG cần kết nối ERP"""
    
    def __init__(self):
        self._machines = [
            Machine("MC01", "Máy CNC số 01", "CNC", "Xưởng CK-CNC"),
            Machine("MC02", "Máy CNC số 02", "CNC", "Xưởng CK-CNC"),
            Machine("MC03", "Máy CNC số 03", "CNC", "Xưởng CK-CNC"),
            Machine("MC04", "Máy CNC số 04", "CNC", "Xưởng CK-CNC"),
            Machine("MC05", "Máy CNC số 05", "CNC", "Xưởng CK-CNC"),
            Machine("MC06", "Máy CNC số 06", "CNC", "Xưởng CK-CNC"),
            Machine("MC07", "Máy CNC số 07", "CNC", "Xưởng CK-CNC"),
            Machine("MC08", "Máy CNC số 08", "CNC", "Xưởng CK-CNC"),
            Machine("ML01", "Máy tiện số 01", "Tiện", "Xưởng CK-CNC"),
            Machine("ML02", "Máy tiện số 02", "Tiện", "Xưởng CK-CNC"),
        ]
        
        self._materials = [
            Material("AL-6061", "Nhôm A6061", "Kim loại", "Kg"),
            Material("AL-7075", "Nhôm A7075", "Kim loại", "Kg"),
            Material("ST-304", "Thép không gỉ 304", "Kim loại", "Kg"),
            Material("ST-316", "Thép không gỉ 316", "Kim loại", "Kg"),
            Material("ST-C45", "Thép C45", "Kim loại", "Kg"),
        ]
        
        self._projects = [
            Project("AL-001", "Dự án khung nhôm", "Nhà máy A", "active", "2026-01-01", "high"),
            Project("AL-002", "Giá đỡ CNC", "Công ty B", "active", "2026-02-15", "medium"),
            Project("AL-003", "Trục máy tiện", "Nhà máy C", "active", "2026-03-01", "high"),
        ]
        
        self._tools = [
            Tool("D06-PHAY", "Dao phay D6", 6.0, "Phay", "HSS"),
            Tool("D08-PHAY", "Dao phay D8", 8.0, "Phay", "HSS"),
            Tool("D10-PHAY", "Dao phay D10", 10.0, "Phay", "HSS"),
            Tool("D12-PHAY", "Dao phay D12", 12.0, "Phay", "Carbide"),
            Tool("D16-PHAY", "Dao phay D16", 16.0, "Phay", "Carbide"),
            Tool("D06-KHOAN", "Mũi khoan D6", 6.0, "Khoan", "HSS"),
            Tool("D08-KHOAN", "Mũi khoan D8", 8.0, "Khoan", "HSS"),
        ]
        
        self._employees = [
            Employee("NV01", "Nguyễn Văn A", "Sản xuất", "Vận hành CNC"),
            Employee("NV02", "Trần Văn B", "Sản xuất", "Vận hành CNC"),
            Employee("NV03", "Lê Văn C", "QC", "Kiểm tra chất lượng"),
        ]
    
    def fetch_machines(self) -> List[Machine]:
        return self._machines
    
    def fetch_machine_by_code(self, code: str) -> Optional[Machine]:
        for machine in self._machines:
            if machine.code == code:
                return machine
        return None
    
    def fetch_materials(self) -> List[Material]:
        return self._materials
    
    def fetch_material_by_code(self, code: str) -> Optional[Material]:
        for material in self._materials:
            if material.code == code:
                return material
        return None
    
    def fetch_projects(self, status: Optional[str] = "active") -> List[Project]:
        if status:
            return [p for p in self._projects if p.status == status]
        return self._projects
    
    def fetch_project_by_code(self, code: str) -> Optional[Project]:
        for project in self._projects:
            if project.code == code:
                return project
        return None
    
    def fetch_tools(self) -> List[Tool]:
        return self._tools
    
    def fetch_tool_by_code(self, code: str) -> Optional[Tool]:
        for tool in self._tools:
            if tool.code == code:
                return tool
        return None
    
    def fetch_employees(self) -> List[Employee]:
        return self._employees
    
    def fetch_employee_by_code(self, code: str) -> Optional[Employee]:
        for employee in self._employees:
            if employee.code == code:
                return employee
        return None