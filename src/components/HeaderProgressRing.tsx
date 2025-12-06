import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGratitudeEntries } from '@/hooks/useGratitudeEntries';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface HeaderProgressRingProps {
  currentDay: number;
  totalDays: number;
  date: Date;
  weekOfYear?: number;
  className?: string;
}

export function HeaderProgressRing({
  currentDay,
  totalDays,
  date,
  weekOfYear,
  className,
}: HeaderProgressRingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useCurrentUser();
  const { data: gratitudeEntries } = useGratitudeEntries(user?.pubkey);

  const progress = (currentDay / totalDays) * 100;
  const radius = 21; // For 50px diameter (25px radius, but accounting for stroke)
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Calculate streaks
  const calculateStreaks = () => {
    if (!gratitudeEntries || gratitudeEntries.length === 0) {
      return { current: 0, longest: 0, total: 0 };
    }

    // Sort entries by date
    const sortedEntries = [...gratitudeEntries].sort((a, b) => {
      const aDate = a.tags.find(([name]) => name === 'd')?.[1] || '';
      const bDate = b.tags.find(([name]) => name === 'd')?.[1] || '';
      return aDate.localeCompare(bDate);
    });

    // Get dates with entries
    const entryDates = sortedEntries
      .map((entry) => {
        const dTag = entry.tags.find(([name]) => name === 'd')?.[1];
        return dTag ? new Date(dTag + 'T00:00:00').getTime() : null;
      })
      .filter((date): date is number => date !== null)
      .sort((a, b) => a - b);

    if (entryDates.length === 0) {
      return { current: 0, longest: 0, total: entryDates.length };
    }

    // Calculate current streak (from today backwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    let currentStreak = 0;
    let checkDate = todayTime;
    
    // Check if today has an entry
    if (entryDates.includes(todayTime)) {
      currentStreak = 1;
      checkDate = todayTime - 86400000; // Previous day
    }

    // Count backwards
    while (entryDates.includes(checkDate)) {
      currentStreak++;
      checkDate -= 86400000; // Previous day
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    
    for (let i = 1; i < entryDates.length; i++) {
      const diff = entryDates[i] - entryDates[i - 1];
      if (diff === 86400000) {
        // Consecutive day
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      total: entryDates.length,
    };
  };

  const streaks = calculateStreaks();

  const dateText = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-3 cursor-pointer transition-transform hover:scale-105 active:scale-100',
          className
        )}
        aria-label={`Progress: Day ${currentDay} of ${totalDays}, ${Math.round(progress)}% complete`}
      >
        {/* Small progress ring */}
        <div className="relative flex-shrink-0">
          <svg
            className="transform -rotate-90"
            width="50"
            height="50"
            viewBox="0 0 50 50"
          >
            {/* Background circle */}
            <circle
              cx="25"
              cy="25"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-amber-200/30 dark:text-amber-900/30"
            />
            {/* Progress circle */}
            <circle
              cx="25"
              cy="25"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-amber-600 dark:text-amber-400 transition-all duration-1000 ease-out"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          {/* Center number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {currentDay}
            </span>
          </div>
        </div>

        {/* Text next to ring */}
        <div className="hidden sm:flex flex-col">
          <span className="text-base font-medium text-foreground">
            Day {currentDay} of {totalDays}
            {weekOfYear && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                • Week {weekOfYear}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {dateText}
          </span>
        </div>
        {/* Mobile: Show only "Day X" on very small screens, hide on smallest */}
        <div className="hidden min-[420px]:block sm:hidden text-base font-medium text-foreground">
          Day {currentDay}
          {weekOfYear && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              • W{weekOfYear}
            </span>
          )}
        </div>
      </button>

      {/* Stats Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Your Progress</DialogTitle>
            <DialogDescription>
              {date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Progress */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Progress</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {Math.round(progress)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentDay} of {totalDays} days
              </p>
            </div>

            {/* Current Streak */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Current Streak</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {streaks.current} {streaks.current === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Longest Streak</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {streaks.longest} {streaks.longest === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* Total Reflections */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Total Reflections</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {streaks.total}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

