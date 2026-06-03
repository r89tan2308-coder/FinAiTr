import { parseReceiptText } from "../receipt-parser/parser";
import {
  type ParsedReceiptDraft,
  type ReceiptParserOptions,
} from "../receipt-parser/types";

export function parsePastedReceiptText(
  rawText: string,
  options?: ReceiptParserOptions,
): ParsedReceiptDraft {
  return parseReceiptText(rawText, options);
}

