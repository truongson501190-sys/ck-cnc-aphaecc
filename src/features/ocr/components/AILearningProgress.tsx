// src/features/ocr/components/AILearningProgress.tsx
import React, { useState, useEffect } from 'react';
import { ocrTrainer } from '../services/ocrTrainer';

interface AILearningProgressProps {
  onComplete?: () => void;
  className?: string;
}

export const AILearningProgress: React.FC<AILearningProgressProps> = ({ 
  onComplete, 
  className = '' 
}) => {
  const [stats, setStats] = useState(ocrTrainer.getStats());
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    const totalSamples = stats.totalSamples;
    let estimatedAccuracy = 0;
    
    if (totalSamples === 0) {
      estimatedAccuracy = 0;
    } else if (totalSamples < 10) {
      estimatedAccuracy = 30 + totalSamples * 2;
    } else if (totalSamples < 30) {
      estimatedAccuracy = 50 + (totalSamples - 10) * 1.2;
    } else if (totalSamples < 50) {
      estimatedAccuracy = 74 + (totalSamples - 30) * 0.8;
    } else {
      estimatedAccuracy = 95;
    }
    
    setAccuracy(Math.round(Math.min(estimatedAccuracy, 95)));
    
    const interval = setInterval(() => {
      setStats(ocrTrainer.getStats());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [stats.totalSamples]);

  const progress = Math.min((stats.totalSamples / 50) * 100, 100);

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          🧠 AI Learning
          {stats.totalSamples >= 50 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ✅ Hoàn thiện
            </span>
          )}
        </h3>
        <button
          onClick={() => setStats(ocrTrainer.getStats())}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          🔄 Refresh
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Mẫu học: {stats.totalSamples}/50</span>
          <span className="text-green-600 dark:text-green-400">Độ chính xác: {accuracy}%</span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <span className="font-bold text-blue-600 block">{stats.totalSamples}</span>
            <span className="text-gray-500">Tổng mẫu</span>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <span className="font-bold text-green-600 block">{stats.autoLearned}</span>
            <span className="text-gray-500">Tự học</span>
          </div>
          <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
            <span className="font-bold text-purple-600 block">{stats.fieldsLearned.length}</span>
            <span className="text-gray-500">Fields</span>
          </div>
        </div>
        
        {stats.fieldsLearned.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {stats.fieldsLearned.map(field => (
              <span 
                key={field} 
                className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
              >
                {field}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {stats.totalSamples < 10 && (
            <span>💡 Cần thêm {10 - stats.totalSamples} mẫu để bắt đầu nhận diện tốt</span>
          )}
          {stats.totalSamples >= 10 && stats.totalSamples < 30 && (
            <span>📈 Đang tiến bộ! Cần {30 - stats.totalSamples} mẫu nữa</span>
          )}
          {stats.totalSamples >= 30 && stats.totalSamples < 50 && (
            <span>🚀 Gần hoàn thiện! Cần {50 - stats.totalSamples} mẫu nữa</span>
          )}
          {stats.totalSamples >= 50 && (
            <span className="text-green-600">✅ AI đã sẵn sàng! Đọc file sẽ tự động học</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILearningProgress;