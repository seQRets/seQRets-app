import { useEffect } from 'react';
import { Info, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createHeirSheetRecipient } from '@seqrets/crypto';
import type { HeirSheetRecipient, HeirSheets } from '@seqrets/crypto';

interface HeirSheetsPanelProps {
  heirSheets: HeirSheets;
  onChange: (next: HeirSheets) => void;
  /** How many Qards the set has (the choices for "Holds"). */
  totalShares: number;
  /** Names from the People section, offered as quick adds. */
  peopleNames: string[];
  /** Where the Locker file is saved now, in words for the family; null if unknown. */
  suggestedLocation: string | null;
}

// Radix Select can't represent null as an item value.
const NO_QARD = 'none';

export function HeirSheetsPanel({ heirSheets, onChange, totalShares, peopleNames, suggestedLocation }: HeirSheetsPanelProps) {
  const { recipients, lockerLocation, passwordLetterLocation } = heirSheets;

  // Fill in where the Locker is the first time it's known; the owner can reword it.
  useEffect(() => {
    if (suggestedLocation && !lockerLocation) onChange({ ...heirSheets, lockerLocation: suggestedLocation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedLocation]);

  const setRecipients = (next: HeirSheetRecipient[]) => onChange({ ...heirSheets, recipients: next });
  const updateRecipient = (id: string, patch: Partial<HeirSheetRecipient>) =>
    setRecipients(recipients.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const listed = new Set(recipients.map((r) => r.name.trim().toLowerCase()));
  const quickAdds = [...new Set(peopleNames.map((n) => n.trim()).filter(Boolean))]
    .filter((n) => !listed.has(n.toLowerCase()));

  const qardCounts = new Map<number, number>();
  for (const r of recipients) if (r.qardNumber) qardCounts.set(r.qardNumber, (qardCounts.get(r.qardNumber) ?? 0) + 1);
  const shared = [...qardCounts].filter(([, n]) => n > 1).map(([q]) => `#${q}`);

  return (
    <div className="space-y-5 rounded-md border p-4">
      <div className="flex items-start gap-2 p-3 rounded-md bg-muted border border-border text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
        <span>
          An heir sheet is one printed page for each family member, kept apart from their Qard. It tells them how to open this Locker. A sheet opens nothing on its own: it never names the other people who hold Qards, never says where any Qard is, and never shows a password, seed or PIN.
        </span>
      </div>

      <div className="space-y-1.5">
        <Label>Where the Locker file is</Label>
        <Textarea
          value={lockerLocation}
          onChange={(e) => onChange({ ...heirSheets, lockerLocation: e.target.value })}
          placeholder='e.g., In my iCloud Drive, in the "seQRets" folder. A copy is on a USB drive with our attorney.'
          className="text-sm min-h-[60px]"
        />
        {suggestedLocation && lockerLocation.trim() !== suggestedLocation && (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onChange({ ...heirSheets, lockerLocation: suggestedLocation })}>
            Use where it&apos;s saved now: {suggestedLocation}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Your family must be able to reach this file before they can open the Locker, so a login kept inside the Locker won&apos;t help them. Share the folder with them, or keep a copy where they can get it, such as a USB drive with your attorney.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Where the password letter is</Label>
        <Input
          value={passwordLetterLocation}
          onChange={(e) => onChange({ ...heirSheets, passwordLetterLocation: e.target.value })}
          placeholder="e.g., A sealed envelope with our attorney, Jane Doe"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          The sealed letter holds the password, and the PIN of any smart card. Never write the password here: this line is printed on every sheet.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Who gets a sheet</Label>
        {recipients.length === 0 && (
          <p className="text-sm text-muted-foreground">No one yet. Add each person who holds a Qard, and anyone else who should know how to open the Locker.</p>
        )}
        {recipients.map((r) => (
          <div key={r.id} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={r.name} onChange={(e) => updateRecipient(r.id, { name: e.target.value })} placeholder="Name" className="text-sm" />
            </div>
            <div className="w-40 space-y-1">
              <Label className="text-xs">Holds</Label>
              <Select
                value={r.qardNumber ? String(r.qardNumber) : NO_QARD}
                onValueChange={(v) => updateRecipient(r.id, { qardNumber: v === NO_QARD ? null : Number(v) })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalShares }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Qard #{i + 1}</SelectItem>
                  ))}
                  <SelectItem value={NO_QARD}>No Qard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost" size="icon" aria-label={`Remove ${r.name || 'this person'}`}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => setRecipients(recipients.filter((x) => x.id !== r.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {shared.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
            <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Qard {shared.join(', ')} is listed for more than one person. Each Qard is usually held by one person.</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {quickAdds.map((name) => (
            <Button key={name} variant="outline" size="sm" onClick={() => setRecipients([...recipients, createHeirSheetRecipient(name)])}>
              <Plus className="h-4 w-4 mr-1" /> {name}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setRecipients([...recipients, createHeirSheetRecipient()])}>
            <Plus className="h-4 w-4 mr-1" /> Add a Person
          </Button>
        </div>
      </div>
    </div>
  );
}
