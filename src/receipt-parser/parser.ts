import { type CurrencyCode } from "../domain/models";
import { guessReceiptItemCategory } from "./categoryGuessing";
import {
  type ParsedReceiptDraft,
  type ParsedReceiptItem,
  type ParsedReceiptItemFlag,
  type ParsedReceiptLineKind,
  type ReceiptParserOptions,
} from "./types";

const totalKeywords = ["total", "итого", "subtotal", "amount due", "к оплате"];
const taxKeywords = ["tax", "vat", "ндс", "налог"];
const discountKeywords = ["discount", "скидка", "coupon", "promo"];
const feeKeywords = ["fee", "service", "delivery", "deposit", "bag"];
const nonMerchantKeywords = [
  ...totalKeywords,
  ...taxKeywords,
  ...discountKeywords,
  "receipt",
  "касса",
  "cashier",
  "date",
  "time",
  "card",
  "visa",
  "mastercard",
];

interface ParsedMoney {
  amount: number;
  currency?: CurrencyCode;
  raw: string;
}

interface ParseLineResult {
  item?: ParsedReceiptItem;
  warning?: string;
}

export function parseReceiptText(
  rawText: string,
  options: ReceiptParserOptions = {},
): ParsedReceiptDraft {
  const defaultCurrency = options.defaultCurrency ?? "USD";
  const totalTolerance = options.totalTolerance ?? 0.02;
  const warnings: string[] = [];
  const lines = normalizeReceiptLines(rawText);

  if (lines.length === 0) {
    return {
      confidence: 0,
      currency: defaultCurrency,
      items: [],
      rawText,
      warnings: ["Receipt text is empty."],
    };
  }

  const merchantName = detectMerchantName(lines);
  const receiptDate = detectReceiptDate(lines);
  const currency = detectCurrency(lines) ?? defaultCurrency;
  const totalAmount = detectTotalAmount(lines);
  const items: ParsedReceiptItem[] = [];

  lines.forEach((line) => {
    if (line === merchantName || detectReceiptDate([line])) {
      return;
    }

    const result = parseReceiptLine(line);

    if (result.item) {
      items.push(result.item);
    }

    if (result.warning) {
      warnings.push(result.warning);
    }
  });

  if (!merchantName) {
    warnings.push("Merchant name could not be detected.");
  }

  if (!receiptDate) {
    warnings.push("Receipt date could not be detected.");
  }

  if (totalAmount === undefined) {
    warnings.push("Receipt total could not be detected.");
  }

  if (items.length === 0) {
    warnings.push("No receipt line items could be detected.");
  }

  if (totalAmount !== undefined) {
    const itemSum = roundMoney(
      items
        .filter((item) => item.kind !== "total")
        .reduce((sum, item) => sum + item.totalPrice, 0),
    );
    const difference = roundMoney(itemSum - totalAmount);

    if (Math.abs(difference) > totalTolerance) {
      warnings.push(
        `Item sum ${formatMoney(itemSum)} does not match receipt total ${formatMoney(
          totalAmount,
        )}. Difference: ${formatMoney(difference)}.`,
      );
    }
  }

  return {
    confidence: calculateReceiptConfidence({
      hasDate: Boolean(receiptDate),
      hasMerchant: Boolean(merchantName),
      hasTotal: totalAmount !== undefined,
      itemCount: items.length,
      lowConfidenceCount: items.filter((item) =>
        item.flags.includes("low_confidence"),
      ).length,
      warningCount: warnings.length,
    }),
    currency,
    items,
    merchantName,
    rawText,
    receiptDate,
    totalAmount,
    warnings,
  };
}

export function normalizeReceiptLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseReceiptLine(line: string): ParseLineResult {
  const kind = detectLineKind(line);
  const money = extractTrailingMoney(line);

  if (kind === "total") {
    return {};
  }

  if (!money) {
    if (looksLikeUnclearLine(line)) {
      return {
        warning: `Unclear line preserved for review: "${line}".`,
      };
    }

    return {};
  }

  const name = stripTrailingMoney(line, money.raw);
  const quantityInfo = extractQuantityInfo(name, money.amount);
  const rawName = quantityInfo.name.trim();

  if (!rawName || (kind === "item" && isNonItemName(rawName))) {
    return {};
  }

  const category = guessReceiptItemCategory(rawName);
  const flags: ParsedReceiptItemFlag[] = [];

  if (category.categoryId === "uncategorized") {
    flags.push("uncategorized");
  }

  if (kind === "discount") {
    flags.push("discount_line");
  }

  if (kind === "fee") {
    flags.push("fee_line");
  }

  if (kind === "tax") {
    flags.push("tax_line");
  }

  if (quantityInfo.quantity && !quantityInfo.unitPrice) {
    flags.push("unit_price_uncertain");
  }

  const confidence = calculateItemConfidence({
    categoryConfidence: category.confidence,
    hasPrice: Number.isFinite(money.amount),
    kind,
    quantityDetected: quantityInfo.quantity !== undefined,
  });

  if (confidence < 0.6) {
    flags.push("low_confidence");
  }

  if (kind === "unclear") {
    flags.push("unclear_line");
  }

  return {
    item: {
      categoryId: category.categoryId,
      confidence,
      flags,
      kind,
      normalizedName: normalizeItemName(rawName),
      quantity: quantityInfo.quantity,
      rawLine: line,
      rawName,
      tags: category.tags,
      totalPrice: roundMoney(money.amount),
      unitPrice: quantityInfo.unitPrice,
    },
  };
}

function detectMerchantName(lines: string[]): string | undefined {
  return lines.find((line) => {
    const lower = line.toLowerCase();
    const hasLetter = /[a-zа-я]/i.test(line);
    const hasMoney = extractTrailingMoney(line) !== undefined;
    const isMetadata = lineHasKeyword(lower, nonMerchantKeywords);

    return hasLetter && !hasMoney && !isMetadata && !detectReceiptDate([line]);
  });
}

function detectReceiptDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const iso = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);

    if (iso) {
      return normalizeDateParts(iso[1], iso[2], iso[3]);
    }

    const european = line.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);

    if (european) {
      return normalizeDateParts(european[3], european[2], european[1]);
    }
  }

  return undefined;
}

function detectCurrency(lines: string[]): CurrencyCode | undefined {
  const text = lines.join(" ");

  if (/\$|usd\b/i.test(text)) {
    return "USD";
  }

  if (/€|eur\b/i.test(text)) {
    return "EUR";
  }

  if (/₽|rub\b|руб/i.test(text)) {
    return "RUB";
  }

  if (/£|gbp\b/i.test(text)) {
    return "GBP";
  }

  return undefined;
}

function detectTotalAmount(lines: string[]): number | undefined {
  const candidates = lines
    .filter((line) => {
      const lower = line.toLowerCase();
      return lineHasKeyword(lower, totalKeywords);
    })
    .map(extractTrailingMoney)
    .filter((money): money is ParsedMoney => Boolean(money));

  return candidates.length > 0 ? candidates[candidates.length - 1].amount : undefined;
}

function detectLineKind(line: string): ParsedReceiptLineKind {
  const lower = line.toLowerCase();

  if (lineHasKeyword(lower, totalKeywords)) {
    return "total";
  }

  if (lineHasKeyword(lower, discountKeywords)) {
    return "discount";
  }

  if (lineHasKeyword(lower, taxKeywords)) {
    return "tax";
  }

  if (lineHasKeyword(lower, feeKeywords)) {
    return "fee";
  }

  if (extractTrailingMoney(line)) {
    return "item";
  }

  return "unclear";
}

function extractTrailingMoney(line: string): ParsedMoney | undefined {
  const match = line.match(
    /(?:^|[\s:])(?<currencyPrefix>[$€£₽])?\s*(?<amount>[+-]?\d+(?:[.,]\d{2})?)\s*(?<currencySuffix>[$€£₽]|USD|EUR|RUB|GBP|руб\.?)?\s*$/i,
  );

  if (!match?.groups) {
    return undefined;
  }

  return {
    amount: parseMoney(match.groups.amount),
    currency: currencySymbolToCode(
      match.groups.currencyPrefix || match.groups.currencySuffix,
    ),
    raw: match[0].trim(),
  };
}

function stripTrailingMoney(line: string, rawMoney: string): string {
  return line.slice(0, line.length - rawMoney.length).replace(/[:\-–—\s]+$/, "");
}

function extractQuantityInfo(
  rawName: string,
  totalPrice: number,
): { name: string; quantity?: number; unitPrice?: number } {
  const quantityAt = rawName.match(
    /^(?<name>.+?)\s+(?<quantity>\d+(?:[.,]\d+)?)\s*(?:x|х|\*)\s*(?<unitPrice>\d+(?:[.,]\d{1,2})?)$/i,
  );

  if (quantityAt?.groups) {
    return {
      name: quantityAt.groups.name,
      quantity: parseDecimal(quantityAt.groups.quantity),
      unitPrice: parseMoney(quantityAt.groups.unitPrice),
    };
  }

  const leadingQuantity = rawName.match(
    /^(?<quantity>\d+(?:[.,]\d+)?)\s*(?:x|х|\*)\s+(?<name>.+)$/i,
  );

  if (leadingQuantity?.groups) {
    const quantity = parseDecimal(leadingQuantity.groups.quantity);

    return {
      name: leadingQuantity.groups.name,
      quantity,
      unitPrice: quantity > 0 ? roundMoney(totalPrice / quantity) : undefined,
    };
  }

  const trailingQuantity = rawName.match(
    /^(?<name>.+?)\s+(?<quantity>\d+(?:[.,]\d+)?)\s*(?:x|х|\*)$/i,
  );

  if (trailingQuantity?.groups) {
    const quantity = parseDecimal(trailingQuantity.groups.quantity);

    return {
      name: trailingQuantity.groups.name,
      quantity,
      unitPrice: quantity > 0 ? roundMoney(totalPrice / quantity) : undefined,
    };
  }

  return { name: rawName };
}

function isNonItemName(name: string): boolean {
  const lower = name.toLowerCase();
  return lineHasKeyword(lower, nonMerchantKeywords);
}

function looksLikeUnclearLine(line: string): boolean {
  return /[a-zа-я]/i.test(line) && !detectReceiptDate([line]);
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, "").replace(/\s+/g, " ").trim();
}

function normalizeDateParts(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseMoney(value: string): number {
  return roundMoney(Number(value.replace(",", ".")));
}

function parseDecimal(value: string): number {
  return Number(value.replace(",", "."));
}

function currencySymbolToCode(value?: string): CurrencyCode | undefined {
  const normalized = value?.toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === "$" || normalized === "usd") {
    return "USD";
  }

  if (normalized === "€" || normalized === "eur") {
    return "EUR";
  }

  if (normalized === "₽" || normalized === "rub" || normalized.startsWith("руб")) {
    return "RUB";
  }

  if (normalized === "£" || normalized === "gbp") {
    return "GBP";
  }

  return undefined;
}

function calculateItemConfidence(input: {
  categoryConfidence: number;
  hasPrice: boolean;
  kind: ParsedReceiptLineKind;
  quantityDetected: boolean;
}): number {
  let confidence = input.hasPrice ? 0.5 : 0.2;
  confidence += input.categoryConfidence * 0.3;

  if (input.quantityDetected) {
    confidence += 0.04;
  }

  if (input.kind === "discount" || input.kind === "fee" || input.kind === "tax") {
    confidence -= 0.16;
  }

  if (input.kind === "unclear") {
    confidence -= 0.24;
  }

  return clampConfidence(confidence);
}

function calculateReceiptConfidence(input: {
  hasDate: boolean;
  hasMerchant: boolean;
  hasTotal: boolean;
  itemCount: number;
  lowConfidenceCount: number;
  warningCount: number;
}): number {
  let confidence = 0.24;

  if (input.hasMerchant) {
    confidence += 0.16;
  }

  if (input.hasDate) {
    confidence += 0.14;
  }

  if (input.hasTotal) {
    confidence += 0.18;
  }

  confidence += Math.min(input.itemCount, 6) * 0.05;
  confidence -= input.lowConfidenceCount * 0.05;
  confidence -= input.warningCount * 0.03;

  return clampConfidence(confidence);
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, roundMoney(value)));
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function lineHasKeyword(line: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    const escapedKeyword = escapeRegExp(keyword);
    return new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapedKeyword}([^\\p{L}\\p{N}]|$)`,
      "iu",
    ).test(line);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
