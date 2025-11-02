import type { Env } from "../env";
import { nowISO } from "../utils";
import type { CommissioningRunRecord } from "./commissioning-store";

const encoder = new TextEncoder();

const REPORT_KEY_PREFIX = "reports/commissioning/";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const PDF_LINE_HEIGHT = 18;

interface PdfLayoutContext {
  cursorX: number;
  cursorY: number;
  commands: string[];
  lineHeight: number;
}

function escapePdfText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
}

function wrapText(text: string, maxWidth = 88): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text.slice(0, maxWidth)];
}

function appendLine(layout: PdfLayoutContext, text: string) {
  layout.commands.push(`(${escapePdfText(text)}) Tj`);
  layout.cursorY -= layout.lineHeight;
  layout.commands.push(`0 -${layout.lineHeight} Td`);
}

function buildContent(run: CommissioningRunRecord, generatedAt: string): string {
  const lines: string[] = [];
  lines.push("Commissioning Run Report");
  lines.push(`Run ID: ${run.run_id}`);
  lines.push(`Device: ${run.device_id}`);
  lines.push(`Profile: ${run.profile_id ?? "n/a"}`);
  lines.push(`Status: ${run.status}`);
  lines.push(`Started: ${run.started_at}`);
  lines.push(`Completed: ${run.completed_at ?? "n/a"}`);
  lines.push(`Performed By: ${run.performed_by ?? "n/a"}`);
  lines.push(`Generated: ${generatedAt}`);

  if (run.notes) {
    lines.push("");
    lines.push("Notes:");
    const noteLines = wrapText(run.notes);
    for (const line of noteLines) {
      lines.push(`• ${line}`);
    }
  }

  if (Array.isArray(run.checklist) && run.checklist.length) {
    lines.push("");
    lines.push("Checklist:");
    for (const item of run.checklist) {
      lines.push(`- ${item}`);
    }
  }

  const layout: PdfLayoutContext = {
    cursorX: 72,
    cursorY: 720,
    commands: ["BT", "/F1 12 Tf", "72 720 Td"],
    lineHeight: PDF_LINE_HEIGHT,
  };

  for (const line of lines) {
    appendLine(layout, line || " ");
  }

  layout.commands.push("ET");
  return layout.commands.join("\n");
}

function assemblePdf(streamContent: string): Uint8Array {
  const streamBytes = encoder.encode(streamContent);
  const objects: string[] = [];

  objects[1] = `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`;

  objects[2] = `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`;

  objects[3] = `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
`;

  objects[4] = `4 0 obj
<< /Length ${streamBytes.length} >>
stream
${streamContent}
endstream
endobj
`;

  objects[5] = `5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`;

  const header = "%PDF-1.4\n%âãÏÓ\n";
  let position = header.length;
  const offsets: number[] = [0];
  let body = header;

  for (let i = 1; i <= 5; i++) {
    const obj = objects[i];
    offsets[i] = position;
    body += obj;
    position += obj.length;
  }

  const xrefStart = position;
  let xref = `xref
0 6
0000000000 65535 f 
`;
  for (let i = 1; i <= 5; i++) {
    xref += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefStart}
%%EOF
`;

  const pdfString = body + xref + trailer;
  return encoder.encode(pdfString);
}

async function signReportUrl(env: Env, key: string, method: string, ttlSeconds: number): Promise<string | null> {
  if (!env.APP_BASE_URL || !env.ASSET_SIGNING_SECRET) {
    return null;
  }

  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const canonicalMethod = method.toUpperCase();
  const payload = `${canonicalMethod}\n${key}\n${expires}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.ASSET_SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const signature = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const url = new URL(`/r2/${key}`, env.APP_BASE_URL);
  url.searchParams.set("exp", String(expires));
  url.searchParams.set("sig", signature);
  return url.toString();
}

export interface ReportGenerationResult {
  key: string;
  url: string | null;
  generated_at: string;
}

export async function generateCommissioningReport(
  env: Env,
  run: CommissioningRunRecord,
  options: { keyPrefix?: string; expiresInSeconds?: number } = {},
): Promise<ReportGenerationResult | null> {
  const bucket = env.GB_BUCKET ?? env.APP_STATIC;
  if (!bucket) {
    return null;
  }

  const generatedAt = nowISO();
  const streamContent = buildContent(run, generatedAt);
  const pdfBytes = assemblePdf(streamContent);
  const key = `${options.keyPrefix ?? REPORT_KEY_PREFIX}${run.run_id}.pdf`;

  await bucket.put(key, pdfBytes, {
    httpMetadata: { contentType: "application/pdf" },
  });

  let url = await signReportUrl(env, key, "GET", options.expiresInSeconds ?? DEFAULT_TTL_SECONDS);
  if (!url && env.APP_BASE_URL) {
    url = new URL(`/r2/${key}`, env.APP_BASE_URL).toString();
  }
  return { key, url, generated_at: generatedAt };
}
