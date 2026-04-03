import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';

interface OptimizedTimeInputProps {
  onTimeChange: (totalTime: string, shift: 'ngay' | 'dem' | '') => void;
}

type TimeInterval = {
  startTime: string;
  endTime: string;
};

function computeIntervalHours(itv: TimeInterval): number {
  if (!itv.startTime || !itv.endTime) return 0;

  const start = new Date(`2000-01-01T${itv.startTime}`);
  const end = new Date(`2000-01-01T${itv.endTime}`);

  // Xử lý qua đêm
  const endAdj = new Date(end);
  if (endAdj < start) {
    endAdj.setDate(endAdj.getDate() + 1);
  }

  const diffMinutes = Math.floor((endAdj.getTime() - start.getTime()) / (1000 * 60));
  const diffHours = diffMinutes / 60;

  return Math.max(0, diffHours);
}

export const OptimizedTimeInput: React.FC<OptimizedTimeInputProps> = ({ onTimeChange }) => {
  const [intervals, setIntervals] = useState<TimeInterval[]>([
    { startTime: '', endTime: '' },
  ]);

  const [totalHours, setTotalHours] = useState('');
  const [shift, setShift] = useState<'ngay' | 'dem' | ''>('');

  // Thêm khoảng thời gian (giống "Thêm dao cụ")
  const addInterval = () => {
    if (intervals.length >= 10) return;
    setIntervals((prev) => [...prev, { startTime: '', endTime: '' }]);
  };

  const removeInterval = (index: number) => {
    setIntervals((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInterval = (index: number, field: keyof TimeInterval, value: string) => {
    setIntervals((prev) => prev.map((itv, i) => (i === index ? { ...itv, [field]: value } : itv)));
  };

  // Tính tổng số giờ và phát hiện Ca theo giờ bắt đầu sớm nhất
  useEffect(() => {
    const validIntervals = intervals.filter((itv) => itv.startTime && itv.endTime);

    if (validIntervals.length === 0) {
      setTotalHours('');
      setShift('');
      onTimeChange('', '');
      return;
    }

    let sum = 0;
    let earliestStart: Date | null = null;

    for (const itv of validIntervals) {
      const hours = computeIntervalHours(itv);
      sum += hours;

      const start = new Date(`2000-01-01T${itv.startTime}`);
      if (!earliestStart || start < earliestStart) {
        earliestStart = start;
      }
    }

    if (sum > 0) {
      let detectedShift: 'ngay' | 'dem' | '' = '';
      if (earliestStart) {
        const h = earliestStart.getHours();
        detectedShift = h >= 6 && h < 18 ? 'ngay' : 'dem';
      }

      const sumStr = sum.toFixed(2);
      setTotalHours(sumStr);
      setShift(detectedShift);
      onTimeChange(sumStr, detectedShift);
    } else {
      setTotalHours('');
      setShift('');
      onTimeChange('', '');
    }
  }, [intervals]);

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-blue-600 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Thời gian làm việc
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInterval}
            disabled={intervals.length >= 10}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm ({intervals.length}/10)
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {intervals.map((itv, index) => {
          const hours = computeIntervalHours(itv);
          return (
            <div key={index} className="p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold text-gray-600">Khoảng thời gian {index + 1}</Label>
                {intervals.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeInterval(index)}
                  >
                    Xóa
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`startTime-${index}`}>Giờ bắt đầu</Label>
                  <Input
                    id={`startTime-${index}`}
                    type="time"
                    value={itv.startTime}
                    onChange={(e) => updateInterval(index, 'startTime', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`endTime-${index}`}>Giờ kết thúc</Label>
                  <Input
                    id={`endTime-${index}`}
                    type="time"
                    value={itv.endTime}
                    onChange={(e) => updateInterval(index, 'endTime', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Số giờ </Label>
                  <Input readOnly className="bg-gray-100" value={hours.toFixed(2)} />
                </div>
              </div>
            </div>
          );
        })}

        {totalHours && (
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Tổng số giờ:</span>
                <span className="text-lg font-bold text-blue-600">{totalHours}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};