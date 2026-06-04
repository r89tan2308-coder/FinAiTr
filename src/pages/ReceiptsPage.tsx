import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Edit3,
  Eraser,
  Link2,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageSection } from "../components/PageSection";
import {
  formatCurrencyAmount,
  formatDisplayMoney,
  roundMoney,
  supportedCurrencyCodes,
} from "../domain/currencySettings";
import {
  type Account,
  type Category,
  type CurrencySettings,
  type Receipt,
  type ReceiptDraft,
  type ReceiptDraftItem,
  type ReceiptDraftItemFlag,
  type ReceiptDraftLineKind,
  type ReceiptDraftSourceMetadata,
  type ReceiptDraftStatus,
  type ReceiptItem,
  type ReceiptStatus,
  type SupportedCurrencyCode,
  type Transaction,
} from "../domain/models";
import { mockEmailReceiptText } from "../receipt-ingestion/fixtures";
import { groceryReceiptText } from "../receipt-parser/fixtures";
import {
  type ParsedReceiptDraft,
  type ParsedReceiptItem,
} from "../receipt-parser/types";
import { parsePastedReceiptText } from "../services/receiptParserService";
import {
  type ManualAiExtractionInput,
  type ReceiptDraftConfirmationInput,
  type ReceiptDraftConfirmationRecord,
  type ReceiptDraftActionResult,
  type ReceiptDraftUpdateInput,
} from "../services/financeDataService";

interface ReceiptsPageProps {
  accounts: Account[];
  categories: Category[];
  currencySettings: CurrencySettings;
  onConfirmDraft: (
    draftId: string,
    input: ReceiptDraftConfirmationInput,
  ) => Promise<ReceiptDraftActionResult>;
  onDeleteDraft: (draftId: string) => Promise<ReceiptDraftActionResult>;
  onSaveDraft: (draft: ParsedReceiptDraft) => Promise<ReceiptDraftActionResult>;
  onSimulateAiExtraction: (
    input: ManualAiExtractionInput,
  ) => Promise<ReceiptDraftActionResult>;
  onUpdateDraft: (
    draftId: string,
    input: ReceiptDraftUpdateInput,
  ) => Promise<ReceiptDraftActionResult>;
  receiptDraftItems: ReceiptDraftItem[];
  receiptDrafts: ReceiptDraft[];
  receiptItems: ReceiptItem[];
  receipts: Receipt[];
  transactions: Transaction[];
}

interface DraftReviewFormValues {
  currency: SupportedCurrencyCode;
  date: string;
  items: DraftReviewItemFormValues[];
  merchant: string;
  status: ReceiptDraftStatus;
  total: string;
}

interface DraftReviewItemFormValues {
  categoryId: string;
  confidence: number;
  flagsText: string;
  id: string;
  kind: ReceiptDraftLineKind;
  normalizedName: string;
  quantity: string;
  rawLine: string;
  rawName: string;
  tags: string[];
  totalPrice: string;
  unitPrice: string;
}

export function ReceiptsPage({
  accounts,
  categories,
  currencySettings,
  onConfirmDraft,
  onDeleteDraft,
  onSaveDraft,
  onSimulateAiExtraction,
  onUpdateDraft,
  receiptDraftItems,
  receiptDrafts,
  receiptItems,
  receipts,
  transactions,
}: ReceiptsPageProps) {
  const [rawReceiptText, setRawReceiptText] = useState("");
  const [aiRawText, setAiRawText] = useState("");
  const [aiSourceKind, setAiSourceKind] =
    useState<ManualAiExtractionInput["sourceKind"]>("gmail");
  const [aiSourceReceivedAt, setAiSourceReceivedAt] = useState("");
  const [aiSourceSender, setAiSourceSender] = useState("");
  const [aiSourceTitle, setAiSourceTitle] = useState("");
  const [parsedDraft, setParsedDraft] = useState<ParsedReceiptDraft>();
  const [draftActionError, setDraftActionError] = useState<string>();
  const [draftActionMessage, setDraftActionMessage] = useState<string>();
  const [draftActionStatus, setDraftActionStatus] = useState<
    "idle" | "saving" | "deleting" | "updating" | "confirming" | "extracting"
  >("idle");
  const [confirmationAccountId, setConfirmationAccountId] = useState("");
  const [confirmationCategoryId, setConfirmationCategoryId] = useState("");
  const [confirmedSummary, setConfirmedSummary] =
    useState<ReceiptDraftConfirmationRecord>();
  const [deleteDraftCandidateId, setDeleteDraftCandidateId] = useState<string>();
  const [optimisticDraftRecord, setOptimisticDraftRecord] = useState<{
    draft: ReceiptDraft;
    items: ReceiptDraftItem[];
  }>();
  const [reviewForm, setReviewForm] = useState<DraftReviewFormValues>();
  const [reviewFormError, setReviewFormError] = useState<string>();
  const [selectedDraftId, setSelectedDraftId] = useState<string>();
  const [parseStatus, setParseStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [parseError, setParseError] = useState<string>();

  const itemCounts = receiptItems.reduce<Map<string, number>>((counts, item) => {
    counts.set(item.receiptId, (counts.get(item.receiptId) ?? 0) + 1);
    return counts;
  }, new Map());

  const draftItemCounts = receiptDraftItems.reduce<Map<string, number>>(
    (counts, item) => {
      counts.set(item.draftId, (counts.get(item.draftId) ?? 0) + 1);
      return counts;
    },
    new Map(),
  );

  const sortedReceiptDrafts = useMemo(
    () =>
      [...receiptDrafts].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [receiptDrafts],
  );
  const selectedDraft =
    selectedDraftId === undefined
      ? undefined
      : receiptDrafts.find((draft) => draft.id === selectedDraftId) ??
        (optimisticDraftRecord?.draft.id === selectedDraftId
          ? optimisticDraftRecord.draft
          : undefined);
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived),
    [accounts],
  );
  const categoryOptions = useMemo(
    () => [
      {
        id: "uncategorized",
        name: "Uncategorized",
      },
      ...categories
        .filter((category) => category.type === "expense")
        .sort((left, right) => left.name.localeCompare(right.name)),
    ],
    [categories],
  );
  const transactionCategoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.type === "expense")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [categories],
  );
  const selectedConfirmation =
    selectedDraft && confirmedSummary?.draft.id === selectedDraft.id
      ? confirmedSummary
      : undefined;
  const linkedTransaction =
    selectedConfirmation?.transaction ??
    transactions.find(
      (transaction) => transaction.id === selectedDraft?.linkedTransactionId,
    );
  const linkedReceipt =
    selectedConfirmation?.receipt ??
    receipts.find((receipt) => receipt.id === selectedDraft?.confirmedReceiptId);
  const reviewSummary = reviewForm
    ? getReviewSummary(reviewForm)
    : {
        hasMismatch: false,
        itemSum: 0,
        receiptTotal: undefined,
      };

  function handleParseReceipt() {
    if (!rawReceiptText.trim()) {
      setParsedDraft(undefined);
      setParseError("Paste receipt text before parsing.");
      setParseStatus("error");
      setDraftActionMessage(undefined);
      return;
    }

    setParseStatus("loading");
    setParseError(undefined);
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);

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
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setParseError(undefined);
    setParseStatus("idle");
  }

  function handleClear() {
    setRawReceiptText("");
    setAiRawText("");
    setAiSourceKind("gmail");
    setAiSourceReceivedAt("");
    setAiSourceSender("");
    setAiSourceTitle("");
    setParsedDraft(undefined);
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setDeleteDraftCandidateId(undefined);
    setConfirmationAccountId("");
    setConfirmationCategoryId("");
    setConfirmedSummary(undefined);
    setReviewForm(undefined);
    setReviewFormError(undefined);
    setSelectedDraftId(undefined);
    setOptimisticDraftRecord(undefined);
    setParseError(undefined);
    setParseStatus("idle");
  }

  function handleUseAiSample() {
    setAiRawText(mockEmailReceiptText);
    setAiSourceKind("gmail");
    setAiSourceTitle("Fresh Market receipt");
    setAiSourceSender("receipts@fresh.example");
    setAiSourceReceivedAt("2026-06-04T10:15:00.000Z");
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
  }

  function openDraftRecordReview(record: {
    draft: ReceiptDraft;
    items: ReceiptDraftItem[];
  }): void {
    const { draft, items } = record;
    setOptimisticDraftRecord(record);
    setSelectedDraftId(draft.id);
    setReviewForm(draftToReviewFormValues(draft, items));
    setConfirmationAccountId(getDefaultConfirmationAccountId(accounts, draft.currency));
    setConfirmationCategoryId(getDefaultReceiptTransactionCategoryId(categories));
    setConfirmedSummary(undefined);
    setReviewFormError(undefined);
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setDeleteDraftCandidateId(undefined);
  }

  function openDraftReview(draft: ReceiptDraft): void {
    openDraftRecordReview({
      draft,
      items: receiptDraftItems.filter((item) => item.draftId === draft.id),
    });
  }

  function closeDraftReview(): void {
    setSelectedDraftId(undefined);
    setOptimisticDraftRecord(undefined);
    setReviewForm(undefined);
    setReviewFormError(undefined);
    setConfirmedSummary(undefined);
  }

  function updateReviewFormValue<K extends keyof DraftReviewFormValues>(
    field: K,
    value: DraftReviewFormValues[K],
  ): void {
    setReviewForm((current) => (current ? { ...current, [field]: value } : current));
    setReviewFormError(undefined);
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setConfirmedSummary(undefined);
  }

  function updateReviewItemValue<K extends keyof DraftReviewItemFormValues>(
    itemId: string,
    field: K,
    value: DraftReviewItemFormValues[K],
  ): void {
    setReviewForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item,
        ),
      };
    });
    setReviewFormError(undefined);
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setConfirmedSummary(undefined);
  }

  async function saveDraftReview(nextStatus?: ReceiptDraftStatus): Promise<void> {
    if (!selectedDraftId || !reviewForm) {
      setReviewFormError("Open a saved draft before saving review changes.");
      return;
    }

    if (reviewForm.status === "confirmed") {
      setReviewFormError("Confirmed receipt drafts cannot be edited.");
      return;
    }

    const input = reviewFormValuesToUpdateInput({
      ...reviewForm,
      status: nextStatus ?? reviewForm.status,
    });

    if (!input.ok) {
      setReviewFormError(input.errorMessage);
      return;
    }

    setDraftActionStatus("updating");
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setReviewFormError(undefined);

    const result = await onUpdateDraft(selectedDraftId, input.data);

    setDraftActionStatus("idle");

    if (result.ok && result.draft) {
      setOptimisticDraftRecord(result.draft);
      setSelectedDraftId(result.draft.draft.id);
      setReviewForm(draftToReviewFormValues(result.draft.draft, result.draft.items));
      setDraftActionMessage(
        input.data.status === "reviewed"
          ? "Draft marked reviewed."
          : "Draft changes saved.",
      );
      return;
    }

    setDraftActionError(result.errorMessage ?? "Receipt draft could not be updated.");
  }

  async function handleConfirmDraft(): Promise<void> {
    if (!selectedDraftId || !reviewForm) {
      setReviewFormError("Open a reviewed draft before confirming a receipt.");
      return;
    }

    if (reviewForm.status !== "reviewed") {
      setReviewFormError("Mark the draft reviewed before confirming it.");
      return;
    }

    if (!confirmationAccountId) {
      setReviewFormError("Select an account before confirming this receipt.");
      return;
    }

    if (!confirmationCategoryId) {
      setReviewFormError(
        "Select a transaction category before confirming this receipt.",
      );
      return;
    }

    const confirmationValidation = validateReviewFormForConfirmation(reviewForm);

    if (!confirmationValidation.ok) {
      setReviewFormError(confirmationValidation.errorMessage);
      return;
    }

    const updateInput = reviewFormValuesToUpdateInput({
      ...reviewForm,
      status: "reviewed",
    });

    if (!updateInput.ok) {
      setReviewFormError(updateInput.errorMessage);
      return;
    }

    setDraftActionStatus("confirming");
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setReviewFormError(undefined);

    const updateResult = await onUpdateDraft(selectedDraftId, updateInput.data);

    if (!updateResult.ok) {
      setDraftActionStatus("idle");
      setDraftActionError(
        updateResult.errorMessage ?? "Receipt draft could not be updated.",
      );
      return;
    }

    const result = await onConfirmDraft(selectedDraftId, {
      accountId: confirmationAccountId,
      categoryId: confirmationCategoryId,
    });

    setDraftActionStatus("idle");

    if (result.ok && result.confirmation) {
      setConfirmedSummary(result.confirmation);

      if (result.draft) {
        setOptimisticDraftRecord(result.draft);
        setSelectedDraftId(result.draft.draft.id);
        setReviewForm(draftToReviewFormValues(result.draft.draft, result.draft.items));
      } else {
        setReviewForm((current) =>
          current ? { ...current, status: "confirmed" } : current,
        );
      }

      setDraftActionMessage("Receipt confirmed.");
      return;
    }

    setDraftActionError(result.errorMessage ?? "Receipt draft could not be confirmed.");
  }

  async function handleSaveDraft() {
    if (!parsedDraft) {
      setDraftActionError("Parse receipt text before saving a draft.");
      setDraftActionMessage(undefined);
      return;
    }

    setDraftActionStatus("saving");
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);

    const result = await onSaveDraft(parsedDraft);

    setDraftActionStatus("idle");

    if (result.ok) {
      setRawReceiptText("");
      setParsedDraft(undefined);
      setParseError(undefined);
      setParseStatus("idle");
      setDraftActionMessage("Draft saved.");
      return;
    }

    setDraftActionError(result.errorMessage ?? "Receipt draft could not be saved.");
  }

  async function handleSimulateAiExtraction(): Promise<void> {
    if (!aiRawText.trim()) {
      setDraftActionError(
        "Paste email or document receipt text before simulating AI extraction.",
      );
      setDraftActionMessage(undefined);
      return;
    }

    setDraftActionStatus("extracting");
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);
    setReviewFormError(undefined);

    const result = await onSimulateAiExtraction({
      rawText: aiRawText,
      sourceKind: aiSourceKind,
      sourceReceivedAt: aiSourceReceivedAt,
      sourceSender: aiSourceSender,
      sourceTitle: aiSourceTitle,
    });

    setDraftActionStatus("idle");

    if (result.ok && result.draft) {
      setAiRawText("");
      openDraftRecordReview(result.draft);
      setDraftActionMessage("AI draft saved for review.");
      return;
    }

    setDraftActionError(
      result.errorMessage ?? "AI receipt extraction could not be simulated.",
    );
  }

  async function confirmDeleteDraft(draftId: string) {
    setDraftActionStatus("deleting");
    setDraftActionError(undefined);
    setDraftActionMessage(undefined);

    const result = await onDeleteDraft(draftId);

    setDraftActionStatus("idle");

    if (result.ok) {
      if (selectedDraftId === draftId) {
        closeDraftReview();
      }
      setDeleteDraftCandidateId(undefined);
      setDraftActionMessage("Draft deleted.");
      return;
    }

    setDraftActionError(result.errorMessage ?? "Receipt draft could not be deleted.");
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

      <PageSection title="AI extraction simulator">
        <div className="form-panel receipt-input-panel">
          <div className="form-grid">
            <label className="field">
              <span>Source type</span>
              <select
                aria-label="AI source type"
                onChange={(event) =>
                  setAiSourceKind(
                    event.target.value as ManualAiExtractionInput["sourceKind"],
                  )
                }
                value={aiSourceKind}
              >
                <option value="manual_paste">Manual paste</option>
                <option value="gmail">Gmail</option>
                <option value="google_drive">Google Drive</option>
                <option value="google_docs">Google Docs</option>
              </select>
            </label>

            <label className="field">
              <span>Source title</span>
              <input
                onChange={(event) => setAiSourceTitle(event.target.value)}
                placeholder="Subject or document title"
                value={aiSourceTitle}
              />
            </label>

            <label className="field">
              <span>Source from</span>
              <input
                onChange={(event) => setAiSourceSender(event.target.value)}
                placeholder="Sender or owner"
                value={aiSourceSender}
              />
            </label>

            <label className="field">
              <span>Received date</span>
              <input
                onChange={(event) => setAiSourceReceivedAt(event.target.value)}
                placeholder="2026-06-04T10:15:00.000Z"
                value={aiSourceReceivedAt}
              />
            </label>
          </div>

          <label className="field field-wide" htmlFor="ai-source-receipt-text">
            <span>Email or document receipt text</span>
            <textarea
              id="ai-source-receipt-text"
              name="aiSourceReceiptText"
              onChange={(event) => setAiRawText(event.target.value)}
              placeholder="From, subject, date, then receipt body..."
              rows={8}
              value={aiRawText}
            />
          </label>

          <div className="form-actions">
            <button
              className="primary-button"
              disabled={draftActionStatus === "extracting"}
              onClick={() => void handleSimulateAiExtraction()}
              type="button"
            >
              <Sparkles aria-hidden="true" size={18} />
              {draftActionStatus === "extracting"
                ? "Simulating"
                : "Simulate AI extraction"}
            </button>
            <button
              className="secondary-button"
              disabled={draftActionStatus === "extracting"}
              onClick={handleUseAiSample}
              type="button"
            >
              <RefreshCcw aria-hidden="true" size={18} />
              Use email sample
            </button>
          </div>
        </div>
      </PageSection>

      <PageSection title="Parser preview">
        {draftActionMessage && (
          <div className="success-banner" role="status">
            {draftActionMessage}
          </div>
        )}
        {draftActionError && (
          <div className="status-banner" role="alert">
            {draftActionError}
          </div>
        )}
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
          <ReceiptParserPreview
            draft={parsedDraft}
            isSaving={draftActionStatus === "saving"}
            onSaveDraft={() => void handleSaveDraft()}
          />
        )}
      </PageSection>

      <PageSection title="Saved drafts">
        {sortedReceiptDrafts.length > 0 ? (
          <div className="item-list">
            {sortedReceiptDrafts.map((draft) => (
              <article className="list-row receipt-draft-row" key={draft.id}>
                <div>
                  <strong>{draft.merchant ?? "Unknown merchant"}</strong>
                  <span>
                    {draft.date ?? "No date"} · {draftItemCounts.get(draft.id) ?? 0}{" "}
                    items · {formatReceiptDraftStatus(draft.status)} ·{" "}
                    {formatConfidence(draft.confidence)}
                  </span>
                  {draft.sourceMetadata && (
                    <small>{formatSourceMetadata(draft.sourceMetadata)}</small>
                  )}
                </div>
                <b>
                  {formatOptionalDisplayAmount(
                    draft.total,
                    draft.currency,
                    currencySettings,
                  )}
                </b>
                <div className="row-actions">
                  {deleteDraftCandidateId === draft.id ? (
                    <>
                      <button
                        className="danger-button"
                        disabled={draftActionStatus === "deleting"}
                        onClick={() => void confirmDeleteDraft(draft.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        Confirm delete
                      </button>
                      <button
                        className="secondary-button"
                        disabled={draftActionStatus === "deleting"}
                        onClick={() => setDeleteDraftCandidateId(undefined)}
                        type="button"
                      >
                        <X aria-hidden="true" size={16} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        disabled={draftActionStatus !== "idle"}
                        onClick={() => openDraftReview(draft)}
                        type="button"
                      >
                        <Edit3 aria-hidden="true" size={16} />
                        Review draft
                      </button>
                      <button
                        className="secondary-button"
                        disabled={draftActionStatus !== "idle"}
                        onClick={() => setDeleteDraftCandidateId(draft.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        Delete draft
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No saved receipt drafts yet.</div>
        )}
      </PageSection>

      <PageSection title="Draft review">
        {selectedDraft && reviewForm ? (
          <div className="form-panel receipt-review-panel">
            {reviewFormError && (
              <div className="status-banner" role="alert">
                {reviewFormError}
              </div>
            )}

            <div className="section-heading">
              <div>
                <h2>{selectedDraft.merchant ?? "Unknown merchant"}</h2>
                <p>
                  {formatReceiptDraftStatus(reviewForm.status)} ·{" "}
                  {formatConfidence(selectedDraft.confidence)}
                </p>
              </div>
              <button
                aria-label="Close review"
                className="icon-button"
                onClick={closeDraftReview}
                title="Close review"
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            {selectedDraft.sourceMetadata && (
              <div className="receipt-source-panel">
                <strong>Source</strong>
                <span>{formatSourceMetadata(selectedDraft.sourceMetadata)}</span>
              </div>
            )}

            <div className="form-grid">
              <label className="field">
                <span>Merchant</span>
                <input
                  onChange={(event) =>
                    updateReviewFormValue("merchant", event.target.value)
                  }
                  value={reviewForm.merchant}
                />
              </label>

              <label className="field">
                <span>Receipt date</span>
                <input
                  onChange={(event) =>
                    updateReviewFormValue("date", event.target.value)
                  }
                  type="date"
                  value={reviewForm.date}
                />
              </label>

              <label className="field">
                <span>Receipt currency</span>
                <select
                  aria-label="Receipt currency"
                  onChange={(event) =>
                    updateReviewFormValue(
                      "currency",
                      event.target.value as SupportedCurrencyCode,
                    )
                  }
                  value={reviewForm.currency}
                >
                  {supportedCurrencyCodes.map((currencyCode) => (
                    <option key={currencyCode} value={currencyCode}>
                      {currencyCode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Receipt total</span>
                <input
                  inputMode="decimal"
                  min="0"
                  onChange={(event) =>
                    updateReviewFormValue("total", event.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={reviewForm.total}
                />
              </label>
            </div>

            <div
              className="receipt-review-total-panel"
              data-mismatch={reviewSummary.hasMismatch}
            >
              <strong>
                Item sum: {formatAmount(reviewSummary.itemSum, reviewForm.currency)}
              </strong>
              <span>
                Receipt total:{" "}
                {reviewSummary.receiptTotal === undefined
                  ? "Unknown"
                  : formatAmount(reviewSummary.receiptTotal, reviewForm.currency)}
              </span>
              {reviewSummary.hasMismatch && (
                <em>
                  Item sum does not match the receipt total. Review prices before
                  confirmation.
                </em>
              )}
            </div>

            <label className="field field-wide" htmlFor="review-raw-receipt-text">
              <span>Raw receipt text</span>
              <textarea
                id="review-raw-receipt-text"
                readOnly
                rows={6}
                value={selectedDraft.rawText}
              />
            </label>

            <div className="receipt-review-item-list">
              {reviewForm.items.length > 0 ? (
                reviewForm.items.map((item, index) => (
                  <article className="receipt-review-item-card" key={item.id}>
                    <div className="receipt-item-heading">
                      <div>
                        <strong>{item.rawName}</strong>
                        <span>{item.rawLine}</span>
                      </div>
                      <b>#{index + 1}</b>
                    </div>

                    <div className="form-grid receipt-review-item-grid">
                      <label className="field field-wide">
                        <span>Normalized name</span>
                        <input
                          onChange={(event) =>
                            updateReviewItemValue(
                              item.id,
                              "normalizedName",
                              event.target.value,
                            )
                          }
                          value={item.normalizedName}
                        />
                      </label>

                      <label className="field">
                        <span>Quantity</span>
                        <input
                          inputMode="decimal"
                          min="0"
                          onChange={(event) =>
                            updateReviewItemValue(
                              item.id,
                              "quantity",
                              event.target.value,
                            )
                          }
                          step="0.01"
                          type="number"
                          value={item.quantity}
                        />
                      </label>

                      <label className="field">
                        <span>Unit price</span>
                        <input
                          inputMode="decimal"
                          min="0"
                          onChange={(event) =>
                            updateReviewItemValue(
                              item.id,
                              "unitPrice",
                              event.target.value,
                            )
                          }
                          step="0.01"
                          type="number"
                          value={item.unitPrice}
                        />
                      </label>

                      <label className="field">
                        <span>Total price</span>
                        <input
                          inputMode="decimal"
                          min="0"
                          onChange={(event) =>
                            updateReviewItemValue(
                              item.id,
                              "totalPrice",
                              event.target.value,
                            )
                          }
                          step="0.01"
                          type="number"
                          value={item.totalPrice}
                        />
                      </label>

                      <label className="field">
                        <span>Category</span>
                        <select
                          aria-label={`Category for ${item.rawName}`}
                          onChange={(event) =>
                            updateReviewItemValue(
                              item.id,
                              "categoryId",
                              event.target.value,
                            )
                          }
                          value={item.categoryId}
                        >
                          {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field field-wide">
                        <span>Flags</span>
                        <input
                          onChange={(event) =>
                            updateReviewItemValue(
                              item.id,
                              "flagsText",
                              event.target.value,
                            )
                          }
                          placeholder="low_confidence, uncategorized"
                          value={item.flagsText}
                        />
                      </label>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">No draft items to review.</div>
              )}
            </div>

            {reviewForm.status === "reviewed" && (
              <div className="receipt-confirm-panel">
                <div className="receipt-confirm-warning">
                  <AlertTriangle aria-hidden="true" size={18} />
                  <span>
                    Confirming creates one receipt-linked transaction and updates
                    Dashboard totals.
                  </span>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Transaction account</span>
                    <select
                      aria-label="Transaction account"
                      onChange={(event) =>
                        setConfirmationAccountId(event.target.value)
                      }
                      value={confirmationAccountId}
                    >
                      <option value="">Select account</option>
                      {activeAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Transaction category</span>
                    <select
                      aria-label="Transaction category"
                      onChange={(event) =>
                        setConfirmationCategoryId(event.target.value)
                      }
                      value={confirmationCategoryId}
                    >
                      <option value="">Select category</option>
                      {transactionCategoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="primary-button"
                    disabled={draftActionStatus === "confirming"}
                    onClick={() => void handleConfirmDraft()}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" size={18} />
                    {draftActionStatus === "confirming"
                      ? "Confirming"
                      : "Confirm receipt"}
                  </button>
                </div>
              </div>
            )}

            {reviewForm.status === "confirmed" && (
              <div className="receipt-confirmed-panel">
                <Link2 aria-hidden="true" size={18} />
                <div>
                  <strong>Confirmed receipt</strong>
                  {linkedTransaction ? (
                    <span>
                      Linked transaction:{" "}
                      {formatLinkedTransactionSummary(
                        linkedTransaction,
                        currencySettings,
                      )}
                    </span>
                  ) : (
                    <span>Linked transaction is saved but not loaded in this view.</span>
                  )}
                  {linkedReceipt && <small>Receipt ID: {linkedReceipt.id}</small>}
                </div>
              </div>
            )}

            {reviewForm.status !== "confirmed" && (
              <div className="form-actions">
                <button
                  className="primary-button"
                  disabled={draftActionStatus !== "idle"}
                  onClick={() => void saveDraftReview()}
                  type="button"
                >
                  <Save aria-hidden="true" size={18} />
                  {draftActionStatus === "updating" ? "Saving" : "Save changes"}
                </button>
                <button
                  className="secondary-button"
                  disabled={draftActionStatus !== "idle"}
                  onClick={() => void saveDraftReview("reviewed")}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" size={18} />
                  Mark reviewed
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">Open a saved draft to review it.</div>
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
              <b>
                {formatOptionalDisplayAmount(
                  receipt.total,
                  receipt.currency,
                  currencySettings,
                )}
              </b>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}

function ReceiptParserPreview({
  draft,
  isSaving,
  onSaveDraft,
}: {
  draft: ParsedReceiptDraft;
  isSaving: boolean;
  onSaveDraft: () => void;
}) {
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

      <div className="form-actions">
        <button
          className="primary-button"
          disabled={isSaving}
          onClick={onSaveDraft}
          type="button"
        >
          <Save aria-hidden="true" size={18} />
          {isSaving ? "Saving draft" : "Save draft"}
        </button>
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

const knownReceiptDraftItemFlags: ReceiptDraftItemFlag[] = [
  "low_confidence",
  "unclear_line",
  "discount_line",
  "fee_line",
  "tax_line",
  "uncategorized",
  "quantity_uncertain",
  "unit_price_uncertain",
];

function draftToReviewFormValues(
  draft: ReceiptDraft,
  items: ReceiptDraftItem[],
): DraftReviewFormValues {
  return {
    currency: toSupportedCurrencyCode(draft.currency),
    date: draft.date ?? "",
    items: items.map((item) => ({
      categoryId: item.categoryId,
      confidence: item.confidence,
      flagsText: item.flags.join(", "),
      id: item.id,
      kind: item.kind,
      normalizedName: item.normalizedName,
      quantity: item.quantity === undefined ? "" : String(item.quantity),
      rawLine: item.rawLine,
      rawName: item.rawName,
      tags: [...item.tags],
      totalPrice: String(item.totalPrice),
      unitPrice: item.unitPrice === undefined ? "" : String(item.unitPrice),
    })),
    merchant: draft.merchant ?? "",
    status: draft.status,
    total: draft.total === undefined ? "" : String(draft.total),
  };
}

function reviewFormValuesToUpdateInput(
  values: DraftReviewFormValues,
):
  | {
      data: ReceiptDraftUpdateInput;
      ok: true;
    }
  | {
      errorMessage: string;
      ok: false;
    } {
  const receiptTotal = parseOptionalMoney(values.total);

  if (receiptTotal === "invalid") {
    return {
      errorMessage: "Receipt total must be a valid non-negative number.",
      ok: false,
    };
  }

  const items: ReceiptDraftUpdateInput["items"] = [];

  for (const item of values.items) {
    const quantity = parseOptionalMoney(item.quantity);
    const unitPrice = parseOptionalMoney(item.unitPrice);
    const totalPrice = parseRequiredMoney(item.totalPrice);

    if (!item.normalizedName.trim()) {
      return {
        errorMessage: "Every item needs a normalized name.",
        ok: false,
      };
    }

    if (quantity === "invalid") {
      return {
        errorMessage: `${item.rawName} quantity must be a valid non-negative number.`,
        ok: false,
      };
    }

    if (unitPrice === "invalid") {
      return {
        errorMessage: `${item.rawName} unit price must be a valid non-negative number.`,
        ok: false,
      };
    }

    if (totalPrice === "invalid") {
      return {
        errorMessage: `${item.rawName} total price must be a valid non-negative number.`,
        ok: false,
      };
    }

    items.push({
      categoryId: item.categoryId,
      confidence: item.confidence,
      flags: parseFlags(item.flagsText),
      id: item.id,
      kind: item.kind,
      normalizedName: item.normalizedName.trim(),
      quantity,
      tags: [...item.tags],
      totalPrice,
      unitPrice,
    });
  }

  return {
    data: {
      currency: values.currency,
      date: values.date || undefined,
      items,
      merchant: values.merchant,
      status: values.status,
      total: receiptTotal,
    },
    ok: true,
  };
}

function getReviewSummary(values: DraftReviewFormValues): {
  hasMismatch: boolean;
  itemSum: number;
  receiptTotal?: number;
} {
  const itemSum = roundMoney(
    values.items.reduce((sum, item) => {
      const amount = Number(item.totalPrice);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0),
  );
  const receiptTotal = parseOptionalMoney(values.total);

  if (receiptTotal === "invalid" || receiptTotal === undefined) {
    return {
      hasMismatch: false,
      itemSum,
      receiptTotal: undefined,
    };
  }

  return {
    hasMismatch: Math.abs(itemSum - receiptTotal) > 0.01,
    itemSum,
    receiptTotal,
  };
}

function validateReviewFormForConfirmation(
  values: DraftReviewFormValues,
):
  | {
      ok: true;
    }
  | {
      errorMessage: string;
      ok: false;
    } {
  const receiptTotal = parseOptionalMoney(values.total);

  if (!values.merchant.trim()) {
    return {
      errorMessage: "Merchant is required before confirming this receipt.",
      ok: false,
    };
  }

  if (!values.date) {
    return {
      errorMessage: "Receipt date is required before confirmation.",
      ok: false,
    };
  }

  if (receiptTotal === "invalid" || receiptTotal === undefined || receiptTotal <= 0) {
    return {
      errorMessage: "Receipt total must be greater than zero before confirmation.",
      ok: false,
    };
  }

  return {
    ok: true,
  };
}

function getDefaultConfirmationAccountId(
  accounts: Account[],
  currencyCode: string,
): string {
  const activeAccounts = accounts.filter((account) => !account.isArchived);

  return (
    activeAccounts.find((account) => account.currency === currencyCode)?.id ??
    activeAccounts[0]?.id ??
    ""
  );
}

function getDefaultReceiptTransactionCategoryId(categories: Category[]): string {
  const expenseCategories = categories.filter(
    (category) => category.type === "expense",
  );
  const groceryCategory = expenseCategories.find((category) => {
    const categoryKey = `${category.id} ${category.name}`.toLowerCase();
    return categoryKey.includes("grocer") || categoryKey.includes("food");
  });

  return groceryCategory?.id ?? expenseCategories[0]?.id ?? "";
}

function formatLinkedTransactionSummary(
  transaction: Transaction,
  currencySettings: CurrencySettings,
): string {
  return `${transaction.merchant} · ${transaction.date} · ${formatDisplayMoney(
    transaction.amount,
    transaction.currency,
    currencySettings,
  )} (${formatCurrencyAmount(transaction.amount, transaction.currency)})`;
}

function parseFlags(value: string): ReceiptDraftItemFlag[] {
  const knownFlags = new Set<ReceiptDraftItemFlag>(knownReceiptDraftItemFlags);

  return [...new Set(
    value
      .split(",")
      .map((flag) => flag.trim() as ReceiptDraftItemFlag)
      .filter((flag) => knownFlags.has(flag)),
  )];
}

function parseOptionalMoney(value: string): number | undefined | "invalid" {
  if (!value.trim()) {
    return undefined;
  }

  return parseRequiredMoney(value);
}

function parseRequiredMoney(value: string): number | "invalid" {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return "invalid";
  }

  return roundMoney(amount);
}

function toSupportedCurrencyCode(value: string): SupportedCurrencyCode {
  return supportedCurrencyCodes.includes(value as SupportedCurrencyCode)
    ? (value as SupportedCurrencyCode)
    : "USD";
}

function formatReceiptStatus(status: ReceiptStatus): string {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReceiptDraftStatus(status: ReceiptDraftStatus): string {
  return formatTitle(status);
}

function formatSourceMetadata(metadata: ReceiptDraftSourceMetadata): string {
  const parts = [formatTitle(metadata.kind)];

  if (metadata.title) {
    parts.push(metadata.title);
  }

  if (metadata.sender) {
    parts.push(`From ${metadata.sender}`);
  }

  if (metadata.receivedAt) {
    parts.push(`Received ${metadata.receivedAt}`);
  }

  if (metadata.providerName) {
    parts.push(metadata.providerName);
  }

  return parts.join(" · ");
}

function formatAmount(amount: number | undefined, currencyCode: string): string {
  if (amount === undefined) {
    return "Unknown";
  }

  return formatCurrencyAmount(amount, currencyCode);
}

function formatOptionalDisplayAmount(
  amount: number | undefined,
  currencyCode: string,
  currencySettings: CurrencySettings,
): string {
  if (amount === undefined) {
    return "Unknown";
  }

  return formatDisplayMoney(amount, currencyCode, currencySettings);
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
