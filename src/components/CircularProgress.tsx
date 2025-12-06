import { cn } from '@/lib/utils';

interface CircularProgressProps {
  currentDay: number;
  totalDays: number;
  date: Date;
  className?: string;
}

export function CircularProgress({
  currentDay,
  totalDays,
  date,
  className,
}: CircularProgressProps) {
  const progress = (currentDay / totalDays) * 100;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        className="transform -rotate-90"
        width="180"
        height="180"
        viewBox="0 0 180 180"
      >
        {/* Background circle */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-amber-200/30 dark:text-amber-900/30"
        />
        {/* Progress circle */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-amber-600 dark:text-amber-400 transition-all duration-1000 ease-out"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Day</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {currentDay}
            <span className="text-sm font-normal text-muted-foreground">/{totalDays}</span>
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight px-2">
            {date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

