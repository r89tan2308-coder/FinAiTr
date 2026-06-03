import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App shell", () => {
  it("renders the dashboard first and switches to receipts", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Receipts" })[0]);

    expect(screen.getByRole("heading", { name: "Receipts" })).toBeInTheDocument();
    expect(screen.getByText("Receipt inbox")).toBeInTheDocument();
  });
});

