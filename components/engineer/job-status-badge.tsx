import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function JobStatusBadge({
  status,
  workStatus,
  className,
}: {
  status: 'new' | 'taken' | 'completed';
  workStatus?: 'active' | 'on_hold' | null;
  className?: string;
}) {
  const displayStatus =
    status === 'taken'
      ? (workStatus ?? 'active')
      : status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[displayStatus],
        className
      )}
    >
      {displayStatus === 'on_hold' ? 'On hold' : displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
    </span>
  );
}
