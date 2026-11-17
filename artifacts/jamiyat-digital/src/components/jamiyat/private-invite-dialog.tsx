import { Copy, Share2, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Circle } from '@/lib/circles';

export function PrivateInviteDialog({ circle, onClose }: { circle: Circle | null; onClose: () => void }) {
  const { toast } = useToast();
  const code = circle?.inviteCode;

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Invite code copied', description: 'This code only works in the browser where the circle was created.' });
    } catch {
      toast({ title: 'Copy the code shown below', description: code });
    }
  };

  const shareInvite = async () => {
    if (!circle || !code) return;
    const text = `Join ${circle.name} on Circle Pay with code ${code}. This demo code only works in the browser where the circle was created.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Circle Pay invite', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Invite details copied', description: 'The code is limited to this browser while cloud storage is off.' });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast({ title: 'Could not share the invite', description: `You can still share code ${code}.` });
    }
  };

  return (
    <Dialog open={Boolean(circle && code)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="rounded-3xl sm:max-w-md" data-testid="dialog-private-invite-created">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/10 text-tertiary">
            <UsersRound className="h-6 w-6" aria-hidden />
          </div>
          <DialogTitle className="text-xl">Your circle is ready to invite</DialogTitle>
          <DialogDescription>
            You can share this code, but circles are saved only in this browser while cloud storage is off.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border bg-muted/40 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Private invite code</p>
          <p className="mt-2 select-all font-mono text-2xl font-extrabold tracking-[0.16em] text-foreground" data-testid="text-created-invite-code">{code}</p>
          <p className="mt-2 text-xs text-muted-foreground">{circle?.months ? `${circle.months - 1} participant spots are available.` : ''}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={copyCode} className="h-11 rounded-xl" data-testid="button-created-copy-code">
            <Copy className="mr-2 h-4 w-4" /> Copy code
          </Button>
          <Button type="button" variant="outline" onClick={shareInvite} className="h-11 rounded-xl" data-testid="button-created-share-invite">
            <Share2 className="mr-2 h-4 w-4" /> Share invite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Invite codes from this browser won’t be available on another phone or computer until cloud sharing is restored.</p>
      </DialogContent>
    </Dialog>
  );
}
