import { CalendarDays, Check, ChevronDown, X } from 'lucide-react';
import Button from './Button';
import DateRangeModal from './DateRangeModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './DropdownMenu';

const check = (active) => (active ? <Check className="size-4" /> : <span className="size-4" />);

export function DateFilter({ model }) {
  const {
    sort,
    setSort,
    field,
    setField,
    preset,
    setPreset,
    setIsRangeOpen,
    label,
    clear,
    canModify,
    canUseDeleted,
  } = model;
  const showFieldMenu = canModify || canUseDeleted;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <CalendarDays className="size-4" />
            <span className="max-w-40 truncate">{label}</span>
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => {
              setSort('newest');
              setPreset('all');
            }}
            className="cursor-pointer justify-between"
          >
            Most Recent
            {check(sort === 'newest' && preset === 'all')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setSort('oldest');
              setPreset('all');
            }}
            className="cursor-pointer justify-between"
          >
            Old to New
            {check(sort === 'oldest' && preset === 'all')}
          </DropdownMenuItem>
          {showFieldMenu ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Date field</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => setField('created')}
                className="cursor-pointer justify-between"
              >
                Created
                {check(field === 'created')}
              </DropdownMenuItem>
              {canModify ? (
                <DropdownMenuItem
                  onSelect={() => setField('modified')}
                  className="cursor-pointer justify-between"
                >
                  Modified
                  {check(field === 'modified')}
                </DropdownMenuItem>
              ) : null}
              {canUseDeleted ? (
                <DropdownMenuItem
                  onSelect={() => setField('deleted')}
                  className="cursor-pointer justify-between"
                >
                  Deleted
                  {check(field === 'deleted')}
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Range</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => setPreset('today')}
            className="cursor-pointer justify-between"
          >
            Today
            {check(preset === 'today')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setPreset('7d')}
            className="cursor-pointer justify-between"
          >
            Last 7 Days
            {check(preset === '7d')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setPreset('month')}
            className="cursor-pointer justify-between"
          >
            This Month
            {check(preset === 'month')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setPreset('all')}
            className="cursor-pointer justify-between"
          >
            All Time
            {check(preset === 'all')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setIsRangeOpen(true)}
            className="cursor-pointer justify-between"
          >
            Custom Range…
            {check(preset === 'custom')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={clear} className="cursor-pointer justify-between">
            <span className="flex items-center">
              <X className="size-4 mr-2" /> Clear Filter
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DateRangeModal model={model} />
    </>
  );
}

export default DateFilter;
