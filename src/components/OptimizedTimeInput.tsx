// Thời gian gia công
// Thời gian gá phôi  
// nằm trong nút thêm nhật ký sản xuất của nhật ký sản xuất
import React, { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { Clock, Plus } from 'lucide-react';

import type { WorkTimeEntry } from '@/types/production';

type ShiftType = 'ngay' | 'dem' | '';

type TimeInterval = {
  startTime: string;
  endTime: string;
};

interface OptimizedTimeInputProps {
  onTimeChange?: (
    machiningHours: string,
    setupHours: string,
    shift: ShiftType,
    machiningEntries: WorkTimeEntry[],
    setupEntries: WorkTimeEntry[]
  ) => void;
}

interface TimeSectionProps {
  title: string;
  intervals: TimeInterval[];
  totalHours: string;

  onAdd: () => void;

  onRemove: (index: number) => void;

  onUpdate: (
    index: number,
    field: keyof TimeInterval,
    value: string
  ) => void;
}

function calculateHours(interval: TimeInterval): number {
  if (!interval.startTime || !interval.endTime) {
    return 0;
  }

  const start = new Date(`2000-01-01T${interval.startTime}`);
  const end = new Date(`2000-01-01T${interval.endTime}`);

  // xử lý qua đêm
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  const diffMs = end.getTime() - start.getTime();

  return Math.max(0, diffMs / (1000 * 60 * 60));
}

function convertToEntries(
  intervals: TimeInterval[]
): WorkTimeEntry[] {
  return intervals
    .filter((x) => x.startTime && x.endTime)
    .map((x) => ({
      gioBatDau: x.startTime,
      gioKetThuc: x.endTime,
      soGio: calculateHours(x),
    }));
}

const TimeSection: React.FC<TimeSectionProps> = ({
  title,
  intervals,
  totalHours,
  onAdd,
  onRemove,
  onUpdate,
}) => {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-blue-600 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {title}
          </CardTitle>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled={intervals.length >= 10}
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm ({intervals.length}/10)
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {intervals.map((interval, index) => {
          const hours = calculateHours(interval);

          return (
            <div
              key={index}
              className="p-4 border rounded-lg bg-white"
            >
              <div className="flex items-center justify-between mb-3">
                <Label className="font-semibold">
                  Khoảng thời gian {index + 1}
                </Label>

                {intervals.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemove(index)}
                  >
                    Xóa
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Giờ bắt đầu</Label>

                  <Input
                    type="time"
                    value={interval.startTime}
                    onChange={(e) =>
                      onUpdate(
                        index,
                        'startTime',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Giờ kết thúc</Label>

                  <Input
                    type="time"
                    value={interval.endTime}
                    onChange={(e) =>
                      onUpdate(
                        index,
                        'endTime',
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Số giờ</Label>

                  <Input
                    readOnly
                    value={hours.toFixed(2)}
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {totalHours && (
          <div className="p-4 rounded-lg bg-white border border-blue-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />

              <span className="font-medium text-blue-800">
                Tổng số giờ:
              </span>

              <span className="text-lg font-bold text-blue-600">
                {totalHours}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const OptimizedTimeInput: React.FC<
  OptimizedTimeInputProps
> = ({ onTimeChange = () => {} }) => {
  // =========================
  // Gia công
  // =========================
  const [machiningIntervals, setMachiningIntervals] =
    useState<TimeInterval[]>([
      {
        startTime: '',
        endTime: '',
      },
    ]);

  // =========================
  // Gá phôi
  // =========================
  const [setupIntervals, setSetupIntervals] =
    useState<TimeInterval[]>([
      {
        startTime: '',
        endTime: '',
      },
    ]);

  const [machiningHours, setMachiningHours] =
    useState('');

  const [setupHours, setSetupHours] =
    useState('');

  const [shift, setShift] =
    useState<ShiftType>('');

  const addInterval = (
    setter: React.Dispatch<
      React.SetStateAction<TimeInterval[]>
    >
  ) => {
    setter((prev) => {
      if (prev.length >= 10) return prev;

      return [
        ...prev,
        {
          startTime: '',
          endTime: '',
        },
      ];
    });
  };

  const removeInterval = (
    setter: React.Dispatch<
      React.SetStateAction<TimeInterval[]>
    >,
    index: number
  ) => {
    setter((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const updateInterval = (
    setter: React.Dispatch<
      React.SetStateAction<TimeInterval[]>
    >,
    index: number,
    field: keyof TimeInterval,
    value: string
  ) => {
    setter((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  useEffect(() => {
    const totalMachining = machiningIntervals.reduce(
      (sum, item) => sum + calculateHours(item),
      0
    );

    const totalSetup = setupIntervals.reduce(
      (sum, item) => sum + calculateHours(item),
      0
    );

    setMachiningHours(
      totalMachining > 0
        ? totalMachining.toFixed(2)
        : ''
    );

    setSetupHours(
      totalSetup > 0
        ? totalSetup.toFixed(2)
        : ''
    );

    // detect ca
    let detectedShift: ShiftType = '';

    const firstStart =
      machiningIntervals.find(
        (x) => x.startTime
      )?.startTime ||
      setupIntervals.find(
        (x) => x.startTime
      )?.startTime;

    if (firstStart) {
      const hour = Number(
        firstStart.split(':')[0]
      );

      detectedShift =
        hour >= 6 && hour < 18
          ? 'ngay'
          : 'dem';
    }

    setShift(detectedShift);

    onTimeChange(
      totalMachining.toFixed(2),
      totalSetup.toFixed(2),
      detectedShift,
      convertToEntries(machiningIntervals),
      convertToEntries(setupIntervals)
    );
  }, [machiningIntervals, setupIntervals]);

  return (
    <div className="space-y-6">
      {/* THỜI GIAN GIA CÔNG */}
      <TimeSection
        title="Thời gian gia công"
        intervals={machiningIntervals}
        totalHours={machiningHours}
        onAdd={() =>
          addInterval(setMachiningIntervals)
        }
        onRemove={(index) =>
          removeInterval(
            setMachiningIntervals,
            index
          )
        }
        onUpdate={(index, field, value) =>
          updateInterval(
            setMachiningIntervals,
            index,
            field,
            value
          )
        }
      />

      {/* THỜI GIAN GÁ PHÔI */}
      <TimeSection
        title="Thời gian gá phôi"
        intervals={setupIntervals}
        totalHours={setupHours}
        onAdd={() =>
          addInterval(setSetupIntervals)
        }
        onRemove={(index) =>
          removeInterval(
            setSetupIntervals,
            index
          )
        }
        onUpdate={(index, field, value) =>
          updateInterval(
            setSetupIntervals,
            index,
            field,
            value
          )
        }
      />

      {/* THÔNG TIN CA */}
      {shift && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />

              <span className="font-medium text-green-800">
                Ca làm việc:
              </span>

              <span className="font-bold text-green-600">
                {shift === 'ngay'
                  ? 'Ca ngày'
                  : 'Ca đêm'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};