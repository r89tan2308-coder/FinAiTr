import { type GoogleReceiptSourceKind } from "./googleIntegrationReadiness";

export type GoogleBackendCapability =
  | "oauth_callback"
  | "authorization_code_exchange"
  | "server_credential_storage"
  | "scheduled_sync"
  | "provider_revocation"
  | "server_side_deletion";

export type GoogleBackendEndpointName =
  | "oauthStart"
  | "oauthCallback"
  | "providerStatus"
  | "disconnect"
  | "listSourceCandidates"
  | "getSourceCandidateText"
  | "scheduledSyncStatus";

export type GoogleScopeSensitivity =
  | "non_sensitive"
  | "sensitive"
  | "restricted";

export interface GoogleBackendRuntimeEnv {
  readonly VITE_GOOGLE_BACKEND_AUTH_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_BACKEND_BASE_URL?: string | boolean;
  readonly VITE_GOOGLE_BACKEND_REVOCATION_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_BACKEND_SYNC_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_CLIENT_ID?: string | boolean;
  readonly VITE_GOOGLE_INTEGRATION_ENABLED?: string | boolean;
  readonly VITE_GOOGLE_REDIRECT_URI?: string | boolean;
}

export interface GoogleBackendReadiness {
  readonly backendAuthRequested: boolean;
  readonly backendBaseUrlConfigured: boolean;
  readonly backendRequiredForProduction: true;
  readonly backendRevocationRequested: boolean;
  readonly backendSyncRequested: boolean;
  readonly credentialPersistenceAllowed: false;
  readonly endpointCallsAllowed: false;
  readonly missingRequiredEnv: string[];
  readonly networkCallsAllowed: false;
  readonly noOpReason: string;
  readonly state: "disabled" | "requested_but_disabled" | "misconfigured";
}

export interface GoogleBackendConnectionStatus {
  readonly connected: false;
  readonly endpointCallsAllowed: false;
  readonly networkCallsAllowed: false;
  readonly provider: "google";
  readonly reason: string;
}

export interface GoogleBackendDisconnectResult {
  readonly disconnected: false;
  readonly localCredentialStateDeleted: false;
  readonly providerGrantRevoked: false;
  readonly reason: string;
}

export interface GoogleBackendEndpointDefinition {
  readonly disabled: true;
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly requiredCapability: GoogleBackendCapability;
}

export interface GoogleOAuthStartRequest {
  readonly sourceKind: GoogleReceiptSourceKind;
  readonly requestedScopeIds: readonly string[];
}

export interface GoogleOAuthCallbackExchangeRequest {
  readonly authorizationCodePresent: boolean;
  readonly redirectUriConfigured: boolean;
  readonly statePresent: boolean;
}

export interface GoogleBackendScopePlan {
  readonly sourceKind: GoogleReceiptSourceKind;
  readonly scope: string;
  readonly sensitivity: GoogleScopeSensitivity;
  readonly phase: "preferred_first" | "deferred";
  readonly reason: string;
}

export interface GoogleOAuthBackendArchitectureDecision {
  readonly date: "2026-06-24";
  readonly productionBackendRequired: true;
  readonly frontendOnlyException: string;
  readonly backendRequiredFor: Record<GoogleBackendCapability, string>;
  readonly firstScopePlan: readonly GoogleBackendScopePlan[];
  readonly loggingRestrictions: readonly string[];
  readonly deletionExpectations: readonly string[];
}

export const googleBackendEnvNames = {
  backendAuthEnabled: "VITE_GOOGLE_BACKEND_AUTH_ENABLED",
  backendBaseUrl: "VITE_GOOGLE_BACKEND_BASE_URL",
  backendRevocationEnabled: "VITE_GOOGLE_BACKEND_REVOCATION_ENABLED",
  backendSyncEnabled: "VITE_GOOGLE_BACKEND_SYNC_ENABLED",
  clientId: "VITE_GOOGLE_CLIENT_ID",
  integrationEnabled: "VITE_GOOGLE_INTEGRATION_ENABLED",
  redirectUri: "VITE_GOOGLE_REDIRECT_URI",
} as const;

export const googleBackendEndpointDefinitions: Record<
  GoogleBackendEndpointName,
  GoogleBackendEndpointDefinition
> = {
  disconnect: {
    disabled: true,
    method: "POST",
    path: "/google/oauth/disconnect",
    requiredCapability: "provider_revocation",
  },
  getSourceCandidateText: {
    disabled: true,
    method: "GET",
    path: "/google/sources/:sourceKind/candidates/:candidateId/text",
    requiredCapability: "server_credential_storage",
  },
  listSourceCandidates: {
    disabled: true,
    method: "GET",
    path: "/google/sources/:sourceKind/candidates",
    requiredCapability: "server_credential_storage",
  },
  oauthCallback: {
    disabled: true,
    method: "POST",
    path: "/google/oauth/callback",
    requiredCapability: "authorization_code_exchange",
  },
  oauthStart: {
    disabled: true,
    method: "GET",
    path: "/google/oauth/start",
    requiredCapability: "oauth_callback",
  },
  providerStatus: {
    disabled: true,
    method: "GET",
    path: "/google/oauth/status",
    requiredCapability: "server_credential_storage",
  },
  scheduledSyncStatus: {
    disabled: true,
    method: "GET",
    path: "/google/sync/status",
    requiredCapability: "scheduled_sync",
  },
};

export const googleOAuthBackendArchitectureDecision: GoogleOAuthBackendArchitectureDecision =
  {
    date: "2026-06-24",
    productionBackendRequired: true,
    frontendOnlyException:
      "A future manual Drive/Docs selected-file import may stay frontend-only only when it uses per-file user selection, no stored long-lived credential, no scheduled sync, and draft-only local writes.",
    backendRequiredFor: {
      authorization_code_exchange:
        "The backend must exchange authorization responses outside the PWA before any production OAuth flow is enabled.",
      oauth_callback:
        "The callback must be stateful and isolated from app UI resources before real OAuth is enabled.",
      provider_revocation:
        "Disconnect must be able to revoke provider grants and delete provider credential state.",
      scheduled_sync:
        "Background sync needs server-side jobs, cursors, rate-limit backoff, and visible sync status.",
      server_credential_storage:
        "Long-lived provider access must never be stored in IndexedDB, localStorage, JSON backups, CSV exports, or source metadata.",
      server_side_deletion:
        "A production backend must delete provider credential state, cached candidates, cursors, and diagnostics on disconnect or account deletion.",
    },
    deletionExpectations: [
      "Disconnect revokes the provider grant when one exists.",
      "Disconnect deletes provider credential state, sync cursors, cached candidates, and diagnostics.",
      "Local receipt drafts, confirmed receipts, receipt items, and transactions remain user finance records unless a separate destructive delete flow is added.",
    ],
    firstScopePlan: [
      {
        phase: "preferred_first",
        reason:
          "Selected-file Drive access keeps the first real import path user initiated and per-file.",
        scope: "https://www.googleapis.com/auth/drive.file",
        sensitivity: "non_sensitive",
        sourceKind: "google_drive",
      },
      {
        phase: "preferred_first",
        reason:
          "Docs text should first be attempted through selected Drive files before requesting all-documents access.",
        scope: "https://www.googleapis.com/auth/drive.file",
        sensitivity: "non_sensitive",
        sourceKind: "google_docs",
      },
      {
        phase: "deferred",
        reason:
          "Gmail body import is restricted-scope work and needs backend auth, consent, logging, revocation, deletion, and verification readiness.",
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        sensitivity: "restricted",
        sourceKind: "gmail",
      },
    ],
    loggingRestrictions: [
      "Do not log raw Gmail bodies, Drive or Docs text, receipt text, provider credentials, authorization responses, or client secrets.",
      "Future diagnostics may store only provider kind, action, status, counts, timestamps, hashed source ids, and error class.",
      "Provider diagnostics must be deleted with provider disconnect or local data reset when diagnostics exist.",
    ],
  };

export function readGoogleBackendReadiness(): GoogleBackendReadiness {
  return buildGoogleBackendReadiness(import.meta.env);
}

export function buildGoogleBackendReadiness(
  env: GoogleBackendRuntimeEnv = {},
): GoogleBackendReadiness {
  const integrationEnabled = readBooleanEnv(env.VITE_GOOGLE_INTEGRATION_ENABLED);
  const backendAuthRequested =
    integrationEnabled && readBooleanEnv(env.VITE_GOOGLE_BACKEND_AUTH_ENABLED);
  const backendSyncRequested =
    integrationEnabled && readBooleanEnv(env.VITE_GOOGLE_BACKEND_SYNC_ENABLED);
  const backendRevocationRequested =
    integrationEnabled && readBooleanEnv(env.VITE_GOOGLE_BACKEND_REVOCATION_ENABLED);
  const backendBaseUrlConfigured = hasPlaceholderValue(
    env.VITE_GOOGLE_BACKEND_BASE_URL,
  );
  const clientIdConfigured = hasPlaceholderValue(env.VITE_GOOGLE_CLIENT_ID);
  const redirectUriConfigured = hasPlaceholderValue(env.VITE_GOOGLE_REDIRECT_URI);
  const missingRequiredEnv: string[] = [];
  const backendRequested =
    backendAuthRequested || backendSyncRequested || backendRevocationRequested;

  if (backendRequested && !backendBaseUrlConfigured) {
    missingRequiredEnv.push(googleBackendEnvNames.backendBaseUrl);
  }

  if (backendAuthRequested && !clientIdConfigured) {
    missingRequiredEnv.push(googleBackendEnvNames.clientId);
  }

  if (backendAuthRequested && !redirectUriConfigured) {
    missingRequiredEnv.push(googleBackendEnvNames.redirectUri);
  }

  return {
    backendAuthRequested,
    backendBaseUrlConfigured,
    backendRequiredForProduction: true,
    backendRevocationRequested,
    backendSyncRequested,
    credentialPersistenceAllowed: false,
    endpointCallsAllowed: false,
    missingRequiredEnv,
    networkCallsAllowed: false,
    noOpReason:
      "Phase 9D defines the backend contract and security decision only. OAuth, credential persistence, endpoint calls, provider reads, and scheduled sync remain disabled.",
    state:
      missingRequiredEnv.length > 0
        ? "misconfigured"
        : backendRequested
          ? "requested_but_disabled"
          : "disabled",
  };
}

export class DisabledGoogleOAuthBackendClient {
  readonly readiness: GoogleBackendReadiness;

  constructor(
    readiness: GoogleBackendReadiness = buildGoogleBackendReadiness(),
  ) {
    this.readiness = readiness;
  }

  async getStatus(): Promise<GoogleBackendConnectionStatus> {
    return {
      connected: false,
      endpointCallsAllowed: false,
      networkCallsAllowed: false,
      provider: "google",
      reason: this.readiness.noOpReason,
    };
  }

  async startOAuth(_request: GoogleOAuthStartRequest): Promise<never> {
    void _request;

    throw buildDisabledBackendError("start Google OAuth");
  }

  async exchangeAuthorizationCode(
    _request: GoogleOAuthCallbackExchangeRequest,
  ): Promise<never> {
    void _request;

    throw buildDisabledBackendError("exchange a Google authorization response");
  }

  async disconnect(): Promise<GoogleBackendDisconnectResult> {
    return {
      disconnected: false,
      localCredentialStateDeleted: false,
      providerGrantRevoked: false,
      reason: this.readiness.noOpReason,
    };
  }

  async listReceiptSources(
    _sourceKind: GoogleReceiptSourceKind,
  ): Promise<readonly []> {
    void _sourceKind;

    return [];
  }
}

export function createDisabledGoogleOAuthBackendClient(
  readiness: GoogleBackendReadiness = buildGoogleBackendReadiness(),
): DisabledGoogleOAuthBackendClient {
  return new DisabledGoogleOAuthBackendClient(readiness);
}

function buildDisabledBackendError(action: string): Error {
  return new Error(
    `Google OAuth backend is disabled. Phase 9D does not ${action}.`,
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
