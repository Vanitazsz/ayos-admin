import React from 'react';
import Skeleton from './Skeleton';
import { TableCell, TableRow } from './Table';

const BAR_WIDTHS = ['w-full', 'w-3/4', 'w-2/3', 'w-1/2'];

export function TableSkeleton({ rows = 6, columns = [], withSelect = false }) {
  const configs =
    typeof columns === 'number' ? Array.from({ length: columns }, () => null) : columns;

  return Array.from({ length: rows }).map((_, rowIndex) => (
    <TableRow key={rowIndex} hover={false}>
      {withSelect ? (
        <TableCell className="text-center">
          <Skeleton className="h-4 w-4 rounded" />
        </TableCell>
      ) : null}
      {configs.map((config, columnIndex) => {
        const className = typeof config === 'string' ? config : config?.className;
        const children = config && typeof config === 'object' ? config.children : undefined;
        return (
          <TableCell key={columnIndex} className={className}>
            {children ??
              (className?.includes('text-right') ? (
                <Skeleton className="h-8 w-8 rounded-lg" />
              ) : (
                <Skeleton className={`h-4 ${BAR_WIDTHS[columnIndex % BAR_WIDTHS.length]}`} />
              ))}
          </TableCell>
        );
      })}
    </TableRow>
  ));
}

export default TableSkeleton;
