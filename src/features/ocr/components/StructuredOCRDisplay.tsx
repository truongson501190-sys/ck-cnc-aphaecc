// src/features/ocr/components/StructuredOCRDisplay.tsx

import React, { useState } from 'react';
import { ParsedReportData } from '../types/documentTypes';

interface Props {
  data: ParsedReportData;
  onCorrection: (corrections: Record<string, any>) => void;
  onConfirm: (data: Record<string, any>) => void;
  isLearning?: boolean;
  isImporting?: boolean; // 👈 THÊM DÒNG NÀY
}

export const StructuredOCRDisplay: React.FC<Props> = ({
  data,
  onCorrection,
  onConfirm,
  isLearning = false,
  isImporting = false,
}) => {
  const [editedData, setEditedData] = useState(data.fields);

  // Hiển thị thanh Confidence
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.98) return 'bg-green-500';
    if (conf >= 0.90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.98) return '✅ Tự động nhập ERP';
    if (conf >= 0.90) return '⚠️ Đề nghị xác nhận';
    return '❌ Cần kiểm tra thủ công';
  };

  const getActionColor = (action?: string) => {
    if (action === 'AUTO_IMPORT') return 'text-green-600';
    if (action === 'NEED_CONFIRMATION') return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitCorrection = () => {
    onCorrection(editedData);
  };

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  // Danh sách field cho Báo cáo gia công
  const fieldLabels: Record<string, string> = {
    ngay: '📅 Ngày',
    ca: '🕐 Ca',
    may: '⚙️ Máy',
    du_an: '📋 Dự án',
    so_luong: '🔢 Số lượng',
    vat_lieu: '🧱 Vật liệu',
    so_ban_ve: '📐 Số bản vẽ',
    chi_tiet_so: '🔧 Chi tiết số',
    ten_chi_tiet: '📝 Tên chi tiết',
    ng_cong_so: '⚡ Ng.Công số',
    tong_ng_cong: '📊 Tổng Ng.Công',
    thoi_gian_gc_cai: '⏱️ T.gian GC/Cái',
    tong_thoi_gian: '⏱️ Tổng T.gian',
    nguoi_van_hanh: '👨‍🔧 Người vận hành',
    nguoi_kiem_tra: '👨‍💼 Người kiểm tra',
  };

  const fields = Object.keys(fieldLabels);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">📄 Kết quả trích xuất</h2>
        <span className="text-sm text-gray-500">
          Nguồn: {data.source || 'unknown'}
        </span>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Độ tin cậy:
          </span>
          <span className="text-sm font-bold">
            {(data.confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
          <div
            className={`h-2 rounded-full transition-all ${getConfidenceColor(data.confidence)}`}
            style={{ width: `${data.confidence * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm">{getConfidenceLabel(data.confidence)}</span>
          {data.action && (
            <span className={`text-sm font-medium ${getActionColor(data.action)}`}>
              {data.action === 'AUTO_IMPORT' && '🟢 Tự động nhập'}
              {data.action === 'NEED_CONFIRMATION' && '🟡 Chờ xác nhận'}
              {data.action === 'MANUAL_CHECK' && '🔴 Cần kiểm tra'}
            </span>
          )}
        </div>
      </div>

      {/* Explainability */}
      {(data.reasoning?.length || data.reasoning_steps?.length || data.confidence_breakdown || data.validation_messages?.length) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <details>
            <summary className="text-sm font-medium text-blue-700 cursor-pointer">
              🔍 Explainability
            </summary>
            <div className="mt-2 space-y-2 text-xs text-gray-600">
              {data.reasoning_steps && data.reasoning_steps.length > 0 && (
                <div>
                  <div className="font-semibold text-gray-700">Reasoning steps</div>
                  <ul className="mt-1 space-y-1">
                    {data.reasoning_steps.map((step, idx) => (
                      <li key={idx}>• {step}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.confidence_breakdown && Object.keys(data.confidence_breakdown).length > 0 && (
                <div>
                  <div className="font-semibold text-gray-700">Confidence breakdown</div>
                  <ul className="mt-1 space-y-1">
                    {Object.entries(data.confidence_breakdown).map(([key, value]) => (
                      <li key={key}>• {key}: {(value * 100).toFixed(1)}%</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.validation_messages && data.validation_messages.length > 0 && (
                <div>
                  <div className="font-semibold text-gray-700">Validation messages</div>
                  <ul className="mt-1 space-y-1">
                    {data.validation_messages.map((message, idx) => (
                      <li key={idx}>• {message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Status message */}
      {data.status_message && (
        <div className="mb-4 p-2 bg-gray-50 rounded-md text-sm text-gray-600">
          📌 {data.status_message}
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-2 gap-4">
        {fields.map((key) => {
          const value = editedData[key] ?? '';
          const label = fieldLabels[key] || key;

          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <input
                type="text"
                value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = Number(val);
                  handleFieldChange(key, Number.isNaN(num) ? val : num);
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        {(isLearning || isImporting) && (
          <span className="text-sm text-blue-500 animate-pulse">
            {isLearning && '📚 AI đang học...'}
            {isImporting && '📦 Đang nhập ERP...'}
          </span>
        )}
        <button
          onClick={handleSubmitCorrection}
          disabled={isLearning || isImporting}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📚 Gửi để AI học
        </button>
        <button
          onClick={handleConfirm}
          disabled={data.confidence < 0.98 || isLearning || isImporting}
          className={`px-4 py-2 rounded-md text-white ${
            data.confidence >= 0.98 && !isLearning && !isImporting
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          ✅ Xác nhận nhập ERP
        </button>
      </div>
    </div>
  );
};