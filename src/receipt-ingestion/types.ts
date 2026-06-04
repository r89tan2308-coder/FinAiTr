import {
  type CurrencyCode,
  type ISODateString,
  type ISODateTimeString,
  type ReceiptDraftItemFlag,
  type ReceiptDraftLineKind,
} from "../domain/models";

export type ReceiptTextSourceKind =
  | "manual_paste"
  | "gmail"
  | "google_drive"
  | "google_docs";

export interface ReceiptTextSourceReference {
  kind: ReceiptTextSourceKind;
  sourceId?: string;
  title?: string;
  sender?: string;
  url?: string;
  receivedAt?: ISODateTimeString;
  fetchedAt?: ISODateTimeString;
}

export interface ReceiptTextCandidate {
  id: string;
  source: ReceiptTextSourceReference;
  rawText: string;
  detectedAt: ISODateTimeString;
  warnings: string[];
}

export interface ReceiptTextSourceProvider {
  readonly kind: ReceiptTextSourceKind;
  listCandidates(): Promise<ReceiptTextCandidate[]>;
  getCandidateText(candidateId: string): Promise<ReceiptTextCandidate>;
}

export interface ReceiptExtractionCategoryHint {
  id: string;
  name: string;
  keywords: string[];
}

export interface ReceiptExtractionRequest {
  source: ReceiptTextSourceReference;
  rawText: string;
  defaultCurrency?: CurrencyCode;
  localeHint?: string;
  categoryHints: ReceiptExtractionCategoryHint[];
}

export interface AiExtractedReceiptItem {
  rawLine?: string;
  rawName: string;
  normalizedName: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  categoryId: string;
  tags: string[];
  confidence: number;
  flags: ReceiptDraftItemFlag[];
  kind: ReceiptDraftLineKind;
}

export interface AiExtractedReceiptDraft {
  merchantName?: string;
  receiptDate?: ISODateString;
  currency: CurrencyCode;
  totalAmount?: number;
  items: AiExtractedReceiptItem[];
  warnings: string[];
  confidence: number;
}

export interface ReceiptExtractionResult {
  providerName: string;
  modelName?: string;
  extractedAt: ISODateTimeString;
  draft: AiExtractedReceiptDraft;
}

export interface ReceiptExtractionProvider {
  readonly providerName: string;
  extractReceiptDraft(
    request: ReceiptExtractionRequest,
  ): Promise<ReceiptExtractionResult>;
}
