/**
 * Prints the heir sheets (one page per person) and the blank password
 * letter as one letter-size PDF. The words come from @seqrets/crypto
 * (heirSheetPage / passwordLetterPage), where tests hold the rules on what
 * a sheet may say; this file only lays them out.
 */
import { jsPDF } from 'jspdf';
import { heirSheetPage, heirSheetsPdfFileName, lockerFileName, passwordLetterPage } from '@seqrets/crypto';
import type { LockerContent, PrintedPage } from '@seqrets/crypto';
import { loadLogoBase64 } from '@/lib/generate-plan-pdf';
import { PDF_FILTERS, saveFileNative } from '@/lib/native-save';

const PAGE_W = 215.9; // Letter, mm
const PAGE_H = 279.4;
const MARGIN_L = 22;
const MARGIN_R = 22;
const MARGIN_T = 24;
const MARGIN_B = 22;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const FOOTER_Y = PAGE_H - 13;
const LINE = 5.2;

const PRIMARY: [number, number, number] = [35, 31, 32];
const MUTED: [number, number, number] = [120, 113, 108];
const RULE: [number, number, number] = [170, 170, 170];

function footer(doc: jsPDF, text: string) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(text, PAGE_W / 2, FOOTER_Y, { align: 'center' });
}

/** Lays out one page; returns the y position after its last block. */
function drawPage(doc: jsPDF, page: PrintedPage, logo: string | null, footerText: string): number {
  let y = MARGIN_T;
  const breakIfNeeded = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_B) {
      footer(doc, footerText);
      doc.addPage();
      y = MARGIN_T;
    }
  };

  // Title, with the logo when it loads.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARY);
  const logoSize = 14;
  const titleW = doc.getTextWidth(page.title);
  if (logo) {
    const startX = (PAGE_W - (logoSize + 3 + titleW)) / 2;
    doc.addImage(logo, 'PNG', startX, y - 5, logoSize, logoSize);
    doc.text(page.title, startX + logoSize + 3, y + 4);
  } else {
    doc.text(page.title, PAGE_W / 2, y + 4, { align: 'center' });
  }
  y += 13;
  if (page.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    for (const line of doc.splitTextToSize(page.subtitle, CONTENT_W) as string[]) {
      doc.text(line, PAGE_W / 2, y, { align: 'center' });
      y += LINE;
    }
  }
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 9;

  for (const block of page.blocks) {
    breakIfNeeded(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PRIMARY);
    doc.text(block.heading, MARGIN_L, y);
    y += 6.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    block.items.forEach((item, i) => {
      const marker = block.list === 'numbered' ? `${i + 1}.` : block.list === 'bulleted' ? '•' : '';
      const indent = marker ? 6 : 0;
      const lines = doc.splitTextToSize(item, CONTENT_W - indent) as string[];
      lines.forEach((line, j) => {
        breakIfNeeded(LINE);
        if (j === 0 && marker) doc.text(marker, MARGIN_L + 1, y);
        doc.text(line, MARGIN_L + indent, y);
        y += LINE;
      });
      y += 1.5;
    });
    y += 3.5;
  }
  return y;
}

/** Build the PDF: a sheet for each person, then the blank password letter. */
export async function generateHeirSheetsPdf(args: {
  content: LockerContent;
  /** The Locker file's name as saved; defaults to the standard name. */
  fileName?: string;
  date?: string;
}): Promise<jsPDF> {
  const { content } = args;
  const fileName = args.fileName ?? lockerFileName(content.qards.setId);
  const date = args.date ?? new Date().toISOString().split('T')[0];
  const logo = await loadLogoBase64();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  content.heirSheets.recipients.forEach((recipient, i) => {
    if (i > 0) doc.addPage();
    const page = heirSheetPage({
      recipient,
      sheets: content.heirSheets,
      ownerName: content.plan.planInfo.preparedBy,
      requiredShares: content.qards.requiredShares,
      totalShares: content.qards.totalShares,
      lockerFileName: fileName,
      keyfileUsed: content.qards.keyfileUsed,
      date,
    });
    drawPage(doc, page, logo, 'seQRets heir sheet — keep this page apart from your Qard');
    footer(doc, 'seQRets heir sheet — keep this page apart from your Qard');
  });

  // The password letter: blank lines, filled in by hand.
  if (content.heirSheets.recipients.length > 0) doc.addPage();
  const letter = passwordLetterPage({ lockerFileName: fileName, keyfileUsed: content.qards.keyfileUsed });
  const letterFooter = 'seQRets password letter — write by hand, then seal';
  let y = drawPage(doc, letter, logo, letterFooter);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  for (const field of letter.fields) {
    const needed = 8 + field.lines * 11;
    if (y + needed > PAGE_H - MARGIN_B) { footer(doc, letterFooter); doc.addPage(); y = MARGIN_T; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PRIMARY);
    doc.text(`${field.label}:`, MARGIN_L, y);
    y += 3;
    for (let i = 0; i < field.lines; i++) {
      y += 11;
      doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    }
    y += 10;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  for (const line of letter.closing.flatMap((c) => doc.splitTextToSize(c, CONTENT_W) as string[])) {
    doc.text(line, MARGIN_L, y);
    y += LINE;
  }
  footer(doc, letterFooter);
  return doc;
}

/** Build and save the PDF with the native Save dialog. The saved path, or null if cancelled. */
export async function saveHeirSheetsPdf(content: LockerContent, fileName?: string): Promise<string | null> {
  const pdf = await generateHeirSheetsPdf({ content, fileName });
  return saveFileNative(heirSheetsPdfFileName(content.qards.setId), PDF_FILTERS, new Uint8Array(pdf.output('arraybuffer')));
}
