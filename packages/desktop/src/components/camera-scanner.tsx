import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface CameraScannerProps {
  onScan: (data: string) => void;
}

export function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const { toast } = useToast();
  const animationFrameId = useRef<number>();

  useEffect(() => {
    let isComponentMounted = true;
    let stream: MediaStream | null = null;
    let scanning = false;

    // Create BarcodeDetector once if available (native Chromium API)
    const barcodeDetector = ('BarcodeDetector' in window)
      ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      : null;

    const tick = async () => {
        if (!isComponentMounted || scanning || !videoRef.current || !videoRef.current.srcObject || videoRef.current.paused || videoRef.current.ended) {
            if (isComponentMounted) animationFrameId.current = requestAnimationFrame(tick);
            return;
        }

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if(ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    scanning = true;
                    try {
                        let decoded: string | null = null;

                        // Strategy 1: Native BarcodeDetector (handles dense codes)
                        if (barcodeDetector) {
                            try {
                                const results = await barcodeDetector.detect(canvas);
                                if (results.length > 0) decoded = results[0].rawValue;
                            } catch (_) { /* fall through to jsQR */ }
                        }

                        // Strategy 2: jsQR fallback
                        if (!decoded) {
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'attemptBoth',
                            });
                            if (code?.data) decoded = code.data;
                        }

                        if (decoded) {
                            onScan(decoded);
                            scanning = false;
                            return; // Stop scanning once a code is found
                        }
                    } catch (e) {
                       console.error("Could not decode from canvas:", e);
                    }
                    scanning = false;
                }
            }
        }
        if (isComponentMounted) {
            animationFrameId.current = requestAnimationFrame(tick);
        }
    };

    const getCameraPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera access is not supported by your browser.");
        }

        // Prefer rear camera on mobile, fall back to any camera on desktop
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
        } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        // If component unmounted while awaiting camera, release immediately
        if (!isComponentMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
        } else {
            // Ref lost — release the stream to avoid locking the camera
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        setHasCameraPermission(true);
        animationFrameId.current = requestAnimationFrame(tick);
      } catch (error) {
        console.error('Error accessing camera:', error);
        if(isComponentMounted){
            setHasCameraPermission(false);
            const errorMessage = error instanceof Error ? error.message : 'Please enable camera permissions in your browser settings.';
            setScanError(errorMessage);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: errorMessage,
            });
        }
      }
    };

    getCameraPermission();

    return () => {
      isComponentMounted = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan, toast]);

  return (
    <div className="relative flex flex-col items-center justify-center">
        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {hasCameraPermission === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Requesting camera access...</p>
            </div>
        )}

        {hasCameraPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Alert variant="destructive" className="w-auto">
                    <AlertTitle>Camera Error</AlertTitle>
                    <AlertDescription>
                       {scanError || "Could not access camera."}
                    </AlertDescription>
                </Alert>
            </div>
        )}
    </div>
  );
}
