import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  taken: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function JobStatusBadge({
  status,
  className,
}: {
  status: 'new' | 'taken' | 'completed';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
