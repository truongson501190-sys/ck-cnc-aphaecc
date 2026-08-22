class ERPConnectorError(Exception):
    """Lỗi chung của ERP Connector"""
    pass

class AdapterNotFoundError(ERPConnectorError):
    """Không tìm thấy Adapter"""
    pass

class DataNotFoundError(ERPConnectorError):
    """Dữ liệu không tồn tại trong ERP"""
    def __init__(self, entity_type: str, identifier: str):
        self.entity_type = entity_type
        self.identifier = identifier
        super().__init__(f"Không tìm thấy {entity_type} với mã '{identifier}'")

class ConnectionError(ERPConnectorError):
    """Lỗi kết nối đến ERP"""
    pass