import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileDown, FileText, Pencil } from 'lucide-react';
import { InheritancePlanForm } from '@/components/inheritance-plan-form';
import { ReviewReminderPanel } from '@/components/review-reminder-panel';
import type { InheritancePlan } from '@seqrets/crypto';

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
