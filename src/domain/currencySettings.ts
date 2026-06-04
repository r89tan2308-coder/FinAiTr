import {
  type CurrencyCode,
  type CurrencySettings,
  type SupportedCurrencyCode,
} from "./models";

export const supportedCurrencyCodes = ["USD", "RUB", "EUR", "GBP"] as const;

export const defaultCurrencySettings: CurrencySettings = {
  displayCurrency: "RUB",
  ratesToRub: {
    USD: 72.5597,
    RUB: 1,
    EUR: 84.6096,
    GBP: 97.4985,
  },
  source:
    "Manual local rates. Initial seed from Bank of Russia official rates for 2026-06-03.",
  updatedAt: "2026-06-03T00:00:00.000Z",
};

export class CurrencySettingsValidationError extends Error {
  constructor(message = "Currency settings are invalid.") {
    super(message);
    this.name = "CurrencySettingsValidationError";
  }
}

export function normalizeSupportedCurrencyCode(
  value: string,
): SupportedCurrencyCode | undefined {
  const normalized = value.trim().toUpperCase();

  return isSupportedCurrencyCode(normalized) ? normalized : undefined;
}

export function isSupportedCurrencyCode(
  value: string,
): value is SupportedCurrencyCode {
  return supportedCurrencyCodes.includes(value as SupportedCurrencyCode);
}

export function normalizeCurrencySettings(
  settings: CurrencySettings,
): CurrencySettings {
  const displayCurrency =
    normalizeSupportedCurrencyCode(settings.displayCurrency) ??
    defaultCurrencySettings.displayCurrency;
  const ratesToRub = supportedCurrencyCodes.reduce(
    (rates, currencyCode) => {
      const rawRate = settings.ratesToRub[currencyCode];
      rates[currencyCode] = currencyCode === "RUB" ? 1 : Number(rawRate);
      return rates;
    },
    {} as Record<SupportedCurrencyCode, number>,
  );

  return {
    displayCurrency,
    ratesToRub,
    source: settings.source.trim() || defaultCurrencySettings.source,
    updatedAt: settings.updatedAt || new Date().toISOString(),
  };
}

export function assertValidCurrencySettings(settings: CurrencySettings): void {
  if (!isSupportedCurrencyCode(settings.displayCurrency)) {
    throw new CurrencySettingsValidationError("Display currency is not supported.");
  }

  supportedCurrencyCodes.forEach((currencyCode) => {
    const rate = settings.ratesToRub[currencyCode];

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new CurrencySettingsValidationError(
        `${currencyCode} rate must be greater than zero.`,
      );
    }
  });

  if (settings.ratesToRub.RUB !== 1) {
    throw new CurrencySettingsValidationError("RUB rate must be 1.");
  }
}

export function parseCurrencySettings(value: string | undefined): CurrencySettings {
  if (!value) {
    return defaultCurrencySettings;
  }

  try {
    const parsed = JSON.parse(value) as CurrencySettings;
    const normalized = normalizeCurrencySettings({
      ...defaultCurrencySettings,
      ...parsed,
      ratesToRub: {
        ...defaultCurrencySettings.ratesToRub,
        ...parsed.ratesToRub,
      },
    });

    assertValidCurrencySettings(normalized);
    return normalized;
  } catch {
    return defaultCurrencySettings;
  }
}

export function serializeCurrencySettings(settings: CurrencySettings): string {
  const normalized = normalizeCurrencySettings(settings);
  assertValidCurrencySettings(normalized);

  return JSON.stringify(normalized);
}

export function convertMoney(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: SupportedCurrencyCode,
  settings: CurrencySettings,
): number {
  const from = normalizeSupportedCurrencyCode(fromCurrency);
  const normalizedSettings = normalizeCurrencySettings(settings);

  if (!from) {
    return roundMoney(amount);
  }

  const fromRate = normalizedSettings.ratesToRub[from];
  const toRate = normalizedSettings.ratesToRub[toCurrency];

  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || toRate <= 0) {
    return roundMoney(amount);
  }

  return roundMoney((amount * fromRate) / toRate);
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: CurrencyCode,
): string {
  try {
    return new Intl.NumberFormat(localeForCurrency(currencyCode), {
      currency: currencyCode,
      style: "currency",
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function formatDisplayMoney(
  amount: number,
  sourceCurrency: CurrencyCode,
  settings: CurrencySettings,
): string {
  const displayCurrency = normalizeCurrencySettings(settings).displayCurrency;

  return formatCurrencyAmount(
    convertMoney(amount, sourceCurrency, displayCurrency, settings),
    displayCurrency,
  );
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function localeForCurrency(currencyCode: CurrencyCode): string {
  if (currencyCode === "RUB") {
    return "ru-RU";
  }

  if (currencyCode === "GBP") {
    return "en-GB";
  }

  if (currencyCode === "EUR") {
    return "de-DE";
  }

  return "en-US";
}
