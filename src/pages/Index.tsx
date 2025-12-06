import { useMemo, useState, useEffect } from 'react';
import { useHead } from '@unhead/react';
import { CalendarView } from '@/components/CalendarView';
import { CommunityFeed } from '@/components/CommunityFeed';
import { LoginArea } from '@/components/auth/LoginArea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeaderProgressRing } from '@/components/HeaderProgressRing';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGratitudeEntries } from '@/hooks/useGratitudeEntries';
import {
  getAllDaysInYear,
  getDayOfYear,
  getTotalDaysInYear,
  getWeekOfYear,
} from '@/lib/gratitudeUtils';
import { Sparkles, Calendar, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

export default function Index() {
  useHead({
    title: 'Grateful Day - Daily Reflection Calendar',
    meta: [
      {
        name: 'description',
        content:
          'A Nostr-based daily reflection calendar for personal growth and community sharing. Track your daily journey of gratitude through the year on gratefulday.space.',
      },
    ],
  });

  const { user } = useCurrentUser();
  const { data: gratitudeEntries, isLoading } = useGratitudeEntries(user?.pubkey);
  const [activeTab, setActiveTab] = useState('calendar');
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const isMobile = useIsMobile();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentDayOfYear = getDayOfYear(today);
  const totalDays = getTotalDaysInYear(currentYear);
  const weekOfYear = getWeekOfYear(today);

  // Handle header shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setHeaderScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get all days in the current year
  const allDays = useMemo(() => getAllDaysInYear(currentYear), [currentYear]);

  // Create a map of dates with entries for quick lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, boolean>();
    if (gratitudeEntries) {
      gratitudeEntries.forEach((entry) => {
        const dTag = entry.tags.find(([name]) => name === 'd')?.[1];
        if (dTag) {
          map.set(dTag, true);
        }
      });
    }
    return map;
  }, [gratitudeEntries]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header */}
        <header
          className={cn(
            'border-b border-amber-200 dark:border-gray-800 bg-white dark:bg-gray-950 backdrop-blur-md sticky top-0 z-[100] transition-shadow duration-200',
            headerScrolled && 'shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          )}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-[72px]">
              {/* Left: Logo + Progress Ring */}
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              <HeaderProgressRing
                currentDay={currentDayOfYear}
                totalDays={totalDays}
                date={today}
                weekOfYear={weekOfYear}
              />
              </div>

              {/* Center/Right: Tabs (desktop) + Login */}
              <div className="flex items-center gap-4">
                {!isMobile && (
                  <TabsList className="bg-transparent border-0 shadow-none h-auto p-0 gap-1">
                    <TabsTrigger
                      value="calendar"
                      className="gap-2 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                    >
                      <Calendar className="h-4 w-4" />
                      My Calendar
                    </TabsTrigger>
                    <TabsTrigger
                      value="community"
                      className="gap-2 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                    >
                      <Users className="h-4 w-4" />
                      Community
                    </TabsTrigger>
                  </TabsList>
                )}
                <LoginArea className="max-w-60" />
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Tabs */}
        {isMobile && (
          <div className="border-b border-amber-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4">
              <TabsList className="w-full bg-transparent border-0 shadow-none h-auto p-0 gap-1 justify-start">
                <TabsTrigger
                  value="calendar"
                  className="flex-1 gap-2 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                >
                  <Calendar className="h-4 w-4" />
                  My Calendar
                </TabsTrigger>
                <TabsTrigger
                  value="community"
                  className="flex-1 gap-2 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                >
                  <Users className="h-4 w-4" />
                  Community
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        )}

        {/* Main Content Section */}
        <section className="w-full">
          <TabsContent value="calendar" className="mt-0">
            {isLoading ? (
              <div className="w-full max-w-4xl mx-auto px-4 py-12">
                <div className="space-y-4">
                  <Skeleton className="w-full h-[600px] rounded-lg" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <CalendarView days={allDays} entriesByDate={entriesByDate} />
            )}
          </TabsContent>

          <TabsContent value="community" className="mt-0">
            <div className="container mx-auto px-4 pt-4 pb-16">
              <CommunityFeed />
            </div>
          </TabsContent>
        </section>

        {/* Footer */}
        <footer className="border-t border-amber-200 dark:border-gray-800 bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Built with love on Nostr
              </p>
              <p className="text-xs text-muted-foreground">
                Vibed with{' '}
                <a
                  href="https://shakespeare.diy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Shakespeare
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Tabs>
  );
}
