// src/features/ocr/components/AITrainingPanel.tsx
import React, { useState, useEffect } from 'react';
import { ocrTrainer } from '@/features/ocr/services/ocrTrainer';
import { ParsedReportData } from '@/features/ocr/services/ocrService';
import { toast } from 'sonner';

interface AITrainingPanelProps {
  originalText: string;
  parsedData: ParsedReportData;
  onDataCorrected?: (data: ParsedReportData) => void;
  onClose?: () => void;
}

const AITrainingPanel: React.FC<AITrainingPanelProps> = ({
  originalText,
  parsedData,
  onDataCorrected,
  onClose
}) => {
  const [correctedFields, setCorrectedFields] = useState<Record<string, any>>(parsedData.fields || {});
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState(ocrTrainer.getStats());

  useEffect(() => {
    ocrTrainer.loadSamples();
    setStats(ocrTrainer.getStats());
  }, []);

  const handleFieldChange = (field: string, value: any) => {
    setCorrectedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCorrection = () => {
    ocrTrainer.learnFromCorrection(originalText, correctedFields);
    const newData = { ...parsedData, fields: correctedFields };
    if (onDataCorrected) onDataCorrected(newData);
    setIsEditing(false);
    setStats(ocrTrainer.getStats());
    toast.success('🧠 AI đã học từ dữ liệu bạn sửa!');
  };

  const commonFields = ['date', 'shift', 'machine_code', 'worker_code', 'worker_name', 
                        'product_code', 'product_name', 'batch_number', 'quantity', 
                        'unit', 'result', 'notes', 'material', 'supplier', 'customer'];

  return (
    <div className="ai-training-panel bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">🧠</span> Học AI{' '}
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {stats.totalSamples} mẫu đã học
          </span>
        </h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isEditing ? 'Đóng' : 'Sửa dữ liệu'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Mẫu học</p>
          <p className="text-xl font-bold text-blue-700">{stats.totalSamples}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Patterns</p>
          <p className="text-xl font-bold text-green-700">{stats.patternsCount}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">Fields đã học</p>
          <p className="text-xl font-bold text-purple-700">{stats.fieldsLearned.length}</p>
        </div>
      </div>

      {isEditing && (
        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700">Sửa dữ liệu để AI học</h4>
          <div className="grid grid-cols-2 gap-3">
            {commonFields.map((field) => (
              <div key={field}>
                <label htmlFor={`ai-${field}`} className="text-xs text-gray-600">{field}</label>
                <input
                  id={`ai-${field}`}
                  type={field === 'quantity' ? 'number' : 'text'}
                  value={correctedFields[field] ?? ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveCorrection}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              🧠 Dạy AI học
            </button>
            <button
              onClick={() => {
                setCorrectedFields(parsedData.fields || {});
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <p>📊 AI sẽ học từ dữ liệu bạn sửa để cải thiện độ chính xác</p>
        <p className="mt-1">💡 Càng nhiều mẫu, AI càng thông minh!</p>
      </div>
    </div>
  );
};

export default AITrainingPanel;