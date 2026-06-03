import { ClipboardPaste, Eraser, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { PageSection } from "../components/PageSection";
import { currency } from "../domain/financeViews";
import { type Receipt, type ReceiptItem, type ReceiptStatus } from "../domain/models";
import { groceryReceiptText } from "../receipt-parser/fixtures";
import {
  type ParsedReceiptDraft,
  type ParsedReceiptItem,
} from "../receipt-parser/types";
import { parsePastedReceiptText } from "../services/receiptParserService";

interface ReceiptsPageProps {
  receiptItems: ReceiptItem[];
  receipts: Receipt[];
}

export function ReceiptsPage({ receiptItems, receipts }: ReceiptsPageProps) {
  const [rawReceiptText, setRawReceiptText] = useState("");
  const [parsedDraft, setParsedDraft] = useState<ParsedReceiptDraft>();
  const [parseStatus, setParseStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [parseError, setParseError] = useState<string>();

  const itemCounts = receiptItems.reduce<Map<string, number>>((counts, item) => {
    counts.set(item.receiptId, (counts.get(item.receiptId) ?? 0) + 1);
    return counts;
  }, new Map());

  function handleParseReceipt() {
    if (!rawReceiptText.trim()) {
      setParsedDraft(undefined);
      setParseError("Paste receipt text before parsing.");
      setParseStatus("error");
      return;
    }

    setParseStatus("loading");
    setParseError(undefined);

    try {
      const nextDraft = parsePastedReceiptText(rawReceiptText);
      setParsedDraft(nextDraft);
      setParseStatus("ready");
    } catch (error) {
      setParsedDraft(undefined);
      setParseError(
        error instanceof Error ? error.message : "Could not parse receipt text.",
      );
      setParseStatus("error");
    }
  }

  function handleUseSample() {
    setRawReceiptText(groceryReceiptText);
    setParsedDraft(undefined);
    setParseError(undefined);
    setParseStatus("idle");
  }

  function handleClear() {
    setRawReceiptText("");
    setParsedDraft(undefined);
    setParseError(undefined);
    setParseStatus("idle");
  }

  return (
    <div className="page-stack">
      <div className="toolbar receipt-toolbar">
        <button
          className="primary-button"
          disabled={parseStatus === "loading"}
          onClick={handleParseReceipt}
          type="button"
        >
          <ClipboardPaste aria-hidden="true" size={18} />
          Parse receipt
        </button>
        <button className="secondary-button" onClick={handleUseSample} type="button">
          <RefreshCcw aria-hidden="true" size={18} />
          Use sample
        </button>
        <button
          aria-label="Clear"
          className="icon-button"
          onClick={handleClear}
          title="Clear"
          type="button"
        >
          <Eraser aria-hidden="true" size={19} />
        </button>
      </div>

      <PageSection title="Paste receipt text">
        <div className="form-panel receipt-input-panel">
          <label className="field field-wide" htmlFor="raw-receipt-text">
            <span>Raw receipt text</span>
            <textarea
              id="raw-receipt-text"
              name="rawReceiptText"
              onChange={(event) => setRawReceiptText(event.target.value)}
              placeholder="Merchant, date, item lines, totals..."
              rows={8}
              value={rawReceiptText}
            />
          </label>
        </div>
      </PageSection>

      <PageSection title="Parser preview">
        {parseStatus === "loading" && (
          <div className="empty-state" role="status">
            Parsing receipt text...
          </div>
        )}
        {parseStatus === "error" && parseError && (
          <div className="status-banner" role="alert">
            {parseError}
          </div>
        )}
        {parseStatus !== "loading" && parseStatus !== "ready" && !parseError && (
          <div className="empty-state">Paste receipt text to preview parser output.</div>
        )}
        {parseStatus === "ready" && parsedDraft && (
          <ReceiptParserPreview draft={parsedDraft} />
        )}
      </PageSection>

      <PageSection title="Receipt inbox">
        <div className="item-list">
          {receipts.map((receipt) => (
            <article className="list-row" key={receipt.id}>
              <div>
                <strong>{receipt.merchant ?? "Unknown merchant"}</strong>
                <span>
                  {receipt.date ?? "No date"} · {itemCounts.get(receipt.id) ?? 0}{" "}
                  items · {formatReceiptStatus(receipt.status)}
                </span>
              </div>
              <b>{currency.format(receipt.total ?? 0)}</b>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}

function ReceiptParserPreview({ draft }: { draft: ParsedReceiptDraft }) {
  return (
    <div className="receipt-preview">
      <div className="receipt-summary-grid">
        <PreviewMetric label="Merchant" value={draft.merchantName ?? "Unknown"} />
        <PreviewMetric label="Date" value={draft.receiptDate ?? "Unknown"} />
        <PreviewMetric label="Currency" value={draft.currency} />
        <PreviewMetric
          label="Total"
          value={formatAmount(draft.totalAmount, draft.currency)}
        />
        <PreviewMetric label="Confidence" value={formatConfidence(draft.confidence)} />
      </div>

      <div className="parser-warning-panel">
        <strong>Parser warnings</strong>
        {draft.warnings.length > 0 ? (
          <ul>
            {draft.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <span>No parser warnings.</span>
        )}
      </div>

      <div className="receipt-item-list" aria-label="Parsed receipt line items">
        {draft.items.length > 0 ? (
          draft.items.map((item) => (
            <ParsedReceiptItemCard
              currencyCode={draft.currency}
              item={item}
              key={`${item.rawLine}-${item.totalPrice}`}
            />
          ))
        ) : (
          <div className="empty-state">No item-like lines were detected.</div>
        )}
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="receipt-preview-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ParsedReceiptItemCard({
  currencyCode,
  item,
}: {
  currencyCode: string;
  item: ParsedReceiptItem;
}) {
  const hasReviewFlags = item.flags.length > 0 || item.confidence < 0.75;

  return (
    <article className="receipt-item-card" data-needs-review={hasReviewFlags}>
      <div className="receipt-item-heading">
        <div>
          <strong>{item.rawName}</strong>
          <span>{item.normalizedName}</span>
        </div>
        <b>{formatAmount(item.totalPrice, currencyCode)}</b>
      </div>

      <dl className="receipt-item-details">
        <div>
          <dt>Kind</dt>
          <dd>{formatTitle(item.kind)}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>{formatOptionalNumber(item.quantity)}</dd>
        </div>
        <div>
          <dt>Unit price</dt>
          <dd>{formatAmount(item.unitPrice, currencyCode)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{formatTitle(item.categoryId)}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{formatConfidence(item.confidence)}</dd>
        </div>
      </dl>

      <div className="receipt-chip-list">
        {item.flags.length > 0 ? (
          item.flags.map((flag) => (
            <span className="receipt-chip receipt-chip-warning" key={flag}>
              {formatTitle(flag)}
            </span>
          ))
        ) : (
          <span className="receipt-chip">No flags</span>
        )}
        {item.tags.map((tag) => (
          <span className="receipt-chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <small>{item.rawLine}</small>
    </article>
  );
}

function formatReceiptStatus(status: ReceiptStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAmount(amount: number | undefined, currencyCode: string): string {
  if (amount === undefined) {
    return "Unknown";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      currency: currencyCode,
      style: "currency",
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatOptionalNumber(value: number | undefined): string {
  return value === undefined ? "Unknown" : String(value);
}

function formatTitle(value: string): string {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
