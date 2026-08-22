from typing import Optional
from config.settings import settings

from .adapters.base_adapter import BaseAdapter
try:
    from .adapters.supabase_adapter import SupabaseAdapter
except Exception:
    SupabaseAdapter = None
from .adapters.mock_adapter import MockAdapter
from .services import (
    MachineService,
    MaterialService,
    ProjectService,
    ToolService,
    EmployeeService,
)


class ERPConnector:
    """Factory class - Tạo các Service với Adapter phù hợp"""
    
    def __init__(self, adapter_type: str = None, config: dict = None):
        if adapter_type is None:
            adapter_type = settings.erp_adapter
        
        if config is None:
            config = {
                "SUPABASE_URL": settings.supabase_url,
                "SUPABASE_ANON_KEY": settings.supabase_anon_key,
                "POSTGRESQL_URL": settings.postgresql_url,
                "ERP_API_URL": settings.erp_api_url,
                "ERP_API_KEY": settings.erp_api_key,
            }
        
        self.adapter = self._create_adapter(adapter_type, config)
        
        # Khởi tạo các Service
        self.machines = MachineService(self.adapter)
        self.materials = MaterialService(self.adapter)
        self.projects = ProjectService(self.adapter)
        self.tools = ToolService(self.adapter)
        self.employees = EmployeeService(self.adapter)
    
    def _create_adapter(self, adapter_type: str, config: dict) -> BaseAdapter:
        if adapter_type == "supabase":
            if SupabaseAdapter is None:
                raise RuntimeError("Supabase adapter requested but python-supabase package is not installed")
            return SupabaseAdapter(
                url=config.get("SUPABASE_URL", ""),
                key=config.get("SUPABASE_ANON_KEY", "")
            )
        elif adapter_type == "mock":
            return MockAdapter()
        elif adapter_type == "rest":
            # TODO: Implement RESTAdapter
            raise NotImplementedError("RESTAdapter chưa được triển khai")
        elif adapter_type == "postgresql":
            # TODO: Implement PostgreSQLAdapter
            raise NotImplementedError("PostgreSQLAdapter chưa được triển khai")
        else:
            raise ValueError(f"Adapter không hỗ trợ: {adapter_type}")
    
    def refresh_cache(self):
        """Refresh toàn bộ cache"""
        self.machines.clear_cache()
        self.materials.clear_cache()
        self.projects.clear_cache()
        self.tools.clear_cache()
        self.employees.clear_cache()


# Singleton instance
_connector: Optional[ERPConnector] = None

def get_erp_connector() -> ERPConnector:
    """Lấy instance duy nhất của ERPConnector"""
    global _connector
    if _connector is None:
        try:
            _connector = ERPConnector()
        except Exception:
            _connector = ERPConnector(adapter_type="mock", config={})
    return _connector


def reset_erp_connector():
    """Reset connector (dùng khi đổi adapter)"""
    global _connector
    _connector = None