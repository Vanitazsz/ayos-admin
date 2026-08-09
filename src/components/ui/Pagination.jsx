import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPageWindow } from '../../hooks/usePagination';
import { cn } from '../../lib/utils';
import Button from './Button';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  pageSize = 10,
  totalCount,
}) => {
  const pages = getPageWindow(currentPage, totalPages);
  const count = totalCount ?? totalPages * pageSize;
  const start = count === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, count);
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 border-t border-border px-4 py-3 sm:flex-row sm:justify-between sm:px-6',
        className,
      )}
    >
      <p className="text-sm text-foreground-muted">
        Showing{' '}
        <span className="font-medium text-foreground">{start}</span> to{' '}
        <span className="font-medium text-foreground">{end}</span> of{' '}
        <span className="font-medium text-foreground">{count}</span> results
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Button
          variant="default"
          size="icon-sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'primary' : 'ghost'}
            size="sm"
            className={cn(
              'min-w-8 px-2',
              currentPage !== page && 'text-foreground-lighter',
            )}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </Button>
        ))}
        <Button
          variant="default"
          size="icon-sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
};

export default Pagination;
