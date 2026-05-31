import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
Card,
CardContent,
CardHeader,
CardTitle,
} from '@/components/ui/card';

import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from '@/components/ui/select';

import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from '@/components/ui/table';

import { Textarea } from '@/components/ui/textarea';

import {
ArrowLeft,
Edit3,
Plus,
Trash2,
} from 'lucide-react';

import { toast } from 'sonner';

import {
buildLocalId,
loadArrayFromStorage,
saveArrayToStorage,
} from '@/lib/localStorage';

import type {
ProductionPlanEntry,
} from '@/types/manufacturing';

const STORAGE_KEY = 'productionPlanEntries';

const timelineDays = Array.from(
{ length: 365 },
(_, i) => addDays(new Date(2026, 0, 1), i)
);

const defaultPlans: ProductionPlanEntry[] = [
{
id: '1',

jobNo: 'AL-5540',

project: 'Seaconics-P.CNC',

machine: 'BF160HC',

drawingNo: '2209899',

description: 'Machine House-N2',

startDate: '2026-04-11',

finishDate: '2026-04-24',

actualStart: '2026-04-11',

actualFinish: '2026-04-24',

qty: 1,

qtyCompleted: 1,

remaining: 0,

hours: 80,

totalHours: 80,

shift: '10h/2ca',

days: 4.4,

progress: 100,

status: 'completed',

note: '',
},

{
id: '2',

jobNo: 'AL-5541',

project: 'Seaconics-P.CNC',

machine: 'BF160HC',

drawingNo: '2219461',

description: 'Kingpost Lower Part',

startDate: '2026-05-21',

finishDate: '2026-06-01',

actualStart: '2026-05-26',

actualFinish: '',

qty: 1,

qtyCompleted: 0.6,

remaining: 0.4,

hours: 160,

totalHours: 160,

shift: '10h/2ca',

days: 8.9,

progress: 62,

status: 'running',

note: '',

},

{
id: '3',

jobNo: 'AL-5548',

project: 'Seaconics-P.KTDA',

machine: 'Shibaura B2',

drawingNo: '219587',

description: 'Inner Boom - Primary Structure',

startDate: '2026-05-11',

finishDate: '2026-05-12',

actualStart: '2026-05-11',

actualFinish: '2026-05-12',

qty: 1,

qtyCompleted: 1,

remaining: 0,

hours: 20,

totalHours: 20,

shift: '10h/2ca',

days: 1.1,

progress: 100,

status: 'completed',

note: '',

},
];

export function ProductionPlan() {
const navigate = useNavigate();

const [plans, setPlans] =
useState<ProductionPlanEntry[]>([]);

const [selectedPlan, setSelectedPlan] =
useState<ProductionPlanEntry | null>(null);

const [isDialogOpen, setIsDialogOpen] =
useState(false);

const [searchTerm, setSearchTerm] =
useState('');

const [selectedIds, setSelectedIds] =
useState<string[]>([]);

const [projectFilter, setProjectFilter] =
useState('all');

const [machineFilter, setMachineFilter] =
useState('all');

const [statusFilter, setStatusFilter] =
useState('all');

const [formData, setFormData] =
useState<Omit<ProductionPlanEntry, 'id'>>({
jobNo: '',

  project: '',

  machine: '',

  drawingNo: '',

  description: '',

  startDate: '',

  finishDate: '',

  actualStart: '',

  actualFinish: '',

  qty: 0,

  qtyCompleted: 0,

  remaining: 0,

  hours: 0,

  totalHours: 0,

  shift: '10h/2ca',

  days: 0,

  progress: 0,

  status: 'planned',

  note: '',
});

useEffect(() => {
const saved =
loadArrayFromStorage<ProductionPlanEntry>(
STORAGE_KEY
);

setPlans(
  saved.length
    ? saved
    : defaultPlans
);

}, []);

const savePlans = (
next: ProductionPlanEntry[]
) => {
saveArrayToStorage(
STORAGE_KEY,
next
);
setPlans(next);
};

const filteredPlans = useMemo(() => {
  return plans.filter((plan) => {
    const searchMatch =
      !searchTerm ||
      plan.jobNo
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
plan.project
.toLowerCase()
.includes(searchTerm.toLowerCase()) ||
plan.drawingNo
.toLowerCase()
.includes(searchTerm.toLowerCase());

  const projectMatch =
    projectFilter === 'all' ||
    plan.project === projectFilter;

  const machineMatch =
    machineFilter === 'all' ||
    plan.machine === machineFilter;

  const statusMatch =
    statusFilter === 'all' ||
    plan.status === statusFilter;

  return (
    searchMatch &&
    projectMatch &&
    machineMatch &&
    statusMatch
  );
});
}, [
plans,
searchTerm,
projectFilter,
machineFilter,
statusFilter,
]);
const machineList = Array.from(new Set(plans.map((x) => x.machine)));

const projectList = Array.from(new Set(plans.map((x) => x.project)));

const totalJobs = plans.length;

const runningJobs =
plans.filter(
(x) => x.status === 'running'
).length;

const completedJobs =
plans.filter(
(x) => x.status === 'completed'
).length;

const delayJobs =
plans.filter((x) => {
return (
new Date() >
new Date(x.finishDate) &&
x.progress < 100
);
}).length;

const toggleSelect = (
id: string
) => {
setSelectedIds((prev) =>
prev.includes(id)
? prev.filter(
(x) => x !== id
)
: [...prev, id]
);
};

const deleteSelected = () => {
if (
selectedIds.length === 0
) {
toast.error(
'Chưa chọn dòng nào'
);
return;
}

if (
!confirm(
`Xóa ${selectedIds.length} dòng ?`
)
)
return;

const next =
plans.filter(
(x) =>
!selectedIds.includes(
x.id
)
);

savePlans(next);

setSelectedIds([]);

toast.success(
'Đã xóa dữ liệu'
);
};

const openNewDialog = () => {
setSelectedPlan(null);

setFormData({
jobNo: '',

project: '',

machine: '',

drawingNo: '',

description: '',

startDate: '',

finishDate: '',

actualStart: '',

actualFinish: '',

qty: 0,

qtyCompleted: 0,

remaining: 0,

hours: 0,

totalHours: 0,

shift: '10h/2ca',

days: 0,

progress: 0,

status: 'planned',

note: '',

});

setIsDialogOpen(true);
};

const handleEdit = (
plan: ProductionPlanEntry
) => {
setSelectedPlan(plan);

setFormData({
...plan,
});

setIsDialogOpen(true);
};

const handleDelete = (id: string) => {
  if (!confirm('Xóa Job này?')) return;

  const next = plans.filter((x) => x.id !== id);

  savePlans(next);

  toast.success('Đã xóa');
};

return (

  <div className="min-h-screen bg-slate-100 p-4">

<div className="space-y-4">

  <div className="flex items-center justify-between">

    <div className="flex items-center gap-2">

      <Button
        variant="outline"
        onClick={() =>
          navigate('/')
        }
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-2xl font-bold">
        Production Plan
      </h1>

    </div>

    <div className="flex gap-2">

      <Button
        variant="destructive"
        onClick={
          deleteSelected
        }
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      <Button
        onClick={
          openNewDialog
        }
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Job
      </Button>

    </div>

  </div>

  <div className="grid grid-cols-4 gap-4">

    <Card>
      <CardContent className="p-4">
        <div className="text-sm">
          Tổng Job
        </div>

        <div className="text-3xl font-bold">
          {totalJobs}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4">
        <div className="text-sm">
          Đang chạy
        </div>

        <div className="text-3xl font-bold text-blue-600">
          {runningJobs}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4">
        <div className="text-sm">
          Hoàn thành
        </div>

        <div className="text-3xl font-bold text-green-600">
          {completedJobs}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4">
        <div className="text-sm">
          Trễ tiến độ
        </div>

        <div className="text-3xl font-bold text-red-600">
          {delayJobs}
        </div>
      </CardContent>
    </Card>

  </div>

  <Card>

    <CardContent className="p-4">

      <div className="grid grid-cols-4 gap-3">

        <Input
          placeholder="Search..."
          value={
            searchTerm
          }
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
        />

        <Select
          value={
            projectFilter
          }
          onValueChange={
            setProjectFilter
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Project" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="all">
              All Project
            </SelectItem>

            {projectList.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>

        </Select>

        <Select
          value={
            machineFilter
          }
          onValueChange={
            setMachineFilter
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Machine" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="all">
              All Machine
            </SelectItem>

            {machineList.map(
              (x) => (
                <SelectItem
                  key={x}
                  value={x}
                >
                  {x}
                </SelectItem>
              )
            )}

          </SelectContent>

        </Select>

        <Select
          value={
            statusFilter
          }
          onValueChange={
            setStatusFilter
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="all">
              All Status
            </SelectItem>

            <SelectItem value="planned">
              Planned
            </SelectItem>

            <SelectItem value="running">
              Running
            </SelectItem>

            <SelectItem value="completed">
              Completed
            </SelectItem>

            <SelectItem value="delay">
              Delay
            </SelectItem>

          </SelectContent>

        </Select>

      </div>

    </CardContent>

  </Card>

  <Card>

    <CardContent className="p-0 overflow-auto">

      <Table>

        <TableHeader>

          <TableRow>

            <TableHead>
              Chọn
            </TableHead>

            <TableHead>
              Job No
            </TableHead>

            <TableHead>
              Project
            </TableHead>

            <TableHead>
              Machine
            </TableHead>

            <TableHead>
              Drw No
            </TableHead>

            <TableHead>
              Description
            </TableHead>

            <TableHead>
              Start
            </TableHead>

            <TableHead>
              Finish
            </TableHead>

            <TableHead>
              Actual Start
            </TableHead>

            <TableHead>
              Actual Finish
            </TableHead>

            <TableHead>
              Qty
            </TableHead>

            <TableHead>
              Qty Complete
            </TableHead>

            <TableHead>
              Remaining
            </TableHead>

            <TableHead>
              Time(h)
            </TableHead>

            <TableHead>
              Total Time
            </TableHead>

            <TableHead>
              Shift
            </TableHead>

            <TableHead>
              Days
            </TableHead>

            <TableHead>
              % Complete
            </TableHead>

            {timelineDays.map(
              (day) => (
                <TableHead
                  key={day.toISOString()}
                  className="text-center min-w-[36px]"
                >
                  {format(
                    day,
                    'dd'
                  )}
                </TableHead>
              )
            )}

            <TableHead>
              Action
            </TableHead>

          </TableRow>

        </TableHeader>

        <TableBody>
        {filteredPlans.map((plan) => {
            const start = new Date(plan.startDate);
            const finish = new Date(plan.finishDate);

    const isDelay =
      new Date() > finish &&
      plan.progress < 100;

    return (
      <TableRow
        key={plan.id}
        className={
          isDelay
            ? 'text-red-600 font-medium'
            : ''
        }
      >
        <TableCell>
          <input
            type="checkbox"
            checked={selectedIds.includes(plan.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(prev => [
                  ...prev,
                  plan.id,
                ]);
              } else {
                setSelectedIds(prev =>
                  prev.filter(
                    x => x !== plan.id
                  )
                );
              }
            }}
          />
        </TableCell>

        <TableCell>
          {plan.jobNo}
        </TableCell>

        <TableCell>
          {plan.project}
        </TableCell>

        <TableCell>
          {plan.machine}
        </TableCell>

        <TableCell>
          {plan.drawingNo}
        </TableCell>

        <TableCell className="min-w-[250px]">
          {plan.description}
        </TableCell>

        <TableCell>
          {plan.startDate}
        </TableCell>

        <TableCell>
          {plan.finishDate}
        </TableCell>

        <TableCell>
          {plan.actualStart}
        </TableCell>

        <TableCell>
          {plan.actualFinish}
        </TableCell>

        <TableCell>
          {plan.qty}
        </TableCell>

        <TableCell>
          {plan.qtyCompleted}
        </TableCell>

        <TableCell>
          {plan.remaining}
        </TableCell>

        <TableCell>
          {plan.hours}
        </TableCell>

        <TableCell>
          {plan.totalHours}
        </TableCell>

        <TableCell>
          {plan.shift}
        </TableCell>

        <TableCell>
          {plan.days}
        </TableCell>

        <TableCell>
          <div className="w-[90px]">
            <div className="w-full bg-slate-200 rounded">
              <div
                className="h-3 rounded"
                style={{
                  width: `${plan.progress}%`,
                  backgroundColor:
                    plan.progress === 100
                      ? '#22c55e'
                      : plan.progress >= 80
                      ? '#3b82f6'
                      : plan.progress >= 50
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              />
            </div>

            <div className="text-center text-xs mt-1">
              {plan.progress}%
            </div>
          </div>
        </TableCell>

        {timelineDays.map((day) => {
          const active =
            day >= start &&
            day <= finish;

          return (
            <TableCell
              key={day.toISOString()}
              className="p-0"
            >
              <div
                className={
                  active
                    ? isDelay
                      ? 'bg-red-500 h-5 w-full'
                      : plan.progress === 100
                      ? 'bg-green-500 h-5 w-full'
                      : 'bg-blue-500 h-5 w-full'
                    : 'h-5'
                }
              />
            </TableCell>
          );
        })}

        <TableCell>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleEdit(plan)
              }
            >
              <Edit3 className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                handleDelete(plan.id)
              }
            >
              
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
</Table>
</CardContent>
</Card>
<Dialog
  open={isDialogOpen}
  onOpenChange={setIsDialogOpen}
>
  <DialogContent className="max-w-5xl">

    <DialogHeader>
      <DialogTitle>
        {selectedPlan
          ? 'Edit Job'
          : 'Add New Job'}
      </DialogTitle>
    </DialogHeader>

    <form
      onSubmit={(e) => {
        e.preventDefault();

        const next: ProductionPlanEntry = {
          id:
            selectedPlan?.id ??
            buildLocalId('plan'),

          ...formData,

          remaining:
            formData.qty -
            formData.qtyCompleted,
        };

        if (selectedPlan) {
          savePlans(
            plans.map((x) =>
              x.id === selectedPlan.id
                ? next
                : x
            )
          );

          toast.success(
            'Updated'
          );
        } else {
          savePlans([
            next,
            ...plans,
          ]);

          toast.success(
            'Created'
          );
        }

        setIsDialogOpen(false);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-4 gap-4">

        <div>
          <Label>Job No</Label>

          <Input
            value={formData.jobNo}
            onChange={(e) =>
              setFormData({
                ...formData,
                jobNo:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Project</Label>

          <Input
            value={formData.project}
            onChange={(e) =>
              setFormData({
                ...formData,
                project:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Machine</Label>

          <Input
            value={formData.machine}
            onChange={(e) =>
              setFormData({
                ...formData,
                machine:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Drawing No</Label>

          <Input
            value={formData.drawingNo}
            onChange={(e) =>
              setFormData({
                ...formData,
                drawingNo:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="col-span-4">
          <Label>Description</Label>

          <Input
            value={
              formData.description
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                description:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Start</Label>

          <Input
            type="date"
            value={
              formData.startDate
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                startDate:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Finish</Label>

          <Input
            type="date"
            value={
              formData.finishDate
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                finishDate:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>
            Actual Start
          </Label>

          <Input
            type="date"
            value={
              formData.actualStart
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                actualStart:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>
            Actual Finish
          </Label>

          <Input
            type="date"
            value={
              formData.actualFinish
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                actualFinish:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Qty</Label>

          <Input
            type="number"
            value={formData.qty}
            onChange={(e) =>
              setFormData({
                ...formData,
                qty: Number(
                  e.target.value
                ),
              })
            }
          />
        </div>

        <div>
          <Label>
            Qty Complete
          </Label>

          <Input
            type="number"
            value={
              formData.qtyCompleted
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                qtyCompleted:
                  Number(
                    e.target.value
                  ),
              })
            }
          />
        </div>

        <div>
          <Label>
            Remaining
          </Label>

          <Input
            value={
              formData.qty -
              formData.qtyCompleted
            }
            readOnly
          />
        </div>

        <div>
          <Label>
            Progress %
          </Label>

          <Input
            type="number"
            value={
              formData.progress
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                progress:
                  Number(
                    e.target.value
                  ),
              })
            }
          />
        </div>

        <div>
          <Label>
            Time (h)
          </Label>

          <Input
            type="number"
            value={
              formData.hours
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                hours: Number(
                  e.target.value
                ),
              })
            }
          />
        </div>

        <div>
          <Label>
            Total Time
          </Label>

          <Input
            type="number"
            value={
              formData.totalHours
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                totalHours:
                  Number(
                    e.target.value
                  ),
              })
            }
          />
        </div>

        <div>
          <Label>Shift</Label>

          <Input
            value={
              formData.shift
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                shift:
                  e.target.value,
              })
            }
          />
        </div>

        <div>
          <Label>Days</Label>

          <Input
            type="number"
            value={
              formData.days
            }
            onChange={(e) =>
              setFormData({
                ...formData,
                days: Number(
                  e.target.value
                ),
              })
            }
          />
        </div>

        <div className="col-span-4">
          <Label>Note</Label>

          <Textarea
            value={formData.note}
            onChange={(e) =>
              setFormData({
                ...formData,
                note:
                  e.target.value,
              })
            }
          />
        </div>

      </div>

      <div className="flex justify-end gap-2">

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setIsDialogOpen(
              false
            )
          }
        >
          Cancel
        </Button>

        <Button type="submit">
          Save
        </Button>

      </div>
    </form>

  </DialogContent>
</Dialog>

</div>

</div>
);
}