import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileDown, FileText, Pencil, LifeBuoy } from 'lucide-react';
import { InheritancePlanForm } from '@/components/inheritance-plan-form';
import { ReviewReminderPanel } from '@/components/review-reminder-panel';
import type { InheritancePlan } from '@/lib/inheritance-plan-types';

interface InheritancePlanViewerProps {
  plan: InheritancePlan;
  onSaveAsFile: () => void;
  onExportPdf?: () => void;
  onEditPlan?: (plan: InheritancePlan) => void;
}

export function InheritancePlanViewer({ plan, onSaveAsFile, onExportPdf, onEditPlan }: InheritancePlanViewerProps) {
  const sizeEstimate = useMemo(() => {
    const bytes = new TextEncoder().encode(JSON.stringify(plan)).length;
    return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
  }, [plan]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Decrypted Inheritance Plan</h3>
          <p className="text-xs text-muted-foreground">Plan size: {sizeEstimate} (raw JSON)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSaveAsFile}>
            <FileDown className="h-4 w-4 mr-2" />
            Save as File
          </Button>
          {onExportPdf && (
            <Button variant="outline" size="sm" onClick={onExportPdf}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
          {onEditPlan && (
            <Button size="sm" onClick={() => onEditPlan(plan)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit &amp; Re-encrypt
            </Button>
          )}
        </div>
      </div>

      <Alert className="border-accent [&>svg]:text-primary">
        <LifeBuoy className="h-4 w-4" />
        <AlertTitle>Standalone recovery tool</AlertTitle>
        <AlertDescription>
          If this app is ever unavailable, the Qards referenced in this plan can still be restored using a standalone recovery tool — a single HTML file that runs offline in any browser.
          <div className="mt-2 flex flex-col sm:flex-row gap-2 text-xs">
            <a href="https://github.com/seQRets/seQRets-Recover/releases/latest/download/recover.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
              Download recover.html (latest release)
            </a>
            <span className="hidden sm:inline text-muted-foreground">·</span>
            <a href="https://seqrets.github.io/seQRets-Recover/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
              Open hosted version
            </a>
          </div>
        </AlertDescription>
      </Alert>

      <Separator />

      <ReviewReminderPanel canMarkReviewed />

      <Separator />

      <InheritancePlanForm
        plan={plan}
        onChange={() => {}}
        readOnly
      />
    </div>
  );
}
