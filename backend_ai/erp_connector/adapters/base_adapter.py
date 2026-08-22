from abc import ABC, abstractmethod
from typing import List, Optional
from ..models import Machine, Material, Project, Tool, Employee

class BaseAdapter(ABC):
    """Interface cho tất cả Adapter"""
    
    @abstractmethod
    def fetch_machines(self) -> List[Machine]:
        pass
    
    @abstractmethod
    def fetch_machine_by_code(self, code: str) -> Optional[Machine]:
        pass
    
    @abstractmethod
    def fetch_materials(self) -> List[Material]:
        pass
    
    @abstractmethod
    def fetch_material_by_code(self, code: str) -> Optional[Material]:
        pass
    
    @abstractmethod
    def fetch_projects(self, status: Optional[str] = "active") -> List[Project]:
        pass
    
    @abstractmethod
    def fetch_project_by_code(self, code: str) -> Optional[Project]:
        pass
    
    @abstractmethod
    def fetch_tools(self) -> List[Tool]:
        pass
    
    @abstractmethod
    def fetch_tool_by_code(self, code: str) -> Optional[Tool]:
        pass
    
    @abstractmethod
    def fetch_employees(self) -> List[Employee]:
        pass
    
    @abstractmethod
    def fetch_employee_by_code(self, code: str) -> Optional[Employee]:
        pass