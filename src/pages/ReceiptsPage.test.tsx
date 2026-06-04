import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  seedAccounts,
  seedCategories,
  seedReceiptItems,
  seedReceipts,
  seedTransactions,
} from "../data/seedData";
import { defaultCurrencySettings } from "../domain/currencySettings";
import { type ReceiptDraft, type ReceiptDraftItem } from "../domain/models";
import { mockEmailReceiptText } from "../receipt-ingestion/fixtures";
import { groceryReceiptText, mismatchReceiptText } from "../receipt-parser/fixtures";
import { type ParsedReceiptDraft } from "../receipt-parser/types";
import {
  type ManualAiExtractionInput,
  type ReceiptDraftActionResult,
  type ReceiptDraftConfirmationInput,
  type ReceiptDraftUpdateInput,
} from "../services/financeDataService";
import { ReceiptsPage } from "./ReceiptsPage";

afterEach(() => {
  cleanup();
});

const savedDraft: ReceiptDraft = {
  id: "receipt-draft-test",
  confidence: 0.87,
  currency: "USD",
  date: "2026-06-03",
  merchant: "GREEN MARKET",
  rawText: groceryReceiptText,
  source: "pasted_text",
  status: "draft",
  total: 15.5,
  warnings: [],
  createdAt: "2026-06-03T12:00:00.000Z",
  updatedAt: "2026-06-03T12:00:00.000Z",
};

const savedDraftItem: ReceiptDraftItem = {
  id: "receipt-draft-item-test",
  categoryId: "dairy",
  confidence: 0.79,
  draftId: savedDraft.id,
  flags: [],
  kind: "item",
  normalizedName: "milk",
  quantity: 1,
  rawLine: "Milk 1 x 4.20",
  rawName: "Milk",
  tags: ["dairy", "groceries"],
  totalPrice: 4.2,
  unitPrice: 4.2,
};

const aiDraft: ReceiptDraft = {
  ...savedDraft,
  confidence: 0.84,
  currency: "USD",
  date: "2026-06-04",
  id: "receipt-draft-ai-test",
  merchant: "Fresh Market",
  rawText: mockEmailReceiptText,
  source: "ai_extraction_mock",
  sourceMetadata: {
    kind: "gmail",
    providerName: "local-mock-ai-extractor",
    receivedAt: "2026-06-04T10:15:00.000Z",
    sender: "receipts@fresh.example",
    title: "Fresh Market receipt",
  },
  total: 5,
  warnings: ["Simulated AI extraction from Gmail."],
};

const aiDraftItem: ReceiptDraftItem = {
  ...savedDraftItem,
  categoryId: "dairy",
  confidence: 0.78,
  draftId: aiDraft.id,
  id: "receipt-draft-item-ai-test",
  normalizedName: "milk",
  quantity: 2,
  rawLine: "Milk 2 x 3.00",
  rawName: "Milk",
  tags: ["dairy", "groceries"],
  totalPrice: 3,
  unitPrice: 1.5,
};

const reviewedDraft: ReceiptDraft = {
  ...savedDraft,
  status: "reviewed",
};

const confirmedDraft: ReceiptDraft = {
  ...reviewedDraft,
  confirmedReceiptId: "receipt-confirmed-test",
  linkedTransactionId: "tx-confirmed-test",
  status: "confirmed",
};

const linkedTransaction = {
  ...seedTransactions[0],
  accountId: "account-card",
  amount: reviewedDraft.total ?? 0,
  categoryId: "groceries",
  currency: reviewedDraft.currency,
  date: reviewedDraft.date ?? "2026-06-03",
  id: "tx-confirmed-test",
  merchant: reviewedDraft.merchant ?? "GREEN MARKET",
  receiptId: "receipt-confirmed-test",
};

interface RenderReceiptsPageOptions {
  onDeleteDraft?: (draftId: string) => Promise<ReceiptDraftActionResult>;
  onConfirmDraft?: (
    draftId: string,
    input: ReceiptDraftConfirmationInput,
  ) => Promise<ReceiptDraftActionResult>;
  onSaveDraft?: (draft: ParsedReceiptDraft) => Promise<ReceiptDraftActionResult>;
  onSimulateAiExtraction?: (
    input: ManualAiExtractionInput,
  ) => Promise<ReceiptDraftActionResult>;
  onUpdateDraft?: (
    draftId: string,
    input: ReceiptDraftUpdateInput,
  ) => Promise<ReceiptDraftActionResult>;
  receiptDraftItems?: ReceiptDraftItem[];
  receiptDrafts?: ReceiptDraft[];
}

function renderReceiptsPage(options: RenderReceiptsPageOptions = {}) {
  render(
    <ReceiptsPage
      accounts={seedAccounts}
      categories={seedCategories}
      currencySettings={defaultCurrencySettings}
      onConfirmDraft={options.onConfirmDraft ?? (async () => ({ ok: true }))}
      onDeleteDraft={options.onDeleteDraft ?? (async () => ({ ok: true }))}
      onSaveDraft={options.onSaveDraft ?? (async () => ({ ok: true }))}
      onSimulateAiExtraction={
        options.onSimulateAiExtraction ?? (async () => ({ ok: true }))
      }
      onUpdateDraft={options.onUpdateDraft ?? (async () => ({ ok: true }))}
      receiptDraftItems={options.receiptDraftItems ?? []}
      receiptDrafts={options.receiptDrafts ?? []}
      receiptItems={seedReceiptItems}
      receipts={seedReceipts}
      transactions={seedTransactions}
    />,
  );
}

function createUpdateDraftMock() {
  return vi.fn(
    async (
      draftId: string,
      input: ReceiptDraftUpdateInput,
    ): Promise<ReceiptDraftActionResult> => ({
      draft: {
        draft: {
          ...savedDraft,
          currency: input.currency,
          date: input.date,
          id: draftId,
          merchant: input.merchant,
          status: input.status,
          total: input.total,
          updatedAt: "2026-06-03T12:30:00.000Z",
        },
        items: input.items.map((item) => ({
          ...savedDraftItem,
          categoryId: item.categoryId,
          confidence: item.confidence,
          flags: item.flags,
          id: item.id,
          kind: item.kind,
          normalizedName: item.normalizedName,
          quantity: item.quantity,
          tags: item.tags,
          totalPrice: item.totalPrice,
          unitPrice: item.unitPrice,
        })),
      },
      ok: true,
    }),
  );
}

function createConfirmDraftMock() {
  return vi.fn(
    async (
      draftId: string,
      input: ReceiptDraftConfirmationInput,
    ): Promise<ReceiptDraftActionResult> => ({
      confirmation: {
        draft: {
          ...confirmedDraft,
          id: draftId,
        },
        items: [
          {
            ...seedReceiptItems[0],
            flags: [...savedDraftItem.flags],
            id: "item-confirmed-test",
            receiptId: "receipt-confirmed-test",
          },
        ],
        receipt: {
          ...seedReceipts[1],
          currency: reviewedDraft.currency,
          date: reviewedDraft.date,
          id: "receipt-confirmed-test",
          merchant: reviewedDraft.merchant,
          status: "confirmed",
          total: reviewedDraft.total,
          transactionId: "tx-confirmed-test",
        },
        transaction: {
          ...linkedTransaction,
          accountId: input.accountId,
          categoryId: input.categoryId,
        },
      },
      draft: {
        draft: {
          ...confirmedDraft,
          id: draftId,
        },
        items: [savedDraftItem],
      },
      ok: true,
    }),
  );
}

describe("ReceiptsPage parser preview", () => {
  it("shows a validation error before parsing empty receipt text", async () => {
    const user = userEvent.setup();
    renderReceiptsPage();

    await user.click(screen.getByRole("button", { name: "Parse receipt" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Paste receipt text before parsing.",
    );
  });

  it("parses sample receipt text into a structured preview", async () => {
    const user = userEvent.setup();
    renderReceiptsPage();

    await user.click(screen.getByRole("button", { name: "Use sample" }));
    expect(screen.getByLabelText("Raw receipt text")).toHaveValue(groceryReceiptText);

    await user.click(screen.getByRole("button", { name: "Parse receipt" }));

    expect(screen.getByText("GREEN MARKET")).toBeInTheDocument();
    expect(screen.getByText("2026-06-03")).toBeInTheDocument();
    expect(screen.getByText("No parser warnings.")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Cottage cheese")).toBeInTheDocument();
    expect(screen.getAllByText("Dairy").length).toBeGreaterThan(0);
  });

  it("saves parsed preview through the draft action", async () => {
    const user = userEvent.setup();
    const onSaveDraft = vi.fn(
      async (_draft: ParsedReceiptDraft): Promise<ReceiptDraftActionResult> => ({
        ok: Boolean(_draft.rawText),
      }),
    );
    renderReceiptsPage({ onSaveDraft });

    await user.click(screen.getByRole("button", { name: "Use sample" }));
    await user.click(screen.getByRole("button", { name: "Parse receipt" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onSaveDraft.mock.calls[0]?.[0].merchantName).toBe("GREEN MARKET");
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved.");
    expect(screen.getByLabelText("Raw receipt text")).toHaveValue("");
  });

  it("shows a validation error before simulating AI extraction without source text", async () => {
    const user = userEvent.setup();
    renderReceiptsPage();

    await user.click(
      screen.getByRole("button", { name: "Simulate AI extraction" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Paste email or document receipt text before simulating AI extraction.",
    );
  });

  it("saves mock AI extraction as a draft and opens the existing review flow", async () => {
    const user = userEvent.setup();
    const onSimulateAiExtraction = vi.fn(
      async (): Promise<ReceiptDraftActionResult> => ({
        draft: {
          draft: aiDraft,
          items: [aiDraftItem],
        },
        ok: true,
      }),
    );
    renderReceiptsPage({ onSimulateAiExtraction });

    await user.click(screen.getByRole("button", { name: "Use email sample" }));
    expect(screen.getByLabelText("Email or document receipt text")).toHaveValue(
      mockEmailReceiptText,
    );

    await user.click(
      screen.getByRole("button", { name: "Simulate AI extraction" }),
    );

    expect(onSimulateAiExtraction).toHaveBeenCalledWith({
      rawText: mockEmailReceiptText,
      sourceKind: "gmail",
      sourceReceivedAt: "2026-06-04T10:15:00.000Z",
      sourceSender: "receipts@fresh.example",
      sourceTitle: "Fresh Market receipt",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "AI draft saved for review.",
    );
    expect(screen.getByRole("heading", { name: "Fresh Market" })).toBeVisible();
    expect(
      screen.getByText(/Gmail · Fresh Market receipt · From receipts@fresh.example/),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("Raw receipt text")[1]).toHaveValue(
      mockEmailReceiptText,
    );
  });

  it("surfaces mismatch parser warnings for review", async () => {
    const user = userEvent.setup();
    renderReceiptsPage();

    await user.type(screen.getByLabelText("Raw receipt text"), mismatchReceiptText);
    await user.click(screen.getByRole("button", { name: "Parse receipt" }));

    expect(screen.getAllByText("City Pharmacy").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/does not match receipt total/i),
    ).toBeInTheDocument();
  });

  it("clears pasted text and parsed preview", async () => {
    const user = userEvent.setup();
    renderReceiptsPage();

    await user.click(screen.getByRole("button", { name: "Use sample" }));
    await user.click(screen.getByRole("button", { name: "Parse receipt" }));
    expect(screen.getByText("GREEN MARKET")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByLabelText("Raw receipt text")).toHaveValue("");
    expect(
      screen.getByText("Paste receipt text to preview parser output."),
    ).toBeInTheDocument();
    expect(screen.queryByText("GREEN MARKET")).not.toBeInTheDocument();
  });

  it("lists and deletes a saved draft through confirmation", async () => {
    const user = userEvent.setup();
    const onDeleteDraft = vi.fn(async () => ({ ok: true }));
    renderReceiptsPage({
      onDeleteDraft,
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [savedDraft],
    });

    expect(screen.getByText("GREEN MARKET")).toBeInTheDocument();
    expect(screen.getByText(/1 items · Draft · 87%/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete draft" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(onDeleteDraft).toHaveBeenCalledWith(savedDraft.id);
    expect(screen.getByRole("status")).toHaveTextContent("Draft deleted.");
  });

  it("opens a saved draft for review with raw evidence and mismatch warning", async () => {
    const user = userEvent.setup();
    renderReceiptsPage({
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [savedDraft],
    });

    await user.click(screen.getByRole("button", { name: "Review draft" }));

    expect(screen.getByRole("heading", { name: "GREEN MARKET" })).toBeInTheDocument();
    expect(screen.getByLabelText("Merchant")).toHaveValue("GREEN MARKET");
    expect(screen.getByLabelText("Receipt currency")).toHaveValue("USD");
    expect(screen.getByText("Milk 1 x 4.20")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Raw receipt text")[1]).toHaveValue(
      groceryReceiptText,
    );
    expect(
      screen.getByText(/Item sum does not match the receipt total/i),
    ).toBeInTheDocument();
  });

  it("saves edited draft metadata through the draft update action", async () => {
    const user = userEvent.setup();
    const onUpdateDraft = createUpdateDraftMock();
    renderReceiptsPage({
      onUpdateDraft,
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [savedDraft],
    });

    await user.click(screen.getByRole("button", { name: "Review draft" }));
    await user.clear(screen.getByLabelText("Merchant"));
    await user.type(screen.getByLabelText("Merchant"), "Updated Market");
    await user.clear(screen.getByLabelText("Receipt date"));
    await user.type(screen.getByLabelText("Receipt date"), "2026-06-04");
    await user.selectOptions(screen.getByLabelText("Receipt currency"), "EUR");
    await user.clear(screen.getByLabelText("Receipt total"));
    await user.type(screen.getByLabelText("Receipt total"), "4.20");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onUpdateDraft).toHaveBeenCalledTimes(1);
    expect(onUpdateDraft.mock.calls[0]?.[0]).toBe(savedDraft.id);
    expect(onUpdateDraft.mock.calls[0]?.[1]).toMatchObject({
      currency: "EUR",
      date: "2026-06-04",
      merchant: "Updated Market",
      status: "draft",
      total: 4.2,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Draft changes saved.");
  });

  it("saves edited draft item fields through the draft update action", async () => {
    const user = userEvent.setup();
    const onUpdateDraft = createUpdateDraftMock();
    renderReceiptsPage({
      onUpdateDraft,
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [savedDraft],
    });

    await user.click(screen.getByRole("button", { name: "Review draft" }));
    await user.clear(screen.getByLabelText("Normalized name"));
    await user.type(screen.getByLabelText("Normalized name"), "organic milk");
    await user.clear(screen.getByLabelText("Total price"));
    await user.type(screen.getByLabelText("Total price"), "5.50");
    await user.selectOptions(
      screen.getByLabelText(`Category for ${savedDraftItem.rawName}`),
      "groceries",
    );
    await user.clear(screen.getByLabelText("Flags"));
    await user.type(
      screen.getByLabelText("Flags"),
      "low_confidence, uncategorized",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onUpdateDraft.mock.calls[0]?.[1].items[0]).toMatchObject({
      categoryId: "groceries",
      flags: ["low_confidence", "uncategorized"],
      id: savedDraftItem.id,
      normalizedName: "organic milk",
      totalPrice: 5.5,
    });
  });

  it("marks a saved draft as reviewed", async () => {
    const user = userEvent.setup();
    const onUpdateDraft = createUpdateDraftMock();
    renderReceiptsPage({
      onUpdateDraft,
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [savedDraft],
    });

    await user.click(screen.getByRole("button", { name: "Review draft" }));
    await user.click(screen.getByRole("button", { name: "Mark reviewed" }));

    expect(onUpdateDraft.mock.calls[0]?.[1].status).toBe("reviewed");
    expect(screen.getByRole("status")).toHaveTextContent("Draft marked reviewed.");
    expect(screen.getByText(/Reviewed · 87%/i)).toBeInTheDocument();
  });

  it("does not show confirm receipt for unreviewed drafts", async () => {
    const user = userEvent.setup();
    renderReceiptsPage({
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [savedDraft],
    });

    await user.click(screen.getByRole("button", { name: "Review draft" }));

    expect(
      screen.queryByRole("button", { name: "Confirm receipt" }),
    ).not.toBeInTheDocument();
  });

  it("confirms a reviewed draft and shows the linked transaction", async () => {
    const user = userEvent.setup();
    const onConfirmDraft = createConfirmDraftMock();
    const onUpdateDraft = createUpdateDraftMock();
    renderReceiptsPage({
      onConfirmDraft,
      onUpdateDraft,
      receiptDraftItems: [savedDraftItem],
      receiptDrafts: [reviewedDraft],
    });

    await user.click(screen.getByRole("button", { name: "Review draft" }));

    expect(
      screen.getByText(/creates one receipt-linked transaction/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm receipt" })).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText("Transaction account"),
      "account-card",
    );
    await user.click(screen.getByRole("button", { name: "Confirm receipt" }));

    expect(onUpdateDraft).toHaveBeenCalledWith(
      reviewedDraft.id,
      expect.objectContaining({
        status: "reviewed",
      }),
    );
    expect(onConfirmDraft).toHaveBeenCalledWith(reviewedDraft.id, {
      accountId: "account-card",
      categoryId: "groceries",
    });
    expect(await screen.findByText("Confirmed receipt")).toBeInTheDocument();
    expect(screen.getByText(/Linked transaction: GREEN MARKET/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Receipt confirmed.");
  });
});
