import {
  type ISODateTimeString,
  type Receipt,
  type ReceiptDraft,
  type ReceiptDraftSourceKind,
  type ReceiptDraftSourceMetadata,
  type ReceiptSource,
} from "../domain/models";

export type ReceiptSourceProviderUxKey =
  | "manual_paste"
  | "manual_ai"
  | "local_gmail"
  | "local_drive_docs"
  | "mock_google";

export interface ReceiptSourceProviderUxEntry {
  readonly detail: string;
  readonly key: ReceiptSourceProviderUxKey;
  readonly label: string;
  readonly sourceKinds: readonly ReceiptDraftSourceKind[];
  readonly statusLabel: string;
}

export interface ReceiptSourceIdentity {
  readonly contentHash?: string;
  readonly kind: ReceiptDraftSourceKind;
  readonly sourceId?: string;
}

export interface ReceiptSourceDuplicateStatus {
  readonly label: string;
  readonly state: "confirmed_match" | "draft_match" | "not_found" | "untracked";
}

export interface ReceiptSourceMetadataView {
  readonly actorLabel: string;
  readonly duplicateStatusLabel: string;
  readonly importedAtLabel: string;
  readonly modelLabel?: string;
  readonly providerLabel?: string;
  readonly sourceIdLabel?: string;
  readonly sourceTitle: string;
  readonly sourceTypeLabel: string;
}

export const receiptSourceProviderUxEntries: readonly ReceiptSourceProviderUxEntry[] =
  [
    {
      detail: "Local text parser for receipts you paste by hand.",
      key: "manual_paste",
      label: "Manual paste",
      sourceKinds: ["manual_paste"],
      statusLabel: "Local parser",
    },
    {
      detail: "Local mock extraction from pasted email or document text.",
      key: "manual_ai",
      label: "AI simulator",
      sourceKinds: ["manual_paste", "gmail", "google_drive", "google_docs"],
      statusLabel: "Local mock AI",
    },
    {
      detail: "Local Gmail-like paste or .eml/.txt file import.",
      key: "local_gmail",
      label: "Local Gmail",
      sourceKinds: ["gmail"],
      statusLabel: "Local file/text",
    },
    {
      detail: "Local selected text-like file import for Drive/Docs-like receipts.",
      key: "local_drive_docs",
      label: "Local Drive/Docs",
      sourceKinds: ["google_drive", "google_docs"],
      statusLabel: "Local file",
    },
    {
      detail: "Bundled Gmail, Drive, and Docs samples for source-provider QA.",
      key: "mock_google",
      label: "Mock Google",
      sourceKinds: ["gmail", "google_drive", "google_docs"],
      statusLabel: "Mock samples",
    },
  ];

export function buildReceiptSourceMetadataView(input: {
  readonly createdAt?: ISODateTimeString;
  readonly merchant?: string;
  readonly metadata?: ReceiptDraftSourceMetadata;
  readonly receiptSource?: ReceiptSource;
}): ReceiptSourceMetadataView {
  const { createdAt, merchant, metadata, receiptSource } = input;
  const sourceTypeLabel = metadata
    ? formatReceiptSourceKindLabel(metadata.kind)
    : formatReceiptSourceLabel(receiptSource);
  const sourceTitle =
    metadata?.title ??
    merchant ??
    (metadata ? `${sourceTypeLabel} receipt source` : "Pasted receipt text");
  const importedAt =
    metadata?.fetchedAt ?? metadata?.extractedAt ?? createdAt ?? undefined;

  return {
    actorLabel: formatSourceActorLabel(metadata),
    duplicateStatusLabel: formatDuplicateTrackingLabel(metadata),
    importedAtLabel: importedAt ? `Imported ${importedAt}` : "Import date unavailable",
    modelLabel: metadata?.modelName ? `Model ${metadata.modelName}` : undefined,
    providerLabel: formatProviderLabel(metadata),
    sourceIdLabel: metadata?.sourceId,
    sourceTitle,
    sourceTypeLabel,
  };
}

export function formatReceiptSourceKindLabel(
  kind: ReceiptDraftSourceKind,
): string {
  switch (kind) {
    case "gmail":
      return "Gmail";
    case "google_docs":
      return "Google Docs";
    case "google_drive":
      return "Google Drive";
    case "manual_paste":
      return "Manual paste";
  }
}

export function getReceiptSourceDuplicateStatus(
  identity: ReceiptSourceIdentity,
  existing: {
    readonly receiptDrafts: readonly ReceiptDraft[];
    readonly receipts: readonly Receipt[];
  },
): ReceiptSourceDuplicateStatus {
  if (!identity.sourceId && !identity.contentHash) {
    return {
      label: "Duplicate check: unavailable",
      state: "untracked",
    };
  }

  const draftMatch = existing.receiptDrafts.find((draft) =>
    isMatchingSourceIdentity(draft.sourceMetadata, identity),
  );

  if (draftMatch) {
    return {
      label: `Duplicate: saved draft ${draftMatch.merchant ?? draftMatch.id}`,
      state: "draft_match",
    };
  }

  const receiptMatch = existing.receipts.find((receipt) =>
    isMatchingSourceIdentity(receipt.sourceMetadata, identity),
  );

  if (receiptMatch) {
    return {
      label: `Duplicate: confirmed receipt ${receiptMatch.merchant ?? receiptMatch.id}`,
      state: "confirmed_match",
    };
  }

  return {
    label: "Duplicate check: no local match",
    state: "not_found",
  };
}

function formatReceiptSourceLabel(source: ReceiptSource | undefined): string {
  switch (source) {
    case "ai_extraction_mock":
      return "AI extraction";
    case "manual_upload_mock":
      return "Manual upload";
    case "pasted_text":
    default:
      return "Manual paste";
  }
}

function formatSourceActorLabel(
  metadata: ReceiptDraftSourceMetadata | undefined,
): string {
  if (metadata?.sender) {
    return `From ${metadata.sender}`;
  }

  if (metadata?.kind === "google_drive" || metadata?.kind === "google_docs") {
    return "Owner not provided";
  }

  if (metadata?.kind === "gmail") {
    return "Sender not provided";
  }

  return "Source details not provided";
}

function formatDuplicateTrackingLabel(
  metadata: ReceiptDraftSourceMetadata | undefined,
): string {
  if (metadata?.sourceId && metadata.contentHash) {
    return "Duplicate check: source id + content hash";
  }

  if (metadata?.sourceId) {
    return "Duplicate check: source id";
  }

  if (metadata?.contentHash) {
    return "Duplicate check: content hash";
  }

  return "Duplicate check: unavailable";
}

function formatProviderLabel(
  metadata: ReceiptDraftSourceMetadata | undefined,
): string | undefined {
  const providers = [
    metadata?.sourceProviderName,
    metadata?.providerName,
  ].filter(Boolean);

  return providers.length > 0 ? `Provider ${providers.join(" / ")}` : undefined;
}

function isMatchingSourceIdentity(
  metadata: ReceiptDraftSourceMetadata | undefined,
  identity: ReceiptSourceIdentity,
): boolean {
  if (!metadata || metadata.kind !== identity.kind) {
    return false;
  }

  if (identity.sourceId && metadata.sourceId === identity.sourceId) {
    return true;
  }

  return Boolean(identity.contentHash && metadata.contentHash === identity.contentHash);
}
