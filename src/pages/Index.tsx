import { useMemo, useState, useEffect } from 'react';
import { useHead } from '@unhead/react';
import { CalendarView } from '@/components/CalendarView';
import { CommunityFeed } from '@/components/CommunityFeed';
import { LoginArea } from '@/components/auth/LoginArea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGratitudeEntries } from '@/hooks/useGratitudeEntries';
import {
  getAllDaysInYear,
  getDayOfYear,
  getTotalDaysInYear,
} from '@/lib/gratitudeUtils';
import { Calendar, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';
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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-[88px] sm:h-[96px] md:h-[104px]">
              {/* Left: Brand Block - Logo (Dominant) */}
              <div className="brand flex items-center py-6 sm:py-7 md:py-8">
                <Logo 
                  showText={false} 
                  size="header" 
                  className="flex-shrink-0"
                />
              </div>

              {/* Right: Navigation + Login (Reduced Visual Weight) */}
              <div className="flex items-center gap-3 sm:gap-4">
                {!isMobile && (
                  <TabsList className="bg-transparent border-0 shadow-none h-auto p-0 gap-1">
                    <TabsTrigger
                      value="calendar"
                      className="gap-2 text-sm data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">My Calendar</span>
                      <span className="lg:hidden">Calendar</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="community"
                      className="gap-2 text-sm data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">Community</span>
                      <span className="lg:hidden">Community</span>
                    </TabsTrigger>
                  </TabsList>
                )}
                <LoginArea className="max-w-48 sm:max-w-60" />
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Tabs */}
        {isMobile && (
          <div className="border-b border-amber-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4 sm:px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full bg-transparent border-0 shadow-none h-auto p-0 gap-1 justify-start">
                  <TabsTrigger
                    value="calendar"
                    className="flex-1 gap-2 text-sm data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                  >
                    <Calendar className="h-4 w-4" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger
                    value="community"
                    className="flex-1 gap-2 text-sm data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                  >
                    <Users className="h-4 w-4" />
                    Community
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Made with gratitude. Powered by Nostr 💜
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Tabs>
  );
}
