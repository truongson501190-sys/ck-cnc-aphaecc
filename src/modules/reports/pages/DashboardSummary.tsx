import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  summaryStats, 
  dailyFlowChart, 
  machinePerformanceChart, 
  materialConsumptionChart, // Sửa lại đúng tên biến được export từ mock data của chú
  lowStockAlerts, 
  activeJobs 
} from '@/modules/reports/mock/dashboardSummaryData';

const getProgressColor = (value: number) => {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

function DashboardSummary() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const summaryCards = [
    { label: 'Tổng nhập kho', value: summaryStats.totalInbound.toLocaleString('vi-VN'), description: 'Số lượng vào kho hôm qua' },
    { label: 'Tổng xuất kho', value: summaryStats.totalOutbound.toLocaleString('vi-VN'), description: 'Số lượng xuất kho hôm qua' },
    { label: 'Tổng tồn kho', value: summaryStats.totalStock.toLocaleString('vi-VN'), description: 'Tổng giá trị tồn kho' },
    { label: 'Phiếu hôm nay', value: summaryStats.todayTickets.toString(), description: 'Phiếu nhập/xuất/chuyển đã tạo' },
    { label: 'Máy đang hoạt động', value: summaryStats.activeMachines.toString(), description: 'Thiết bị đang quay', badge: 'Hoạt động' },
    { label: 'Công việc đang gia công', value: summaryStats.activeJobs.toString(), description: 'Lệnh sản xuất đang chạy', badge: 'Đang xử lý' },
    { label: 'Tiến độ sản xuất', value: `${summaryStats.productionProgressPercent}%`, description: 'Tiến độ kế hoạch chung', badge: 'Tiến độ' },
    { label: 'Cảnh báo tồn kho thấp', value: summaryStats.lowStockAlerts.toString(), description: 'Mặt hàng dưới ngưỡng', badge: 'Cảnh báo' },
  ];

  const renderProgressBar = (value: number) => (
    <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2.5 overflow-hidden w-full mt-2">
      <div className={`${getProgressColor(value)} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard tổng hợp</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Bảng điều khiển ERP/WMS CNC-CK tổng hợp nhập xuất, tồn kho, hiệu suất sản xuất và quản lý phê duyệt vật tư.
            </p>
          </div>
          <Button variant="secondary" className="h-11" onClick={() => window.location.reload()}>
            Làm mới dữ liệu
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="h-40 animate-pulse">
                  <CardContent className="space-y-4 p-6">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <Card className="h-[28rem]">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <div className="grid gap-6">
                <Card className="h-64">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
                <Card className="h-64">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <Card key={card.label} className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                      {card.badge ? (
                        <Badge variant={card.badge === 'Cảnh báo' ? 'destructive' : 'secondary'}>
                          {card.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-5 text-3xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              {/* Nhập Xuất theo ngày */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Nhập / Xuất theo ngày</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    id="daily-flow"
                    config={{
                      inbound: { label: 'Nhập kho', color: '#22c55e' }, // Sửa lỗi ChartConfig: Chỉ giữ lại thuộc tính color
                      outbound: { label: 'Xuất kho', color: '#2563eb' },
                    }}
                  >
                    <AreaChart data={dailyFlowChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      <Area type="monotone" dataKey="inbound" stroke="var(--color-inbound)" fill="var(--color-inbound)" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="outbound" stroke="var(--color-outbound)" fill="var(--color-outbound)" fillOpacity={0.18} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {/* Hiệu suất máy gia công CNC */}
                <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle>Hiệu suất vận hành máy (%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="machine-performance"
                      config={{
                        efficiency: { label: 'Hiệu suất', color: '#f97316' }, // Sửa lỗi ChartConfig
                      }}
                    >
                      <BarChart data={machinePerformanceChart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="machine" tick={{ fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="efficiency" fill="var(--color-efficiency)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Vật tư tiêu hao / chờ ký duyệt */}
                <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle>Yêu cầu vật tư chờ phê duyệt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="pending-approval"
                      config={{
                        quantity: { label: 'Chờ duyệt', color: '#0ea5e9' }, // Sửa lỗi ChartConfig
                      }}
                    >
                      {/* Đổi data thành materialConsumptionChart tương ứng dữ liệu của chú */}
                      <LineChart data={materialConsumptionChart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="material" tick={{ fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="quantity" stroke="var(--color-quantity)" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              {/* Lệnh Sản xuất */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Tiến độ công việc sản xuất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeJobs.map((job) => (
                    <div key={job.orderNumber} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{job.orderNumber} · {job.product}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Hạn hoàn thành: {job.dueDate}</p>
                        </div>
                        <Badge variant={job.status === 'Đang gia công' ? 'secondary' : job.status === 'Chuẩn bị gia công' ? 'outline' : 'default'}>
                          {job.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Tiến độ hoàn thành</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{job.progress}%</span>
                        </div>
                        {renderProgressBar(job.progress)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Bảng Cảnh báo tồn kho thấp dưới định mức */}
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-rose-600 dark:text-rose-400">Cảnh báo tồn kho thấp dưới định mức</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã vật tư</TableHead>
                          <TableHead>Tên vật tư</TableHead>
                          <TableHead>Vị trí kho</TableHead>
                          <TableHead className="text-right">Tồn thực tế</TableHead>
                          <TableHead className="text-right">Hạn mức tối thiểu</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockAlerts.map((item) => (
                          <TableRow key={item.itemCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">{item.itemCode}</TableCell>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell><Badge variant="outline">{item.warehouse}</Badge></TableCell>
                            <TableCell className="text-right text-rose-600 font-semibold">{item.available}</TableCell>
                            <TableCell className="text-right font-medium">{item.threshold}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardSummary;