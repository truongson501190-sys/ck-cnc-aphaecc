// src/components/WarehouseFilter.tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface WarehouseFilterProps {
  onFilter: (filters: any) => void;
  warehouses: string[];
  materials: string[];
}

export function WarehouseFilter({ onFilter, warehouses, materials }: WarehouseFilterProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouse, setWarehouse] = useState('all');
  const [material, setMaterial] = useState('all');
  const [type, setType] = useState('all');
  const [show, setShow] = useState(false);

  const types = ['all', 'in', 'out', 'transfer', 'oil'];

  const applyFilter = () => {
    onFilter({ dateFrom, dateTo, warehouse, material, type });
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setWarehouse('all');
    setMaterial('all');
    setType('all');
    onFilter({ dateFrom: '', dateTo: '', warehouse: 'all', material: 'all', type: 'all' });
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => setShow(!show)}>
        <Filter className="w-4 h-4 mr-2" /> {show ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
      </Button>
      {show && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="dateFrom">Từ ngày</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dateTo">Đến ngày</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="warehouse">Kho</Label>
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {warehouses.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="material">Vật liệu</Label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {materials.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Loại</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => <SelectItem key={t} value={t}>{t === 'all' ? 'Tất cả' : t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={applyFilter}>Lọc</Button>
                <Button variant="outline" onClick={clearFilter}><X className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}