// src/features/ocr/components/OCREngineSelector.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Cpu, Zap } from 'lucide-react';

interface OCREngineSelectorProps {
  value: 'easyocr' | 'tesseract' | 'paddleocr' | 'hybrid';
  onChange: (value: 'easyocr' | 'tesseract' | 'paddleocr' | 'hybrid') => void;
  onProcess: () => void;
  isProcessing: boolean;
}

const engines = {
  easyocr: {
    label: 'EasyOCR',
    icon: '🧠',
    description: 'Deep learning, tốt cho tiếng Việt',
    color: 'blue'
  },
  tesseract: {
    label: 'Tesseract',
    icon: '📖',
    description: 'Open source, hỗ trợ nhiều ngôn ngữ',
    color: 'green'
  },
  paddleocr: {
    label: 'PaddleOCR',
    icon: '🐉',
    description: 'Trung Quốc, tốt cho văn bản dài',
    color: 'red'
  },
  hybrid: {
    label: 'Hybrid',
    icon: '⚡',
    description: 'Kết hợp nhiều engine',
    color: 'purple'
  }
};

export const OCREngineSelector: React.FC<OCREngineSelectorProps> = ({
  value,
  onChange,
  onProcess,
  isProcessing
}) => {
  // Lấy thông tin engine hiện tại
  const currentEngine = engines[value];
  
  // Xác định màu sắc cho badge
  const getBadgeColor = () => {
    switch (value) {
      case 'hybrid': return 'bg-purple-100 text-purple-700';
      case 'easyocr': return 'bg-blue-100 text-blue-700';
      case 'tesseract': return 'bg-green-100 text-green-700';
      case 'paddleocr': return 'bg-red-100 text-red-700';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label htmlFor="ocr-engine-select" className="text-sm font-medium">
          Engine OCR:
        </label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="ocr-engine-select" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(engines).map(([key, engine]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <span>{engine.icon}</span>
                  {engine.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Badge className={getBadgeColor()}>
            {currentEngine.icon} {currentEngine.label}
          </Badge>
          <span className="text-sm text-gray-600">{currentEngine.description}</span>
        </div>
      </div>
      
      <Button 
        onClick={onProcess} 
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Cpu className="w-4 h-4 mr-2 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            {value === 'hybrid' ? 'OCR với Hybrid (Chính xác cao)' : `OCR với ${currentEngine.label}`}
          </>
        )}
      </Button>
    </div>
  );
};

export default OCREngineSelector;