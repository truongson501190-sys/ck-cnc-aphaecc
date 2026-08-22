from dataclasses import dataclass
from typing import Optional

@dataclass
class Machine:
    """Model cho Máy CNC"""
    code: str
    name: str
    type: str = "CNC"
    workshop: str = ""
    status: str = "active"
    
    def __str__(self):
        return f"{self.code} - {self.name}"

@dataclass
class Material:
    """Model cho Vật liệu"""
    code: str
    name: str
    category: str = ""
    unit: str = ""
    status: str = "active"
    
    def __str__(self):
        return f"{self.code} - {self.name} ({self.unit})"

@dataclass
class Project:
    """Model cho Dự án"""
    code: str
    name: str
    customer: str = ""
    status: str = "active"
    start_date: str = ""
    priority: str = "medium"
    
    def __str__(self):
        return f"{self.code} - {self.name} ({self.customer})"

@dataclass
class Tool:
    """Model cho Dụng cụ cắt"""
    code: str
    name: str
    diameter: float = 0.0
    type: str = ""
    material: str = ""
    status: str = "active"
    
    def __str__(self):
        return f"{self.code} - {self.name} (Ø{self.diameter}mm)"

@dataclass
class Employee:
    """Model cho Nhân viên"""
    code: str
    name: str
    department: str = ""
    position: str = ""
    status: str = "active"
    
    def __str__(self):
        return f"{self.code} - {self.name} ({self.department})"