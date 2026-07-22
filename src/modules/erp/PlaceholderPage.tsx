// src/modules/erp/PlaceholderPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{description ?? 'Trang tạm thời chưa phát triển đầy đủ. Tiếp tục triển khai module ERP/WMS tại đây.'}</p>
              <Badge variant="outline" className="text-xs">
                Route: {location.pathname}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// THÊM DEFAULT EXPORT
export default PlaceholderPage;