import { type CurrencyCode, type ISODateString } from "../domain/models";

export type ParsedReceiptLineKind =
  | "item"
  | "discount"
  | "fee"
  | "tax"
  | "total"
  | "unclear";

export type ParsedReceiptItemFlag =
  | "low_confidence"
  | "unclear_line"
  | "discount_line"
  | "fee_line"
  | "tax_line"
  | "uncategorized"
  | "quantity_uncertain"
  | "unit_price_uncertain";

export interface ParsedReceiptItem {
  rawLine: string;
  rawName: string;
  normalizedName: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  categoryId: string;
  tags: string[];
  confidence: number;
  flags: ParsedReceiptItemFlag[];
  kind: ParsedReceiptLineKind;
}

export interface ParsedReceiptDraft {
  rawText: string;
  merchantName?: string;
  receiptDate?: ISODateString;
  currency: CurrencyCode;
  totalAmount?: number;
  items: ParsedReceiptItem[];
  warnings: string[];
  confidence: number;
}

export interface ReceiptParserOptions {
  defaultCurrency?: CurrencyCode;
  totalTolerance?: number;
}

