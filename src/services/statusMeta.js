export const BOOKING_STATUS_BADGE = {
  Completed: 'bg-success/10 text-success-600 dark:text-success-400',
  Pending: 'bg-warning/10 text-warning-600 dark:text-warning-400',
  Ongoing: 'bg-info/10 text-info-600 dark:text-info-400',
  'En Route': 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
  Cancelled: 'bg-surface-200 text-foreground',
  Refunded: 'bg-surface-200 text-foreground',
};

export const PAYMENT_STATUS_BADGE = {
  Completed: 'bg-success/10 text-success-600 dark:text-success-400',
  Pending: 'bg-warning/10 text-warning-600 dark:text-warning-400',
  Failed: 'bg-destructive/10 text-destructive-600 dark:text-destructive-400',
  Refunded: 'bg-surface-200 text-foreground',
};

export const NOTIFICATION_STATUS_BADGE = {
  Sent: 'bg-success/10 text-success-600 dark:text-success-400',
  Scheduled: 'bg-warning/10 text-warning-600 dark:text-warning-400',
  Draft: 'bg-surface-200 text-foreground',
  Failed: 'bg-destructive/10 text-destructive-600 dark:text-destructive-400',
};

export const SUPPORT_STATUS_BADGE = {
  Open: 'bg-brand-500/10 text-brand-700 dark:text-brand-300',
  Pending: 'bg-warning/10 text-warning-600 dark:text-warning-400',
  Resolved: 'bg-success/10 text-success-600 dark:text-success-400',
};

export const REVIEW_STATUS_BADGE = {
  Published: 'bg-success/10 text-success-600 dark:text-success-400',
  Hidden: 'bg-surface-200 text-foreground',
  Flagged: 'bg-destructive/10 text-destructive-600 dark:text-destructive-400',
};

export const DEFAULT_BADGE = 'bg-surface-200 text-foreground';

export const badgeFor = (map, status) => map[status] ?? DEFAULT_BADGE;
