import { describe, expect, it } from "vitest";
import {
  assertValidCurrencySettings,
  convertMoney,
  defaultCurrencySettings,
  formatCurrencyAmount,
  parseCurrencySettings,
  serializeCurrencySettings,
} from "./currencySettings";

describe("currency settings helpers", () => {
  it("converts supported currencies through RUB rates", () => {
    expect(convertMoney(10, "USD", "RUB", defaultCurrencySettings)).toBe(725.6);
    expect(convertMoney(1000, "RUB", "EUR", defaultCurrencySettings)).toBe(11.82);
    expect(convertMoney(50, "GBP", "USD", defaultCurrencySettings)).toBe(67.19);
  });

  it("formats supported currencies with Intl", () => {
    expect(formatCurrencyAmount(1250, "RUB")).toContain("1");
    expect(formatCurrencyAmount(12.5, "USD")).toBe("$12.50");
  });

  it("round-trips persisted settings and rejects invalid rates", () => {
    const serialized = serializeCurrencySettings(defaultCurrencySettings);

    expect(parseCurrencySettings(serialized)).toEqual(defaultCurrencySettings);
    expect(() =>
      assertValidCurrencySettings({
        ...defaultCurrencySettings,
        ratesToRub: {
          ...defaultCurrencySettings.ratesToRub,
          EUR: 0,
        },
      }),
    ).toThrow("EUR rate must be greater than zero.");
  });
});
