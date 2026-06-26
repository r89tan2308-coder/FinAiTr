import { type ISODateTimeString } from "../domain/models";
import {
  type ReceiptTextCandidate,
  type ReceiptTextSourceReference,
} from "./types";
import { stableTextHash } from "./sourceTextHash";

export interface LocalGmailManualReceiptInput {
  rawText: string;
  sourceReceivedAt?: string;
  sourceSender?: string;
  sourceSubject?: string;
}

const localGmailManualProviderName = "local-gmail-manual-import-provider";
const supportedEmailFileExtensions = new Set([".eml", ".txt"]);

export function buildLocalGmailManualReceiptCandidate(
  input: LocalGmailManualReceiptInput,
): ReceiptTextCandidate {
  const rawText = normalizeEmailText(input.rawText);

  if (!rawText.trim()) {
    throw new Error("Gmail receipt text is required.");
  }

  const headers = readEmailHeaders(rawText);
  const sender =
    normalizeOptionalText(input.sourceSender) ??
    normalizeOptionalText(headers.get("from"));
  const title =
    normalizeOptionalText(input.sourceSubject) ??
    normalizeOptionalText(headers.get("subject"));
  const receivedAt = normalizeOptionalDateTime(
    input.sourceReceivedAt,
    "Gmail received date",
  ) ?? normalizeOptionalDateTime(
    headers.get("date") ?? headers.get("received"),
    "Gmail received date",
    { allowInvalidAsMissing: true },
  );
  const contentHash = stableTextHash(rawText);
  const importedAt = new Date().toISOString();
  const headerMessageId = normalizeMessageId(headers.get("message-id"));
  const sourceId = headerMessageId ?? `local-gmail-message-${contentHash}`;
  const source: ReceiptTextSourceReference = {
    contentHash,
    fetchedAt: importedAt,
    kind: "gmail",
    receivedAt,
    sender,
    sourceId,
    sourceProviderName: localGmailManualProviderName,
    title,
  };

  return {
    detectedAt: importedAt,
    id: `gmail:${sourceId}`,
    rawText,
    source,
    warnings: buildLocalGmailWarnings({ receivedAt, sender, title }),
  };
}

export function isSupportedLocalGmailEmailFileName(fileName: string): boolean {
  return supportedEmailFileExtensions.has(getFileExtension(fileName));
}

function normalizeEmailText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function readEmailHeaders(rawText: string): Map<string, string> {
  const headers = new Map<string, string>();
  const lines = rawText.split("\n");
  let activeHeaderName: string | undefined;

  for (const line of lines) {
    if (!line.trim()) {
      break;
    }

    if (/^\s/.test(line) && activeHeaderName) {
      headers.set(activeHeaderName, `${headers.get(activeHeaderName) ?? ""} ${line.trim()}`);
      continue;
    }

    const separatorIndex = line.indexOf(":");

    if (separatorIndex <= 0) {
      break;
    }

    const headerName = line.slice(0, separatorIndex).trim().toLowerCase();
    const headerValue = line.slice(separatorIndex + 1).trim();

    if (headerName) {
      headers.set(headerName, headerValue);
      activeHeaderName = headerName;
    }
  }

  return headers;
}

function normalizeOptionalDateTime(
  value: string | undefined,
  label: string,
  options: { allowInvalidAsMissing?: boolean } = {},
): ISODateTimeString | undefined {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    if (options.allowInvalidAsMissing) {
      return undefined;
    }

    throw new Error(`${label} must be a valid date or ISO timestamp.`);
  }

  return parsed.toISOString();
}

function normalizeMessageId(value: string | undefined): string | undefined {
  const normalized = normalizeOptionalText(value)
    ?.replace(/^<|>$/g, "")
    .replace(/[^\w.@-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized ? `local-gmail-message-${normalized}` : undefined;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function buildLocalGmailWarnings(metadata: {
  receivedAt?: string;
  sender?: string;
  title?: string;
}): string[] {
  const warnings = [
    "Local Gmail manual import prototype. No Gmail API or OAuth was called.",
  ];

  if (!metadata.sender) {
    warnings.push("Gmail sender metadata was not provided or detected.");
  }

  if (!metadata.title) {
    warnings.push("Gmail subject metadata was not provided or detected.");
  }

  if (!metadata.receivedAt) {
    warnings.push("Gmail received date metadata was not provided or detected.");
  }

  return warnings;
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.trim().lastIndexOf(".");

  return lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
}
