import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import Skeleton from './Skeleton';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, subtitle, isLoading }) => (
  <div className="overflow-hidden rounded-lg border border-border bg-surface-100 shadow-sm">
    <div className="flex flex-col gap-1 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="heading-meta truncate">{title}</h3>
        <Icon className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.5} />
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <>
          <div
            className="text-xl font-normal leading-tight text-foreground"
            data-testid="stat-card-value"
          >
            {value}
          </div>
          {trendValue ? (
            <p className="flex items-center text-xs text-foreground-lighter">
              <span
                className={cn(
                  'flex items-center font-medium mr-2',
                  trend === 'up' ? 'text-success' : 'text-destructive',
                )}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className="mr-0.5 size-3" />
                ) : (
                  <ArrowDownRight className="mr-0.5 size-3" />
                )}
                {trendValue}
              </span>
              {subtitle}
            </p>
          ) : subtitle ? (
            <p className="text-xs text-foreground-lighter">{subtitle}</p>
          ) : null}
        </>
      )}
    </div>
  </div>
);

export default StatCard;
