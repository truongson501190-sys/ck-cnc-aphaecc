// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😱</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Có lỗi xảy ra</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Đã có lỗi không mong muốn xảy ra. Vui lòng thử lại.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset}>Tải lại trang</Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}