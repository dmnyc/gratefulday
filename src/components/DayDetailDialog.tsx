import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Sparkles, Share2 } from 'lucide-react';
import type { DayInfo } from '@/lib/gratitudeUtils';
import { getQuoteForDay, getAffirmationForDay, formatDisplayDate } from '@/lib/gratitudeUtils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useGratitudeEntry } from '@/hooks/useGratitudeEntries';
import { useToast } from '@/hooks/useToast';
import LoginDialog from './auth/LoginDialog';

interface DayDetailDialogProps {
  day: DayInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DayDetailDialog({ day, open, onOpenChange }: DayDetailDialogProps) {
  const [gratitudeText, setGratitudeText] = useState('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { mutate: publishNote, isPending: isPublishingNote } = useNostrPublish();
  const { toast } = useToast();

  // Fetch existing entry for this day
  const { data: existingEntry, refetch } = useGratitudeEntry(
    user?.pubkey,
    day?.dateString || ''
  );

  // Update local state when existing entry loads
  useEffect(() => {
    if (existingEntry) {
      setGratitudeText(existingEntry.content);
    } else {
      setGratitudeText('');
    }
  }, [existingEntry, day]);

  if (!day) return null;

  const quote = getQuoteForDay(day.dayOfYear);
  const affirmation = getAffirmationForDay(day.dayOfYear);
  const isPastDay = day.isPast;

  const handleSave = () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    if (!gratitudeText.trim()) {
      toast({
        title: 'Empty entry',
        description: 'Please write something before saving.',
        variant: 'destructive',
      });
      return;
    }

    const timestamp = Math.floor(day.date.getTime() / 1000);

    createEvent(
      {
        kind: 36669,
        content: gratitudeText.trim(),
        tags: [
          ['d', day.dateString],
          ['published_at', String(timestamp)],
          ['day', String(day.dayOfYear)],
          ['alt', `Daily reflection entry for ${formatDisplayDate(day.date)} (Day ${day.dayOfYear})`],
        ],
      },
      {
        onSuccess: () => {
          toast({
            title: 'Reflection saved! ✨',
            description: 'Your reflection has been recorded.',
          });
          refetch();
        },
        onError: (error) => {
          toast({
            title: 'Failed to save',
            description: error.message || 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleShareToNostr = () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    if (!gratitudeText.trim()) {
      toast({
        title: 'No reflection to share',
        description: 'Please save your reflection first before sharing.',
        variant: 'destructive',
      });
      return;
    }

    // Format the content for the kind 1 note
    const noteContent = `📅 Day ${day.dayOfYear} of 365 - ${formatDisplayDate(day.date)}

✨ Daily Wisdom:
"${quote.text}"
— ${quote.author}

💫 Daily Affirmation:
"${affirmation}"

🙏 My Reflection:
${gratitudeText.trim()}

#gratefulday #gratefuldayspace`;

    publishNote(
      {
        kind: 1,
        content: noteContent,
        tags: [
          ['t', 'gratefulday'],
          ['t', 'gratefuldayspace'],
          ['d', day.dateString],
          ['day', String(day.dayOfYear)],
        ],
      },
      {
        onSuccess: () => {
          toast({
            title: 'Shared to Nostr! 🌟',
            description: 'Your reflection has been posted to gratefulday.space.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to share',
            description: error.message || 'Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const canShare = gratitudeText.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Day {day.dayOfYear} of 365
            </DialogTitle>
            <DialogDescription className="text-base">
              {formatDisplayDate(day.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quote Section */}
            <div className="p-6 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Daily Wisdom
                  </p>
                  <p className="text-base italic text-amber-800 dark:text-amber-200">
                    "{quote.text}"
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    — {quote.author}
                  </p>
                </div>
              </div>
            </div>

            {/* Affirmation Section */}
            <div className="p-5 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-100 mb-2">
                Daily Affirmation
              </p>
              <p className="text-base italic text-rose-800 dark:text-rose-200">
                "{affirmation}"
              </p>
            </div>

            {/* Gratitude Entry */}
            {isPastDay ? (
              /* Past Day - Read Only View */
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-2">
                        {existingEntry ? 'Your Reflection' : 'No Reflection'}
                      </p>
                      {existingEntry ? (
                        <div className="space-y-2">
                          <p className="text-base text-foreground whitespace-pre-wrap break-words">
                            {gratitudeText}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last updated: {new Date(existingEntry.created_at * 1000).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No reflection was recorded for this day.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Today - Editable */
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">
                  Your Reflection
                  {!user && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Login to save)
                    </span>
                  )}
                </label>
                <Textarea
                  placeholder="What are you grateful for today? Write your thoughts here..."
                  value={gratitudeText}
                  onChange={(e) => setGratitudeText(e.target.value)}
                  rows={6}
                  className="resize-none text-base"
                />
                <p className="text-xs text-muted-foreground">
                  {gratitudeText.length} characters
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {isPastDay ? (
              /* Past Day - Only Close Button */
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              /* Today - Full Action Buttons */
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-initial"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isPending || !gratitudeText.trim()}
                    className="min-w-[100px]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                {canShare && (
                  <Button
                    onClick={handleShareToNostr}
                    disabled={isPublishingNote}
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                  >
                    {isPublishingNote ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share to Nostr
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={() => {
          setShowLoginDialog(false);
          toast({
            title: 'Welcome! 👋',
            description: 'You can now save your reflections.',
          });
        }}
      />
    </>
  );
}
