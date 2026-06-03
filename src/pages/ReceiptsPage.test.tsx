import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { seedReceiptItems, seedReceipts } from "../data/seedData";
import { groceryReceiptText, mismatchReceiptText } from "../receipt-parser/fixtures";
import { ReceiptsPage } from "./ReceiptsPage";

afterEach(() => {
  cleanup();
});

function renderReceiptsPage() {
  render(<ReceiptsPage receiptItems={seedReceiptItems} receipts={seedReceipts} />);
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
});
