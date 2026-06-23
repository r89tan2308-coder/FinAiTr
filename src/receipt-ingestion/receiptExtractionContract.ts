export const receiptExtractionPromptTemplate = `
You extract structured receipt draft data for a local-first personal finance app.

Return JSON only. Do not include markdown, prose, or comments.
Return exactly one JSON object with no extra top-level or item fields.
Use the provided receipt text as evidence. Do not invent merchants, dates, totals, or items.
If a value is unclear, omit the optional field, lower confidence, and add a warning.
Use a provided category id when reliable. Use "uncategorized" only when no category hint is reliable, and add the "uncategorized" flag plus a warning.
Preserve raw item names separately from normalized item names.
Classify discounts, fees, taxes, totals, and unclear lines with the matching kind.
Dates must use YYYY-MM-DD. Currency must be a three-letter uppercase ISO-like code.
Amounts and quantities must be finite numbers. Receipt totals cannot be negative.
Confidence values must be numbers from 0 to 1.
If item totals do not match the receipt total, keep the extracted values and add a warning.
If an item is unclear or low confidence, add an item flag and a warning.
This extraction must create a receipt draft only. Never create transactions, dashboard totals, or accounting effects.

Required output shape:
{
  "merchantName": "string, optional",
  "receiptDate": "YYYY-MM-DD, optional",
  "currency": "ISO currency code",
  "totalAmount": "number, optional",
  "items": [
    {
      "rawLine": "string, optional",
      "rawName": "string",
      "normalizedName": "string",
      "quantity": "number, optional",
      "unitPrice": "number, optional",
      "totalPrice": "number",
      "categoryId": "string",
      "tags": ["string"],
      "confidence": "number from 0 to 1",
      "flags": ["string"],
      "kind": "item | discount | fee | tax | total | unclear"
    }
  ],
  "warnings": ["string"],
  "confidence": "number from 0 to 1"
}
`.trim();

export const receiptExtractionJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "FinAiTr AI receipt extraction draft",
  type: "object",
  additionalProperties: false,
  required: ["currency", "items", "warnings", "confidence"],
  properties: {
    merchantName: { type: "string", minLength: 1 },
    receiptDate: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
    },
    currency: { type: "string", pattern: "^[A-Z]{3}$" },
    totalAmount: { type: "number", minimum: 0 },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "rawName",
          "normalizedName",
          "totalPrice",
          "categoryId",
          "tags",
          "confidence",
          "flags",
          "kind",
        ],
        properties: {
          rawLine: { type: "string" },
          rawName: { type: "string", minLength: 1 },
          normalizedName: { type: "string", minLength: 1 },
          quantity: { type: "number", exclusiveMinimum: 0 },
          unitPrice: { type: "number" },
          totalPrice: { type: "number" },
          categoryId: { type: "string", minLength: 1 },
          tags: {
            type: "array",
            items: { type: "string", minLength: 1 },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          flags: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "low_confidence",
                "unclear_line",
                "discount_line",
                "fee_line",
                "tax_line",
                "uncategorized",
                "quantity_uncertain",
                "unit_price_uncertain",
              ],
            },
          },
          kind: {
            type: "string",
            enum: ["item", "discount", "fee", "tax", "total", "unclear"],
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;
