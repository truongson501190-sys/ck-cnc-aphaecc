from typing import List, Optional
from supabase import create_client, Client

from ..models import Machine, Material, Project, Tool, Employee
from ..exceptions import ConnectionError
from .base_adapter import BaseAdapter


class SupabaseAdapter(BaseAdapter):
    """Adapter kết nối đến Supabase (Sprint 1)"""
    
    def __init__(self, url: str, key: str):
        if not url or not key:
            raise ConnectionError("Supabase URL hoặc Key không được để trống")
        
        try:
            self.client: Client = create_client(url, key)
        except Exception as e:
            raise ConnectionError(f"Không thể kết nối đến Supabase: {e}")
    
    # ============ MACHINES ============
    def fetch_machines(self) -> List[Machine]:
        response = self.client.table("machines").select("*").execute()
        return [
            Machine(
                code=row.get("code", ""),
                name=row.get("name", ""),
                type=row.get("type", "CNC"),
                workshop=row.get("workshop", ""),
                status=row.get("status", "active")
            )
            for row in response.data
        ]
    
    def fetch_machine_by_code(self, code: str) -> Optional[Machine]:
        response = self.client.table("machines").select("*").eq("code", code).execute()
        if not response.data:
            return None
        row = response.data[0]
        return Machine(
            code=row.get("code", ""),
            name=row.get("name", ""),
            type=row.get("type", "CNC"),
            workshop=row.get("workshop", ""),
            status=row.get("status", "active")
        )
    
    # ============ MATERIALS ============
    def fetch_materials(self) -> List[Material]:
        response = self.client.table("materials").select("*").execute()
        return [
            Material(
                code=row.get("code", ""),
                name=row.get("name", ""),
                category=row.get("category", ""),
                unit=row.get("unit", ""),
                status=row.get("status", "active")
            )
            for row in response.data
        ]
    
    def fetch_material_by_code(self, code: str) -> Optional[Material]:
        response = self.client.table("materials").select("*").eq("code", code).execute()
        if not response.data:
            return None
        row = response.data[0]
        return Material(
            code=row.get("code", ""),
            name=row.get("name", ""),
            category=row.get("category", ""),
            unit=row.get("unit", ""),
            status=row.get("status", "active")
        )
    
    # ============ PROJECTS ============
    def fetch_projects(self, status: Optional[str] = "active") -> List[Project]:
        query = self.client.table("projects").select("*")
        if status:
            query = query.eq("status", status)
        response = query.execute()
        return [
            Project(
                code=row.get("code", ""),
                name=row.get("name", ""),
                customer=row.get("customer", ""),
                status=row.get("status", "active"),
                start_date=row.get("start_date", ""),
                priority=row.get("priority", "medium")
            )
            for row in response.data
        ]
    
    def fetch_project_by_code(self, code: str) -> Optional[Project]:
        response = self.client.table("projects").select("*").eq("code", code).execute()
        if not response.data:
            return None
        row = response.data[0]
        return Project(
            code=row.get("code", ""),
            name=row.get("name", ""),
            customer=row.get("customer", ""),
            status=row.get("status", "active"),
            start_date=row.get("start_date", ""),
            priority=row.get("priority", "medium")
        )
    
    # ============ TOOLS ============
    def fetch_tools(self) -> List[Tool]:
        response = self.client.table("tools").select("*").execute()
        return [
            Tool(
                code=row.get("code", ""),
                name=row.get("name", ""),
                diameter=float(row.get("diameter", 0)),
                type=row.get("type", ""),
                material=row.get("material", ""),
                status=row.get("status", "active")
            )
            for row in response.data
        ]
    
    def fetch_tool_by_code(self, code: str) -> Optional[Tool]:
        response = self.client.table("tools").select("*").eq("code", code).execute()
        if not response.data:
            return None
        row = response.data[0]
        return Tool(
            code=row.get("code", ""),
            name=row.get("name", ""),
            diameter=float(row.get("diameter", 0)),
            type=row.get("type", ""),
            material=row.get("material", ""),
            status=row.get("status", "active")
        )
    
    # ============ EMPLOYEES ============
    def fetch_employees(self) -> List[Employee]:
        response = self.client.table("employees").select("*").execute()
        return [
            Employee(
                code=row.get("code", ""),
                name=row.get("name", ""),
                department=row.get("department", ""),
                position=row.get("position", ""),
                status=row.get("status", "active")
            )
            for row in response.data
        ]
    
    def fetch_employee_by_code(self, code: str) -> Optional[Employee]:
        response = self.client.table("employees").select("*").eq("code", code).execute()
        if not response.data:
            return None
        row = response.data[0]
        return Employee(
            code=row.get("code", ""),
            name=row.get("name", ""),
            department=row.get("department", ""),
            position=row.get("position", ""),
            status=row.get("status", "active")
        )