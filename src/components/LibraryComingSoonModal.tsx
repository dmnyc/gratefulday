import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LibraryComingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryComingSoonModal({ open, onOpenChange }: LibraryComingSoonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            The Library is coming soon.
          </DialogTitle>
          <DialogDescription className="text-base pt-2 space-y-3">
            <p>
              Gratitude is more than a habit. Soon you'll be able to explore the ideas, teachings, and stories that give this practice roots.
            </p>
            <p>
              Check back soon.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

