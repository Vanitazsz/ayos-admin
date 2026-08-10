import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const useHorizontalScroll = (ref) => {
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const checkScroll = () => {
      const hasScroll = element.scrollWidth > element.clientWidth;
      setHasHorizontalScroll(hasScroll);

      if (hasScroll) {
        const canScrollLeft = element.scrollLeft > 0;
        const canScrollRight =
          element.scrollLeft < element.scrollWidth - element.clientWidth;
        setCanScrollLeft(canScrollLeft);
        setCanScrollRight(canScrollRight);
      } else {
        setCanScrollLeft(false);
        setCanScrollRight(false);
      }
    };

    const handleScroll = () => {
      if (hasHorizontalScroll) {
        const canScrollLeft = element.scrollLeft > 0;
        const canScrollRight =
          element.scrollLeft < element.scrollWidth - element.clientWidth;
        setCanScrollLeft(canScrollLeft);
        setCanScrollRight(canScrollRight);
      }
    };

    checkScroll();
    element.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [ref, hasHorizontalScroll]);

  return { hasHorizontalScroll, canScrollLeft, canScrollRight };
};

const ShadowScrollArea = React.forwardRef(
  ({ className, containerClassName, children, ...props }, _ref) => {
    const containerRef = useRef(null);
    const { hasHorizontalScroll, canScrollLeft, canScrollRight } =
      useHorizontalScroll(containerRef);

    return (
      <div ref={_ref} className={cn(containerClassName, 'relative')}>
        <div
          className={cn(
            'absolute inset-0 pointer-events-none z-38',
            'before:absolute before:top-0 before:right-0 before:bottom-0 before:w-6 before:bg-linear-to-l before:from-black/5 dark:before:from-black/20 before:to-transparent before:opacity-0 before:transition-all before:duration-400 before:easing-[0.24, 0.25, 0.05, 1]',
            'after:absolute after:top-0 after:left-0 after:bottom-0 after:w-6 after:bg-linear-to-r after:from-black/5 dark:after:from-black/20 after:to-transparent after:opacity-0 after:transition-all after:duration-400 after:easing-[0.24, 0.25, 0.05, 1]',
            hasHorizontalScroll && 'hover:before:opacity-100 hover:after:opacity-100',
            canScrollRight && 'before:opacity-100',
            canScrollLeft && 'after:opacity-100',
          )}
        />
        <div
          ref={containerRef}
          className={cn('w-full overflow-auto', className)}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  },
);
ShadowScrollArea.displayName = 'ShadowScrollArea';

const Table = React.forwardRef(({ className, containerProps, ...props }, ref) => (
  <ShadowScrollArea {...containerProps}>
    <table
      ref={ref}
      className={cn('group/table w-full caption-bottom text-sm', className)}
      {...props}
    />
  </ShadowScrollArea>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b [&>tr]:bg-200', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn('border-t border-border font-medium', className)} {...props} />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef(({ className, hover = true, selected, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b group transition-colors',
      hover && 'hover:bg-surface-200',
      selected && 'bg-muted hover:bg-muted',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-4 text-left align-middle heading-meta whitespace-nowrap text-foreground-lighter [&:has([role=checkbox])]:pr-0',
      'transition-colors',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableHeadSort = React.forwardRef(
  ({ column, currentSort, onSortChange, children, className }, _ref) => {
    const [currentCol, currentOrder] = currentSort.split(':');
    const isActive = currentCol === column;
    const isAsc = isActive && currentOrder === 'asc';
    const isDesc = isActive && currentOrder === 'desc';

    const getSortIcon = () => {
      const baseIconClass = 'w-3 h-3 absolute inset-0';

      return (
        <>
          <ArrowUp
            className={cn(
              baseIconClass,
              'transition-transform',
              isAsc ? 'translate-y-0' : 'translate-y-full',
            )}
          />
          <ArrowDown
            className={cn(
              baseIconClass,
              'transition-transform',
              isDesc ? 'translate-y-0' : '-translate-y-full',
            )}
          />
          <ChevronsUpDown
            className={cn(
              baseIconClass,
              'transition-opacity opacity-80 md:opacity-40',
              !isActive ? 'group-hover/table-head-sort:opacity-80' : 'opacity-0!',
            )}
          />
        </>
      );
    };

    return (
      <button
        type="button"
        tabIndex={0}
        className={cn(
          'group/table-head-sort heading-meta whitespace-nowrap flex items-center gap-1 cursor-pointer select-none bg-transparent! border-none p-0 w-full text-left',
          className,
        )}
        onClick={() => onSortChange(column)}
      >
        {children}
        <div className="w-3 h-3 relative overflow-hidden">{getSortIcon()}</div>
      </button>
    );
  },
);
TableHeadSort.displayName = 'TableHeadSort';

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'transition-colors p-4 align-middle [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('border-t', 'p-4 text-sm text-foreground-muted', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableHeadSort,
  TableRow,
  TableCell,
  TableCaption,
};
