import {
  buildGoogleBackendReadiness,
  type GoogleBackendReadiness,
  type GoogleBackendRuntimeEnv,
} from "./googleBackendReadiness";
import { type GoogleReceiptSourceKind } from "./googleIntegrationReadiness";

export type GoogleOAuthBackendOperation =
  | "oauth_start"
  | "oauth_callback"
  | "provider_status"
  | "provider_disconnect"
  | "provider_revoke"
  | "source_sync";

export type GoogleOAuthBackendEndpointName =
  | "startOAuth"
  | "handleOAuthCallback"
  | "getProviderStatus"
  | "disconnectProvider"
  | "revokeProvider"
  | "syncSources";

export interface GoogleOAuthBackendEndpointContract {
  readonly disabled: true;
  readonly method: "GET" | "POST";
  readonly operation: GoogleOAuthBackendOperation;
  readonly path: string;
  readonly storesProviderCredentials: false;
}

export interface GoogleOAuthBackendFeatureFlags {
  readonly endpointCallsAllowed: false;
  readonly networkCallsAllowed: false;
  readonly oauthRequested: boolean;
  readonly providerDisconnectRequested: boolean;
  readonly providerRevocationRequested: boolean;
  readonly sourceSyncRequested: boolean;
  readonly state: "disabled" | "requested_but_blocked" | "misconfigured";
  readonly tokenStorageAllowed: false;
}

export interface GoogleOAuthBackendSkeletonConfig {
  readonly backendReadiness: GoogleBackendReadiness;
  readonly featureFlags: GoogleOAuthBackendFeatureFlags;
  readonly releaseGate: "phase_9i_disabled_backend_oauth_skeleton";
  readonly reason: string;
}

export interface GoogleOAuthStartBackendRequest {
  readonly requestedScopeIds: readonly string[];
  readonly returnPath?: string;
  readonly sourceKind: GoogleReceiptSourceKind;
}

export interface GoogleOAuthCallbackBackendRequest {
  readonly authorizationCodePresent: boolean;
  readonly errorPresent: boolean;
  readonly sourceKind: GoogleReceiptSourceKind;
  readonly statePresent: boolean;
}

export interface GoogleProviderStatusBackendRequest {
  readonly sourceKind?: GoogleReceiptSourceKind;
}

export interface GoogleProviderDisconnectBackendRequest {
  readonly deleteCachedProviderData: boolean;
  readonly sourceKind?: GoogleReceiptSourceKind;
}

export interface GoogleProviderRevokeBackendRequest {
  readonly sourceKind?: GoogleReceiptSourceKind;
}

export interface GoogleSourceSyncBackendRequest {
  readonly mode: "manual" | "scheduled";
  readonly sourceKind: GoogleReceiptSourceKind;
}

export interface GoogleOAuthBackendDisabledResponse {
  readonly disabled: true;
  readonly endpointCallsAllowed: false;
  readonly networkCallsAllowed: false;
  readonly ok: false;
  readonly operation: GoogleOAuthBackendOperation;
  readonly reason: string;
  readonly status: "disabled";
  readonly tokenStorageAllowed: false;
}

export interface GoogleOAuthStartBackendResponse
  extends GoogleOAuthBackendDisabledResponse {
  readonly authorizationUrl: null;
  readonly operation: "oauth_start";
  readonly stateNonceStored: false;
}

export interface GoogleOAuthCallbackBackendResponse
  extends GoogleOAuthBackendDisabledResponse {
  readonly authorizationResponseExchanged: false;
  readonly credentialStateStored: false;
  readonly operation: "oauth_callback";
  readonly providerConnected: false;
}

export interface GoogleProviderStatusBackendResponse
  extends GoogleOAuthBackendDisabledResponse {
  readonly connected: false;
  readonly operation: "provider_status";
  readonly sourceKinds: readonly [];
}

export interface GoogleProviderDisconnectBackendResponse
  extends GoogleOAuthBackendDisabledResponse {
  readonly cachedProviderDataDeleted: false;
  readonly credentialStateDeleted: false;
  readonly operation: "provider_disconnect";
  readonly providerGrantRevoked: false;
}

export interface GoogleProviderRevokeBackendResponse
  extends GoogleOAuthBackendDisabledResponse {
  readonly credentialStateDeleted: false;
  readonly operation: "provider_revoke";
  readonly providerGrantRevoked: false;
}

export interface GoogleSourceSyncBackendResponse
  extends GoogleOAuthBackendDisabledResponse {
  readonly candidatesSynced: 0;
  readonly operation: "source_sync";
  readonly sourceTextFetched: false;
  readonly syncCursorStored: false;
}

export interface GoogleOAuthBackendClientBoundary {
  disconnectProvider(
    request: GoogleProviderDisconnectBackendRequest,
  ): Promise<GoogleProviderDisconnectBackendResponse>;
  getProviderStatus(
    request?: GoogleProviderStatusBackendRequest,
  ): Promise<GoogleProviderStatusBackendResponse>;
  handleOAuthCallback(
    request: GoogleOAuthCallbackBackendRequest,
  ): Promise<GoogleOAuthCallbackBackendResponse>;
  revokeProvider(
    request: GoogleProviderRevokeBackendRequest,
  ): Promise<GoogleProviderRevokeBackendResponse>;
  startOAuth(
    request: GoogleOAuthStartBackendRequest,
  ): Promise<GoogleOAuthStartBackendResponse>;
  syncSources(
    request: GoogleSourceSyncBackendRequest,
  ): Promise<GoogleSourceSyncBackendResponse>;
}

export type GoogleOAuthBackendNetworkClient = (
  input: string,
  init?: { readonly method?: "GET" | "POST"; readonly body?: string },
) => Promise<unknown>;

export const googleOAuthBackendEndpointContracts: Record<
  GoogleOAuthBackendEndpointName,
  GoogleOAuthBackendEndpointContract
> = {
  disconnectProvider: {
    disabled: true,
    method: "POST",
    operation: "provider_disconnect",
    path: "/google/oauth/disconnect",
    storesProviderCredentials: false,
  },
  getProviderStatus: {
    disabled: true,
    method: "GET",
    operation: "provider_status",
    path: "/google/oauth/status",
    storesProviderCredentials: false,
  },
  handleOAuthCallback: {
    disabled: true,
    method: "POST",
    operation: "oauth_callback",
    path: "/google/oauth/callback",
    storesProviderCredentials: false,
  },
  revokeProvider: {
    disabled: true,
    method: "POST",
    operation: "provider_revoke",
    path: "/google/oauth/revoke",
    storesProviderCredentials: false,
  },
  startOAuth: {
    disabled: true,
    method: "GET",
    operation: "oauth_start",
    path: "/google/oauth/start",
    storesProviderCredentials: false,
  },
  syncSources: {
    disabled: true,
    method: "POST",
    operation: "source_sync",
    path: "/google/sources/:sourceKind/sync",
    storesProviderCredentials: false,
  },
};

export function buildGoogleOAuthBackendSkeletonConfig(
  env: GoogleBackendRuntimeEnv = {},
): GoogleOAuthBackendSkeletonConfig {
  const backendReadiness = buildGoogleBackendReadiness(env);
  const requested =
    backendReadiness.backendAuthRequested ||
    backendReadiness.backendRevocationRequested ||
    backendReadiness.backendSyncRequested;

  return {
    backendReadiness,
    featureFlags: {
      endpointCallsAllowed: false,
      networkCallsAllowed: false,
      oauthRequested: backendReadiness.backendAuthRequested,
      providerDisconnectRequested: backendReadiness.backendRevocationRequested,
      providerRevocationRequested: backendReadiness.backendRevocationRequested,
      sourceSyncRequested: backendReadiness.backendSyncRequested,
      state:
        backendReadiness.state === "misconfigured"
          ? "misconfigured"
          : requested
            ? "requested_but_blocked"
            : "disabled",
      tokenStorageAllowed: false,
    },
    reason:
      "Phase 9I defines disabled backend OAuth architecture contracts only. OAuth redirects, callback exchange, backend calls, token storage, revocation calls, provider reads, source sync, and scheduled sync remain disabled.",
    releaseGate: "phase_9i_disabled_backend_oauth_skeleton",
  };
}

export class DisabledGoogleOAuthBackendBoundaryClient
  implements GoogleOAuthBackendClientBoundary
{
  readonly config: GoogleOAuthBackendSkeletonConfig;

  constructor(
    config: GoogleOAuthBackendSkeletonConfig = buildGoogleOAuthBackendSkeletonConfig(),
    networkClient?: GoogleOAuthBackendNetworkClient,
  ) {
    this.config = config;
    void networkClient;
  }

  async startOAuth(
    _request: GoogleOAuthStartBackendRequest,
  ): Promise<GoogleOAuthStartBackendResponse> {
    void _request;

    return {
      ...this.buildDisabledResponse("oauth_start"),
      authorizationUrl: null,
      stateNonceStored: false,
    };
  }

  async handleOAuthCallback(
    _request: GoogleOAuthCallbackBackendRequest,
  ): Promise<GoogleOAuthCallbackBackendResponse> {
    void _request;

    return {
      ...this.buildDisabledResponse("oauth_callback"),
      authorizationResponseExchanged: false,
      credentialStateStored: false,
      providerConnected: false,
    };
  }

  async getProviderStatus(
    _request: GoogleProviderStatusBackendRequest = {},
  ): Promise<GoogleProviderStatusBackendResponse> {
    void _request;

    return {
      ...this.buildDisabledResponse("provider_status"),
      connected: false,
      sourceKinds: [],
    };
  }

  async disconnectProvider(
    _request: GoogleProviderDisconnectBackendRequest,
  ): Promise<GoogleProviderDisconnectBackendResponse> {
    void _request;

    return {
      ...this.buildDisabledResponse("provider_disconnect"),
      cachedProviderDataDeleted: false,
      credentialStateDeleted: false,
      providerGrantRevoked: false,
    };
  }

  async revokeProvider(
    _request: GoogleProviderRevokeBackendRequest,
  ): Promise<GoogleProviderRevokeBackendResponse> {
    void _request;

    return {
      ...this.buildDisabledResponse("provider_revoke"),
      credentialStateDeleted: false,
      providerGrantRevoked: false,
    };
  }

  async syncSources(
    _request: GoogleSourceSyncBackendRequest,
  ): Promise<GoogleSourceSyncBackendResponse> {
    void _request;

    return {
      ...this.buildDisabledResponse("source_sync"),
      candidatesSynced: 0,
      sourceTextFetched: false,
      syncCursorStored: false,
    };
  }

  private buildDisabledResponse<T extends GoogleOAuthBackendOperation>(
    operation: T,
  ): GoogleOAuthBackendDisabledResponse & { readonly operation: T } {
    return {
      disabled: true,
      endpointCallsAllowed: false,
      networkCallsAllowed: false,
      ok: false,
      operation,
      reason: this.config.reason,
      status: "disabled",
      tokenStorageAllowed: false,
    };
  }
}

export function createDisabledGoogleOAuthBackendBoundaryClient(
  config: GoogleOAuthBackendSkeletonConfig = buildGoogleOAuthBackendSkeletonConfig(),
  networkClient?: GoogleOAuthBackendNetworkClient,
): DisabledGoogleOAuthBackendBoundaryClient {
  return new DisabledGoogleOAuthBackendBoundaryClient(config, networkClient);
}
