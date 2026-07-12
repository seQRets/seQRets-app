
'use client';

import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useToast } from './use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera } from 'lucide-react';

interface CameraScannerProps {
  onScan: (data: string) => void;
}

const CAMERA_PREF_KEY = 'seQRets_cameraDeviceId';

export function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(CAMERA_PREF_KEY); } catch { return null; }
  });
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

    const startStream = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera access is not supported by your browser.");
        }

        // Build constraints based on selection.
        // If user has picked a specific camera, request it exactly.
        // Otherwise prefer rear-facing on mobile, fall back to any camera.
        const constraints: MediaStreamConstraints = selectedDeviceId
          ? { video: { deviceId: { exact: selectedDeviceId } } }
          : { video: { facingMode: { ideal: 'environment' } } };

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            // Preferred camera unavailable — clear stale preference and grab whatever's there.
            if (selectedDeviceId) {
                try { localStorage.removeItem(CAMERA_PREF_KEY); } catch { /* ignore */ }
                if (isComponentMounted) setSelectedDeviceId(null);
            }
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

        // Now that permission is granted, enumerate available cameras
        // (labels are only populated after a successful getUserMedia).
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = all.filter(d => d.kind === 'videoinput');
            if (isComponentMounted) setDevices(videoInputs);
        } catch { /* enumerate is best-effort */ }

        // Record which device the stream is actually using (for the picker UI).
        const trackSettings = stream.getVideoTracks()[0]?.getSettings();
        if (trackSettings?.deviceId && isComponentMounted) {
            setActiveDeviceId(trackSettings.deviceId);
        }

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

    startStream();

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
  }, [onScan, toast, selectedDeviceId]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try { localStorage.setItem(CAMERA_PREF_KEY, deviceId); } catch { /* ignore */ }
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-2">
        {devices.length > 1 && (
            <div className="flex items-center gap-2 w-full">
                <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={selectedDeviceId ?? activeDeviceId ?? undefined} onValueChange={handleDeviceChange}>
                    <SelectTrigger className="w-full" aria-label="Choose camera">
                        <SelectValue placeholder="Choose camera" />
                    </SelectTrigger>
                    <SelectContent>
                        {devices.map((d, i) => (
                            <SelectItem key={d.deviceId || `cam-${i}`} value={d.deviceId}>
                                {d.label || `Camera ${i + 1}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
        <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted object-contain" autoPlay playsInline muted aria-label="Camera feed for QR code scanning" />
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
