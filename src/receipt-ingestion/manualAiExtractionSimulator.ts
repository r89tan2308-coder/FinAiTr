import { parseReceiptText } from "../receipt-parser/parser";
import {
  type ReceiptExtractionCategoryHint,
  type ReceiptExtractionProvider,
  type ReceiptExtractionRequest,
  type ReceiptExtractionResult,
  type ReceiptTextCandidate,
  type ReceiptTextSourceKind,
  type ReceiptTextSourceReference,
} from "./types";

export interface ManualAiExtractionInput {
  rawText: string;
  sourceKind: ReceiptTextSourceKind;
  sourceTitle?: string;
  sourceSender?: string;
  sourceReceivedAt?: string;
}

export const mockAiReceiptExtractionProvider: ReceiptExtractionProvider = {
  providerName: "local-mock-ai-extractor",
  async extractReceiptDraft(
    request: ReceiptExtractionRequest,
  ): Promise<ReceiptExtractionResult> {
    const receiptText = extractReceiptEvidenceText(request.rawText);
    const parsedDraft = parseReceiptText(receiptText, {
      defaultCurrency: request.defaultCurrency,
    });

    return {
      draft: {
        confidence: clampConfidence(parsedDraft.confidence - 0.03),
        currency: parsedDraft.currency,
        items: parsedDraft.items.map((item) => ({
          categoryId: item.categoryId,
          confidence: clampConfidence(item.confidence - 0.02),
          flags: [...item.flags],
          kind: item.kind,
          normalizedName: item.normalizedName,
          quantity: item.quantity,
          rawLine: item.rawLine,
          rawName: item.rawName,
          tags: [...item.tags],
          totalPrice: item.totalPrice,
          unitPrice: item.unitPrice,
        })),
        merchantName: parsedDraft.merchantName,
        receiptDate: parsedDraft.receiptDate,
        totalAmount: parsedDraft.totalAmount,
        warnings: [
          `Simulated AI extraction from ${formatSourceKind(request.source.kind)}.`,
          ...parsedDraft.warnings,
        ],
      },
      extractedAt: new Date().toISOString(),
      modelName: "local-heuristic-simulator",
      providerName: this.providerName,
    };
  },
};

export function buildManualAiReceiptCandidate(
  input: ManualAiExtractionInput,
): ReceiptTextCandidate {
  const rawText = input.rawText.trim();

  if (!rawText) {
    throw new Error("Receipt source text is required for AI extraction.");
  }

  const source: ReceiptTextSourceReference = {
    kind: input.sourceKind,
    receivedAt:
      normalizeOptionalText(input.sourceReceivedAt) ??
      normalizeOptionalText(readHeaderValue(rawText, ["date", "received"])),
    sender:
      normalizeOptionalText(input.sourceSender) ??
      normalizeOptionalText(readHeaderValue(rawText, ["from", "sender"])),
    sourceId: createCandidateId(rawText, input.sourceKind),
    title:
      normalizeOptionalText(input.sourceTitle) ??
      normalizeOptionalText(readHeaderValue(rawText, ["subject", "title"])),
  };

  return {
    detectedAt: new Date().toISOString(),
    id: source.sourceId ?? createCandidateId(rawText, input.sourceKind),
    rawText,
    source,
    warnings: [],
  };
}

export function buildReceiptExtractionRequest(
  candidate: ReceiptTextCandidate,
  categoryHints: ReceiptExtractionCategoryHint[],
): ReceiptExtractionRequest {
  return {
    categoryHints,
    defaultCurrency: "USD",
    rawText: candidate.rawText,
    source: candidate.source,
  };
}

export function extractReceiptEvidenceText(rawText: string): string {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const firstBlankIndex = lines.findIndex((line) => line.trim() === "");
  const candidateLines =
    firstBlankIndex >= 0 ? lines.slice(firstBlankIndex + 1) : lines;
  const evidenceLines = candidateLines
    .map((line) => line.trim())
    .filter((line) => line && !isSourceMetadataLine(line));

  if (evidenceLines.length === 0) {
    throw new Error("Receipt-like content could not be found in the source text.");
  }

  return evidenceLines.join("\n");
}

function readHeaderValue(rawText: string, names: string[]): string | undefined {
  const lowerNames = new Set(names.map((name) => name.toLowerCase()));

  for (const line of rawText.replace(/\r\n/g, "\n").split("\n")) {
    const [label, ...valueParts] = line.split(":");

    if (!label || valueParts.length === 0) {
      continue;
    }

    if (lowerNames.has(label.trim().toLowerCase())) {
      const value = valueParts.join(":").trim();
      return value || undefined;
    }
  }

  return undefined;
}

function isSourceMetadataLine(line: string): boolean {
  return /^(from|sender|to|subject|title|date|received|source):\s*/i.test(line);
}

function createCandidateId(rawText: string, sourceKind: string): string {
  let hash = 0;

  for (let index = 0; index < rawText.length; index += 1) {
    hash = (hash * 31 + rawText.charCodeAt(index)) >>> 0;
  }

  return `mock-ai-${sourceKind}-${hash.toString(16)}`;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function formatSourceKind(kind: ReceiptTextSourceKind): string {
  return kind
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
