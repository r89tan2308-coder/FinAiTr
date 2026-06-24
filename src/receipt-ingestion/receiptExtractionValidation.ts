import {
  type ISODateString,
  type ISODateTimeString,
  type ReceiptDraftItemFlag,
  type ReceiptDraftLineKind,
  type ReceiptDraftSourceKind,
} from "../domain/models";
import {
  type AiExtractedReceiptDraft,
  type AiExtractedReceiptItem,
  type ReceiptExtractionResult,
  type ReceiptTextSourceReference,
} from "./types";

interface ReceiptExtractionValidationOptions {
  categoryIds?: readonly string[];
  source: ReceiptTextSourceReference;
  totalTolerance?: number;
}

const allowedSourceKinds = new Set<ReceiptDraftSourceKind>([
  "manual_paste",
  "gmail",
  "google_drive",
  "google_docs",
]);

const allowedLineKinds = new Set<ReceiptDraftLineKind>([
  "item",
  "discount",
  "fee",
  "tax",
  "total",
  "unclear",
]);

const allowedItemFlags = new Set<ReceiptDraftItemFlag>([
  "low_confidence",
  "unclear_line",
  "discount_line",
  "fee_line",
  "tax_line",
  "uncategorized",
  "quantity_uncertain",
  "unit_price_uncertain",
]);

export function validateReceiptExtractionResult(
  input: unknown,
  options: ReceiptExtractionValidationOptions,
): ReceiptExtractionResult {
  validateReceiptTextSourceReference(options.source);

  const result = requireObject(input, "AI extraction result");
  assertAllowedKeys(result, "AI extraction result", [
    "draft",
    "extractedAt",
    "modelName",
    "providerName",
  ]);

  return {
    draft: validateReceiptExtractionDraft(result.draft, options),
    extractedAt: requireIsoDateTime(
      result.extractedAt,
      "AI extraction timestamp",
    ),
    modelName: optionalNonEmptyString(
      result.modelName,
      "AI extraction model name",
    ),
    providerName: requireNonEmptyString(
      result.providerName,
      "AI extraction provider name",
    ),
  };
}

function validateReceiptExtractionDraft(
  input: unknown,
  options: ReceiptExtractionValidationOptions,
): AiExtractedReceiptDraft {
  const draft = requireObject(input, "AI extraction draft");
  assertAllowedKeys(draft, "AI extraction draft", [
    "confidence",
    "currency",
    "items",
    "merchantName",
    "receiptDate",
    "totalAmount",
    "warnings",
  ]);

  const warnings = requireStringArray(draft.warnings, "AI extraction warnings");
  const categoryIds = new Set(options.categoryIds ?? []);
  const validationWarnings: string[] = [];
  const items = requireArray(draft.items, "AI extraction items").map(
    (item, index) =>
      validateReceiptExtractionItem(item, {
        categoryIds,
        index,
        warnings: validationWarnings,
      }),
  );

  if (items.length === 0) {
    throw new Error("AI extraction must include at least one receipt item.");
  }

  const totalAmount =
    draft.totalAmount === undefined
      ? undefined
      : requireFiniteNumber(draft.totalAmount, "AI extraction total", {
          min: 0,
        });
  const normalizedDraft: AiExtractedReceiptDraft = {
    confidence: requireConfidence(
      draft.confidence,
      "AI extraction confidence",
    ),
    currency: requireCurrencyCode(draft.currency, "AI extraction currency"),
    items,
    merchantName: optionalNonEmptyString(
      draft.merchantName,
      "AI extraction merchant",
    ),
    receiptDate:
      draft.receiptDate === undefined
        ? undefined
        : requireIsoDate(draft.receiptDate, "AI extraction receipt date"),
    totalAmount,
    warnings: mergeWarnings(warnings, validationWarnings),
  };

  appendDraftReviewWarnings(normalizedDraft, options.totalTolerance ?? 0.02);

  return normalizedDraft;
}

function validateReceiptExtractionItem(
  input: unknown,
  options: {
    categoryIds: Set<string>;
    index: number;
    warnings: string[];
  },
): AiExtractedReceiptItem {
  const itemNumber = options.index + 1;
  const label = `AI extraction item ${itemNumber}`;
  const item = requireObject(input, label);
  assertAllowedKeys(item, label, [
    "categoryId",
    "confidence",
    "flags",
    "kind",
    "normalizedName",
    "quantity",
    "rawLine",
    "rawName",
    "tags",
    "totalPrice",
    "unitPrice",
  ]);

  const kind = requireLineKind(item.kind, `${label} kind`);
  const categoryId = requireNonEmptyString(item.categoryId, `${label} category`);
  const confidence = requireConfidence(item.confidence, `${label} confidence`);
  const flags = requireItemFlags(item.flags, `${label} flags`);

  if (confidence < 0.6) {
    appendUnique(flags, "low_confidence");
    options.warnings.push(`${label} has low confidence and needs review.`);
  }

  if (kind === "unclear") {
    appendUnique(flags, "unclear_line");
    options.warnings.push(`${label} is unclear and needs review.`);
  }

  if (
    categoryId === "uncategorized" ||
    (options.categoryIds.size > 0 && !options.categoryIds.has(categoryId))
  ) {
    appendUnique(flags, "uncategorized");
    options.warnings.push(
      `${label} uses category "${categoryId}" outside available hints; review category before confirmation.`,
    );
  }

  return {
    categoryId,
    confidence,
    flags,
    kind,
    normalizedName: requireNonEmptyString(
      item.normalizedName,
      `${label} normalized name`,
    ),
    quantity:
      item.quantity === undefined
        ? undefined
        : requireFiniteNumber(item.quantity, `${label} quantity`, {
            exclusiveMin: 0,
          }),
    rawLine: optionalNonEmptyString(item.rawLine, `${label} raw line`),
    rawName: requireNonEmptyString(item.rawName, `${label} raw name`),
    tags: requireStringArray(item.tags, `${label} tags`),
    totalPrice: requireFiniteNumber(item.totalPrice, `${label} total price`, {
      min: kind === "discount" ? undefined : 0,
    }),
    unitPrice:
      item.unitPrice === undefined
        ? undefined
        : requireFiniteNumber(item.unitPrice, `${label} unit price`),
  };
}

function validateReceiptTextSourceReference(
  input: ReceiptTextSourceReference,
): void {
  const source = requireObject(input, "AI receipt source metadata");
  assertAllowedKeys(source, "AI receipt source metadata", [
    "contentHash",
    "extractedAt",
    "fetchedAt",
    "kind",
    "modelName",
    "modifiedAt",
    "providerName",
    "receivedAt",
    "sender",
    "sourceId",
    "sourceProviderName",
    "title",
    "url",
  ]);

  const kind = requireNonEmptyString(source.kind, "AI receipt source kind");

  if (!allowedSourceKinds.has(kind as ReceiptDraftSourceKind)) {
    throw new Error(`AI receipt source kind is not supported: ${kind}.`);
  }

  optionalNonEmptyString(source.sourceId, "AI receipt source id");
  optionalNonEmptyString(source.contentHash, "AI receipt source content hash");
  optionalNonEmptyString(source.title, "AI receipt source title");
  optionalNonEmptyString(source.sender, "AI receipt source sender");
  optionalNonEmptyString(source.url, "AI receipt source URL");
  optionalNonEmptyString(source.sourceProviderName, "AI receipt text source provider");
  optionalNonEmptyString(source.providerName, "AI receipt source provider");
  optionalNonEmptyString(source.modelName, "AI receipt source model");

  if (source.receivedAt !== undefined) {
    requireIsoDateTime(source.receivedAt, "AI receipt source received time");
  }

  if (source.modifiedAt !== undefined) {
    requireIsoDateTime(source.modifiedAt, "AI receipt source modified time");
  }

  if (source.fetchedAt !== undefined) {
    requireIsoDateTime(source.fetchedAt, "AI receipt source fetched time");
  }

  if (source.extractedAt !== undefined) {
    requireIsoDateTime(source.extractedAt, "AI receipt source extraction time");
  }
}

function appendDraftReviewWarnings(
  draft: AiExtractedReceiptDraft,
  totalTolerance: number,
): void {
  if (draft.confidence < 0.6) {
    appendUnique(
      draft.warnings,
      "AI extraction confidence is low; review the receipt before confirmation.",
    );
  }

  if (draft.totalAmount === undefined) {
    return;
  }

  const itemSum = roundMoney(
    draft.items
      .filter((item) => item.kind !== "total" && item.kind !== "unclear")
      .reduce((sum, item) => sum + item.totalPrice, 0),
  );
  const difference = roundMoney(draft.totalAmount - itemSum);

  if (Math.abs(difference) > totalTolerance) {
    appendUnique(
      draft.warnings,
      `AI extraction total ${formatMoney(draft.totalAmount)} differs from item sum ${formatMoney(itemSum)} by ${formatMoney(Math.abs(difference))}.`,
    );
  }
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  label: string,
  allowedKeys: string[],
): void {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} has unsupported field: ${key}.`);
    }
  }
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  return requireArray(value, label).map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${label} ${index + 1} must be a non-empty string.`);
    }

    return item.trim();
  });
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function optionalNonEmptyString(
  value: unknown,
  label: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireNonEmptyString(value, label);
}

function requireCurrencyCode(value: unknown, label: string): string {
  const currency = requireNonEmptyString(value, label);

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`${label} must be a three-letter uppercase currency code.`);
  }

  return currency;
}

function requireIsoDate(value: unknown, label: string): ISODateString {
  const date = requireNonEmptyString(value, label);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`${label} must be a valid calendar date.`);
  }

  return date;
}

function requireIsoDateTime(value: unknown, label: string): ISODateTimeString {
  const dateTime = requireNonEmptyString(value, label);
  const parsed = new Date(dateTime);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }

  return dateTime;
}

function requireFiniteNumber(
  value: unknown,
  label: string,
  options: { exclusiveMin?: number; min?: number } = {},
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(`${label} must be greater than or equal to ${options.min}.`);
  }

  if (options.exclusiveMin !== undefined && value <= options.exclusiveMin) {
    throw new Error(`${label} must be greater than ${options.exclusiveMin}.`);
  }

  return value;
}

function requireConfidence(value: unknown, label: string): number {
  const confidence = requireFiniteNumber(value, label);

  if (confidence < 0 || confidence > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }

  return confidence;
}

function requireLineKind(value: unknown, label: string): ReceiptDraftLineKind {
  const kind = requireNonEmptyString(value, label);

  if (!allowedLineKinds.has(kind as ReceiptDraftLineKind)) {
    throw new Error(`${label} is not supported: ${kind}.`);
  }

  return kind as ReceiptDraftLineKind;
}

function requireItemFlags(value: unknown, label: string): ReceiptDraftItemFlag[] {
  return requireStringArray(value, label).map((flag) => {
    if (!allowedItemFlags.has(flag as ReceiptDraftItemFlag)) {
      throw new Error(`${label} contains unsupported flag: ${flag}.`);
    }

    return flag as ReceiptDraftItemFlag;
  });
}

function mergeWarnings(
  warnings: string[],
  validationWarnings: string[],
): string[] {
  const merged = [...warnings];

  validationWarnings.forEach((warning) => appendUnique(merged, warning));

  return merged;
}

function appendUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}
