import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Package, Warehouse, HardHat, Zap, Users } from 'lucide-react';
import { CategoryTypeManagement } from './CategoryTypeManagement';
import { WarehouseManagement } from './WarehouseManagement';
import { ProjectManagement } from './ProjectManagement';
import { MachineManagement } from './MachineManagement';
import { OperatorManagement } from './OperatorManagement';

export function CategoryManagementTabs() {
  const [activeTab, setActiveTab] = useState('categories');

  const tabs = [
    {
      id: 'categories',
      label: 'Chủng Loại',
      icon: Package,
      color: 'text-purple-600',
      component: CategoryTypeManagement
    },
    {
      id: 'warehouses',
      label: 'Kho',
      icon: Warehouse,
      color: 'text-orange-600',
      component: WarehouseManagement
    },
    {
      id: 'projects',
      label: 'Dự Án',
      icon: HardHat,
      color: 'text-blue-600',
      component: ProjectManagement
    },
    {
      id: 'machines',
      label: 'Máy Móc',
      icon: Zap,
      color: 'text-green-600',
      component: MachineManagement
    },
    {
      id: 'operators',
      label: 'Người Vận Hành',
      icon: Users,
      color: 'text-red-600',
      component: OperatorManagement
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Quản Lý Danh Mục
        </h1>
        <p className="text-gray-600">
          Quản lý danh mục hàng hóa và thiết bị trong hệ thống CNC-CK
        </p>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Danh Mục Hệ Thống
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full gap-2 mb-6 overflow-x-auto rounded-full bg-slate-100 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-200 flex-shrink-0 whitespace-nowrap text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm bg-white text-slate-700 hover:bg-slate-200"
                  >
                    <Icon className={`w-4 h-4 ${tab.color}`} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {tabs.map((tab) => {
              const Component = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  <Component />
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Card key={tab.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab(tab.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{tab.label}</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <Icon className={`w-8 h-8 ${tab.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}