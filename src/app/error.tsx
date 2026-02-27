'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive mb-6" strokeWidth={1.5} />
      <h1 className="font-body text-3xl font-black text-foreground tracking-tighter mb-2">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        An unexpected error occurred. Your secrets remain safe — all data stays on your device.
      </p>
      <Button onClick={reset}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </main>
  );
}
