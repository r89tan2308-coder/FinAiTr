import {
  type ReceiptTextCandidate,
  type ReceiptTextSourceKind,
  type ReceiptTextSourceProvider,
} from "../receipt-ingestion/types";

export type GoogleReceiptSourceKind = Extract<
  ReceiptTextSourceKind,
  "gmail" | "google_drive" | "google_docs"
>;

export interface GoogleIntegrationRuntimeEnv {
  readonly VITE_GOOGLE_BACKEND_BASE_URL?: string | boolean;
  readonly VITE_GOOGLE_CLIENT_ID?: string | boolean;
  readonly VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_GMAIL_IMPORT_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_INTEGRATION_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_REDIRECT_URI?: string | boolean;
}

export interface GoogleIntegrationConfig {
  readonly backendBaseUrlConfigured: boolean;
  readonly clientIdConfigured: boolean;
  readonly driveFileImportEnabled: boolean;
  readonly envNames: typeof googleIntegrationEnvNames;
  readonly featureEnabled: boolean;
  readonly gmailImportEnabled: boolean;
  readonly missingRequiredEnv: string[];
  readonly realProviderCallsAllowed: false;
  readonly redirectUriConfigured: boolean;
}

export interface GoogleIntegrationStatus {
  readonly canConnect: false;
  readonly detailLines: string[];
  readonly isConnected: false;
  readonly label: "Google integration planned / not connected";
  readonly realProviderCallsAllowed: false;
  readonly state: "disabled" | "readiness_only" | "misconfigured";
}

export const googleIntegrationEnvNames = {
  backendBaseUrl: "VITE_GOOGLE_BACKEND_BASE_URL",
  clientId: "VITE_GOOGLE_CLIENT_ID",
  driveFileImportEnabled: "VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED",
  gmailImportEnabled: "VITE_GOOGLE_GMAIL_IMPORT_ENABLED",
  integrationEnabled: "VITE_GOOGLE_INTEGRATION_ENABLED",
  redirectUri: "VITE_GOOGLE_REDIRECT_URI",
} as const;

const googleReceiptSourceKinds: GoogleReceiptSourceKind[] = [
  "gmail",
  "google_drive",
  "google_docs",
];

export function readGoogleIntegrationConfig(): GoogleIntegrationConfig {
  return buildGoogleIntegrationConfig(import.meta.env);
}

export function buildGoogleIntegrationConfig(
  env: GoogleIntegrationRuntimeEnv = {},
): GoogleIntegrationConfig {
  const featureEnabled = readBooleanEnv(env.VITE_GOOGLE_INTEGRATION_ENABLED);
  const clientIdConfigured = hasPlaceholderValue(env.VITE_GOOGLE_CLIENT_ID);
  const redirectUriConfigured = hasPlaceholderValue(env.VITE_GOOGLE_REDIRECT_URI);
  const backendBaseUrlConfigured = hasPlaceholderValue(
    env.VITE_GOOGLE_BACKEND_BASE_URL,
  );
  const missingRequiredEnv: string[] = [];

  if (featureEnabled && !clientIdConfigured) {
    missingRequiredEnv.push(googleIntegrationEnvNames.clientId);
  }

  if (featureEnabled && !redirectUriConfigured) {
    missingRequiredEnv.push(googleIntegrationEnvNames.redirectUri);
  }

  return {
    backendBaseUrlConfigured,
    clientIdConfigured,
    driveFileImportEnabled:
      featureEnabled && readBooleanEnv(env.VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED),
    envNames: googleIntegrationEnvNames,
    featureEnabled,
    gmailImportEnabled:
      featureEnabled && readBooleanEnv(env.VITE_GOOGLE_GMAIL_IMPORT_ENABLED),
    missingRequiredEnv,
    realProviderCallsAllowed: false,
    redirectUriConfigured,
  };
}

export function getGoogleIntegrationStatus(
  config: GoogleIntegrationConfig = readGoogleIntegrationConfig(),
): GoogleIntegrationStatus {
  return {
    canConnect: false,
    detailLines: [
      config.featureEnabled
        ? "Feature flag is set, but Phase 9C is readiness-only."
        : "Feature flag is off by default.",
      config.clientIdConfigured
        ? "Client ID placeholder is configured."
        : "Client ID placeholder is empty.",
      config.redirectUriConfigured
        ? "Redirect URI placeholder is configured."
        : "Redirect URI placeholder is empty.",
      config.backendBaseUrlConfigured
        ? "Backend base URL placeholder is configured."
        : "Backend base URL placeholder is empty.",
      "No OAuth flow, token storage, backend sync, or Google API calls are active.",
    ],
    isConnected: false,
    label: "Google integration planned / not connected",
    realProviderCallsAllowed: false,
    state:
      config.missingRequiredEnv.length > 0
        ? "misconfigured"
        : config.featureEnabled
          ? "readiness_only"
          : "disabled",
  };
}

export class DisabledGoogleReceiptSourceProvider
  implements ReceiptTextSourceProvider
{
  readonly kind: GoogleReceiptSourceKind;

  constructor(kind: GoogleReceiptSourceKind) {
    this.kind = kind;
  }

  async listCandidates(): Promise<ReceiptTextCandidate[]> {
    return [];
  }

  async getCandidateText(_candidateId: string): Promise<ReceiptTextCandidate> {
    void _candidateId;

    throw new Error(
      `${formatSourceKind(this.kind)} provider is disabled. Phase 9C does not call Google APIs.`,
    );
  }
}

export function createDisabledGoogleReceiptSourceProviders(): ReceiptTextSourceProvider[] {
  return googleReceiptSourceKinds.map(
    (kind) => new DisabledGoogleReceiptSourceProvider(kind),
  );
}

function readBooleanEnv(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function hasPlaceholderValue(value: string | boolean | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function formatSourceKind(kind: GoogleReceiptSourceKind): string {
  return kind
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
