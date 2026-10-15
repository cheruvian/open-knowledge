import { Trans, useLingui } from '@lingui/react/macro';
import { useId, useState } from 'react';
import type { OkDesktopBridge } from '@/lib/desktop-bridge-types';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function RemoteWorkspaceDialog({
  open,
  onOpenChange,
  connect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connect: NonNullable<OkDesktopBridge['navigator']['openRemoteWorkspace']>;
}) {
  const { t } = useLingui();
  const inputId = useId();
  const errorId = useId();
  const [origin, setOrigin] = useState(
    () => localStorage.getItem('ok-remote-workspace-origin') ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await connect(origin);
      localStorage.setItem('ok-remote-workspace-origin', new URL(origin.trim()).origin);
      onOpenChange(false);
    } catch {
      setError(
        t`Could not connect. Use the server's HTTPS origin, check your private-network connection, and confirm the server is ready.`,
      );
    }
    setBusy(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Connect to existing server</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Open one shared workspace without cloning files or starting another server. Connect
              only to a server you trust.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <form
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor={inputId}>
              <Trans>Server HTTPS address</Trans>
            </Label>
            <Input
              id={inputId}
              type="url"
              required
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              disabled={busy}
              aria-invalid={error !== null}
              aria-describedby={error ? errorId : undefined}
              placeholder="https://knowledge.example.com"
            />
          </div>
          {error ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            <Trans>
              The server owns the files and agent configuration. Local terminals and filesystem
              access are unavailable in this connection.
            </Trans>
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={busy || !origin.trim()}>
              {busy ? <Trans>Connecting</Trans> : <Trans>Connect</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
