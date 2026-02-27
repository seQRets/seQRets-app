import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldOff } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <ShieldOff className="h-16 w-16 text-muted-foreground mb-6" strokeWidth={1.5} />
      <h1 className="font-body text-5xl font-black text-foreground tracking-tighter mb-2">
        404
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        This secret doesn't exist — or maybe it was never meant to be found.
      </p>
      <Button asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to seQRets
        </Link>
      </Button>
    </main>
  );
}
