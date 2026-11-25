# backend_ai/engines/layout/analyzer.py

import re
from typing import Dict, Any, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class LayoutAnalyzer:
    """
    Layout Engine - Phân tích bố cục tài liệu
    """
    
    def __init__(self):
        self.patterns = {
            "header": r'^.{0,50}?(BÁO CÁO|PHIẾU|BIÊN BẢN|HÓA ĐƠN)',
            "footer": r'(Người kiểm tra|Ký tên|Chữ ký|Kết thúc)',
            "table": r'(\|.*\|)|(\s{2,}\d+\s{2,})',
            "code_block": r'[A-Z]{2,}[\d\-_]+',
        }
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Phân tích bố cục văn bản
        """
        lines = text.split('\n')
        
        result = {
            "total_lines": len(lines),
            "has_header": False,
            "has_footer": False,
            "has_table": False,
            "code_blocks": [],
            "sections": []
        }
        
        # Phân tích từng dòng
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Header
            if i < 5 and re.search(self.patterns["header"], line, re.IGNORECASE):
                result["has_header"] = True
                result["sections"].append({"type": "header", "content": line})
                continue
            
            # Footer
            if i > len(lines) - 5 and re.search(self.patterns["footer"], line, re.IGNORECASE):
                result["has_footer"] = True
                result["sections"].append({"type": "footer", "content": line})
                continue
            
            # Table
            if re.search(self.patterns["table"], line):
                result["has_table"] = True
                result["sections"].append({"type": "table", "content": line})
                continue
            
            # Code block
            code_matches = re.findall(self.patterns["code_block"], line)
            if code_matches:
                result["code_blocks"].extend(code_matches)
                result["sections"].append({"type": "code", "content": line})
                continue
            
            # Normal text
            result["sections"].append({"type": "text", "content": line})
        
        return result