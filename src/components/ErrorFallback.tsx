// src/components/ErrorFallback.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center">
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Có lỗi xảy ra
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
          {error.message || 'Đã có lỗi không mong muốn xảy ra. Vui lòng thử lại.'}
        </p>
        
        {import.meta.env.DEV && (
          <details className="mb-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Chi tiết lỗi (Development)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-auto max-h-40 text-gray-700 dark:text-gray-300">
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button
            onClick={resetErrorBoundary}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
};