import { IInvoice } from '../models/Invoice.js';
import { Invoice } from '../models/index.js';

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const COMPANY_NAME = 'Windows Tinting JD';
const COMPANY_PHONE = '786 793 4440';
const COMPANY_URL = 'https://tinting-film.com';

const PAPER_INFO: Record<string, { label: string; specs: string }> = {
  premium: {
    label: 'Premium Film',
    specs: 'Solar rejection: 40%, UV protection: 90%, Warranty: 6 months',
  },
  ceramic: {
    label: 'Ceramic Film',
    specs: 'Solar rejection: 70%, UV protection: 100%, Warranty: 5 years',
  },
  ultra_ceramic: {
    label: 'Ultra Ceramic Film',
    specs: 'Solar rejection: 98%, UV protection: 100%, Warranty: 10 years',
  },
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ESC/POS helpers
function cmd(...bytes: number[]): Buffer {
  return Buffer.from(bytes);
}

function str(s: string): Buffer {
  return Buffer.from(s, 'ascii');
}

function feed(n = 1): Buffer {
  return Buffer.from(Array(n).fill(LF));
}

function bold(on: boolean): Buffer {
  return cmd(ESC, 0x45, on ? 1 : 0);
}

function align(n: number): Buffer {
  return cmd(ESC, 0x61, n); // 0=left, 1=center, 2=right
}

function fontA(): Buffer {
  return cmd(ESC, 0x4D, 0x00);
}

function charSize(w: number, h: number): Buffer {
  const n = ((w & 7) << 4) | (h & 7);
  return cmd(GS, 0x21, n);
}

function divider(char = '-'): Buffer {
  return str(char.repeat(48));
}

function cut(): Buffer {
  return cmd(GS, 0x56, 0x00);
}

// QR Code via built-in ESC/POS QR commands (GS ( k)
function qrCode(data: string): Buffer {
  const dataBuf = str(data);
  const storeLen = dataBuf.length + 3;
  return Buffer.concat([
    cmd(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00), // Model 2
    cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04),       // Module size 4
    cmd(GS, 0x28, 0x6B, storeLen & 0xFF, (storeLen >> 8) & 0xFF, 0x31, 0x50, 0x30), // Store
    dataBuf,
    cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30),       // Print
  ]);
}

// Wrap text for fixed-width columns (Font A = 48 chars wide)
const LINE_W = 48;
const DESC_W = 36;
const PRICE_W = 12;

function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > width) {
    const breakPoint = remaining.lastIndexOf(' ', width);
    if (breakPoint < 1) {
      lines.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    } else {
      lines.push(remaining.slice(0, breakPoint));
      remaining = remaining.slice(breakPoint + 1);
    }
  }
  if (remaining.length > 0) lines.push(remaining);
  return lines;
}

function lineWithPrice(desc: string, price: string): Buffer {
  const lines = wrapText(desc, DESC_W);
  const parts: Buffer[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      parts.push(str(lines[i].padEnd(DESC_W) + price.padStart(PRICE_W)));
    } else {
      parts.push(str('  ' + lines[i]));
    }
    parts.push(feed());
  }
  return Buffer.concat(parts);
}

export async function generate(id: string): Promise<Buffer> {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw Object.assign(new Error('Factura no encontrada'), { status: 404 });
  }
  const parts: Buffer[] = [];

  // ── Initialize ──
  parts.push(cmd(ESC, 0x40));

  // ── Company header ──
  parts.push(align(1));
  parts.push(fontA());
  parts.push(bold(true));
  parts.push(charSize(1, 1));
  parts.push(str(COMPANY_NAME));
  parts.push(feed());
  parts.push(charSize(0, 0));
  parts.push(bold(false));
  parts.push(str('Mobile tinting service — we come to you'));
  parts.push(feed());
  parts.push(bold(true));
  parts.push(str(`Tel: ${COMPANY_PHONE}`));
  parts.push(feed(2));

  // ── Divider ──
  parts.push(divider());
  parts.push(feed());

  // ── Invoice title ──
  parts.push(align(1));
  parts.push(bold(true));
  parts.push(charSize(0, 1));
  parts.push(str('INVOICE'));
  parts.push(charSize(0, 0));
  parts.push(feed());
  parts.push(charSize(1, 1));
  parts.push(str(invoice.invoiceNumber));
  parts.push(charSize(0, 0));
  parts.push(feed());
  parts.push(bold(false));
  parts.push(str(`Date: ${formatDate(invoice.date)}`));
  parts.push(feed(2));

  // ── Divider ──
  parts.push(divider());
  parts.push(feed());

  // ── Client ──
  parts.push(align(0));
  parts.push(bold(true));
  parts.push(str('CUSTOMER'));
  parts.push(feed());
  parts.push(bold(false));
  parts.push(str(invoice.clientName));
  parts.push(feed(2));

  // ── Divider ──
  parts.push(align(0));
  parts.push(divider());
  parts.push(feed());

  // ── Table header ──
  parts.push(bold(true));
  parts.push(str('SERVICE'.padEnd(DESC_W) + 'AMOUNT'.padStart(PRICE_W)));
  parts.push(feed());
  parts.push(bold(false));

  // ── Items ──
  for (const item of invoice.items) {
    parts.push(bold(true));
    parts.push(lineWithPrice(item.description, formatMoney(item.amount)));
    parts.push(bold(false));

    if (item.date) {
      parts.push(str(`  Date: ${formatDate(new Date(item.date))}`));
      parts.push(feed());
    }

    if (item.paperTypes && item.paperTypes.length > 0) {
      for (const pt of item.paperTypes) {
        const info = PAPER_INFO[pt];
        if (info) {
          const paperText = `${info.label} — ${info.specs}`;
          const wrapped = wrapText(paperText, LINE_W - 2);
          for (const w of wrapped) {
            parts.push(str('  ' + w));
            parts.push(feed());
          }
        }
      }
    }
  }

  // ── Total ──
  parts.push(feed());
  parts.push(divider('='));
  parts.push(feed());
  parts.push(bold(true));
  parts.push(str('TOTAL'.padEnd(DESC_W) + formatMoney(invoice.total).padStart(PRICE_W)));
  parts.push(feed(2));

  // ── Divider ──
  parts.push(divider());
  parts.push(feed());

  // ── Warranty ──
  parts.push(bold(false));
  const warrantyText =
    'Warranty applies per the specifications listed above for each ' +
    'installed film type. This document certifies the completion of the ' +
    'safety film installation service.';
  const wrappedWarranty = wrapText(warrantyText, LINE_W);
  for (const w of wrappedWarranty) {
    parts.push(str(w));
    parts.push(feed());
  }
  parts.push(feed());

  // ── Footer ──
  parts.push(bold(false));
  const footerText = `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`;
  parts.push(str(footerText));
  parts.push(feed(2));

  // ── QR Code ──
  parts.push(align(1));
  parts.push(qrCode(COMPANY_URL));
  parts.push(feed(2));

  // ── Cut ──
  parts.push(cut());

  return Buffer.concat(parts);
}
