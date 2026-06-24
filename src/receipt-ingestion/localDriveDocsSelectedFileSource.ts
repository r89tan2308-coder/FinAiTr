import {
  type ISODateTimeString,
  type ReceiptDraftSourceKind,
} from "../domain/models";
import {
  type ReceiptTextCandidate,
  type ReceiptTextSourceReference,
} from "./types";
import { stableTextHash } from "./sourceTextHash";

export type LocalDriveDocsSelectedFileSourceKind = Extract<
  ReceiptDraftSourceKind,
  "google_drive" | "google_docs"
>;

export interface LocalDriveDocsSelectedFileInput {
  fileName: string;
  lastModified?: number;
  rawText: string;
  sourceKind: LocalDriveDocsSelectedFileSourceKind;
}

const localSelectedFileProviderName = "local-drive-docs-selected-file-provider";
const supportedSelectedFileExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".json",
]);

export function buildLocalDriveDocsSelectedFileCandidate(
  input: LocalDriveDocsSelectedFileInput,
): ReceiptTextCandidate {
  const fileName = normalizeFileName(input.fileName);
  const extension = getFileExtension(fileName);

  if (!supportedSelectedFileExtensions.has(extension)) {
    throw new Error(
      "Selected file type is not supported. Use .txt, .md, .html, or .json.",
    );
  }

  const normalizedText = normalizeSelectedFileText(input.rawText, extension);

  if (!normalizedText.trim()) {
    throw new Error("Selected file does not contain receipt-like text.");
  }

  const contentHash = stableTextHash(normalizedText);
  const importedAt = new Date().toISOString();
  const modifiedAt = formatLastModified(input.lastModified);
  const source: ReceiptTextSourceReference = {
    contentHash,
    fetchedAt: importedAt,
    kind: input.sourceKind,
    modifiedAt,
    sourceId: `local-selected-file-${contentHash}`,
    sourceProviderName: localSelectedFileProviderName,
    title: fileName,
  };

  return {
    detectedAt: importedAt,
    id: `${input.sourceKind}:${source.sourceId}`,
    rawText: normalizedText,
    source,
    warnings: buildSelectedFileWarnings(input.sourceKind, extension),
  };
}

export function isSupportedLocalDriveDocsSelectedFileName(
  fileName: string,
): boolean {
  return supportedSelectedFileExtensions.has(getFileExtension(fileName));
}

function normalizeSelectedFileText(rawText: string, extension: string): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();

  if (extension === ".html" || extension === ".htm") {
    return normalized
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  if (extension === ".json") {
    const parsed = JSON.parse(normalized) as unknown;
    const extractedText = extractTextFromJsonValue(parsed);

    return extractedText ?? JSON.stringify(parsed, null, 2);
  }

  return normalized;
}

function extractTextFromJsonValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const textValue =
    record.rawText ?? record.receiptText ?? record.text ?? record.content;

  return typeof textValue === "string" && textValue.trim()
    ? textValue.trim()
    : undefined;
}

function buildSelectedFileWarnings(
  sourceKind: LocalDriveDocsSelectedFileSourceKind,
  extension: string,
): string[] {
  const warnings = [
    `Local ${formatSourceKind(sourceKind)} selected-file prototype. No Google API was called.`,
  ];

  if (extension === ".html" || extension === ".htm") {
    warnings.push("HTML tags were stripped before local receipt extraction.");
  }

  if (extension === ".json") {
    warnings.push("JSON was parsed locally before receipt extraction.");
  }

  return warnings;
}

function normalizeFileName(value: string): string {
  const fileName = value.trim();

  if (!fileName) {
    throw new Error("Selected file name is required.");
  }

  return fileName;
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");

  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
}

function formatLastModified(
  value: number | undefined,
): ISODateTimeString | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatSourceKind(kind: LocalDriveDocsSelectedFileSourceKind): string {
  return kind
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
