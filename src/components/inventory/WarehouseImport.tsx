import {
  Boxes,
  FolderKanban,
  Package,
  Warehouse,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { useNavigate } from 'react-router-dom';

import { ERP_ROUTE } from '@/modules/erp/routes';

export function MasterDataManagement() {
  const navigate = useNavigate();

  const masterDataModules = [
    {
      title: 'Chủng loại',
      description:
        'Quản lý vật tư, hàng hóa, dầu nhớt, dao cụ...',
      icon: Package,
      color:
        'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      route: ERP_ROUTE.masterData.categories,
      total: 0,
    },

    {
      title: 'Kho',
      description:
        'Quản lý kho tổng, kho CNC, kho dầu...',
      icon: Warehouse,
      color:
        'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      route: ERP_ROUTE.masterData.locations,
      total: 0,
    },

    {
      title: 'Máy móc',
      description:
        'Danh mục máy CNC, tiện, phay, EDM...',
      icon: Boxes,
      color:
        'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      route: ERP_ROUTE.masterData.machines,
      total: 0,
    },

    {
      title: 'Dự án',
      description:
        'Quản lý dự án, khách hàng, mã hàng...',
      icon: FolderKanban,
      color:
        'from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700',
      route: ERP_ROUTE.masterData.projects,
      total: 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Quản lý danh mục
          </h2>

          <p className="text-sm text-slate-500">
            Danh mục dữ liệu nền ERP/WMS CNC
          </p>
        </div>

        <Badge className="px-3 py-1 text-sm">
          {masterDataModules.length} danh mục
        </Badge>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {masterDataModules.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <CardHeader className="pb-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center text-white shadow`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <CardTitle className="pt-3 text-lg text-slate-800">
                  {item.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {item.total} dữ liệu
                  </Badge>

                  <Button
                    size="sm"
                    onClick={() => navigate(item.route)}
                    className={`bg-gradient-to-r ${item.color} text-white`}
                  >
                    Truy cập
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}