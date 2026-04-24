import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, WifiOff, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Header } from '@/components/header';
import { AppFooter } from '@/components/app-footer';

type Props = { url: string; title: string };

export function OfflineRedirect({ url, title }: Props) {
    const [status, setStatus] = useState<'pending' | 'opened' | 'offline'>('pending');

    useEffect(() => {
        if (navigator.onLine) {
            void openUrl(url);
            setStatus('opened');
        } else {
            setStatus('offline');
        }
    }, [url]);

    const reopen = () => {
        if (navigator.onLine) {
            void openUrl(url);
            setStatus('opened');
        } else {
            setStatus('offline');
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
            <div className="w-full max-w-2xl mx-auto relative">
                <div className="absolute top-4 left-4 z-50">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to App
                        </Link>
                    </Button>
                </div>
                <Header />

                <div className="text-center mb-10 pt-16 sm:pt-0">
                    <h1 className="font-body text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-2">
                        {title}
                    </h1>
                </div>

                <Card>
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        {status === 'offline' ? (
                            <>
                                <WifiOff className="h-10 w-10 text-primary mx-auto" />
                                <h2 className="text-lg font-semibold text-foreground">You're offline</h2>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Our {title.toLowerCase()} lives on our website. Reconnect to the internet and try again, or visit the URL below from any device:
                                </p>
                                <p className="font-mono text-sm text-foreground break-all bg-muted/40 rounded-md px-3 py-2 inline-block">
                                    {url}
                                </p>
                                <div className="pt-2">
                                    <Button variant="outline" size="sm" onClick={reopen}>
                                        Try again
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <ExternalLink className="h-10 w-10 text-primary mx-auto" />
                                <h2 className="text-lg font-semibold text-foreground">Opened in your browser</h2>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Our {title.toLowerCase()} opened in your default browser. If it didn't, click below.
                                </p>
                                <Button size="sm" onClick={reopen}>
                                    Open {title}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <AppFooter />
            </div>
        </main>
    );
}
