import { describe, expect, it, vi } from "vitest";
import {
  buildGoogleOAuthBackendSkeletonConfig,
  createDisabledGoogleOAuthBackendBoundaryClient,
  googleOAuthBackendEndpointContracts,
} from "./googleOAuthBackendSkeleton";

describe("Google OAuth backend skeleton", () => {
  it("keeps the Phase 9I backend OAuth skeleton disabled by default", () => {
    const config = buildGoogleOAuthBackendSkeletonConfig({});

    expect(config).toMatchObject({
      featureFlags: {
        endpointCallsAllowed: false,
        networkCallsAllowed: false,
        oauthRequested: false,
        providerDisconnectRequested: false,
        providerRevocationRequested: false,
        sourceSyncRequested: false,
        state: "disabled",
        tokenStorageAllowed: false,
      },
      releaseGate: "phase_9i_disabled_backend_oauth_skeleton",
    });
    expect(config.backendReadiness.endpointCallsAllowed).toBe(false);
    expect(config.backendReadiness.networkCallsAllowed).toBe(false);
    expect(config.backendReadiness.credentialPersistenceAllowed).toBe(false);
  });

  it("defines disabled endpoint contracts for OAuth, provider lifecycle, and source sync", () => {
    expect(Object.keys(googleOAuthBackendEndpointContracts)).toEqual([
      "disconnectProvider",
      "getProviderStatus",
      "handleOAuthCallback",
      "revokeProvider",
      "startOAuth",
      "syncSources",
    ]);
    expect(
      Object.values(googleOAuthBackendEndpointContracts).every(
        (endpoint) =>
          endpoint.disabled && endpoint.storesProviderCredentials === false,
      ),
    ).toBe(true);
    expect(googleOAuthBackendEndpointContracts.startOAuth).toMatchObject({
      method: "GET",
      operation: "oauth_start",
      path: "/google/oauth/start",
    });
    expect(googleOAuthBackendEndpointContracts.revokeProvider).toMatchObject({
      method: "POST",
      operation: "provider_revoke",
      path: "/google/oauth/revoke",
    });
    expect(googleOAuthBackendEndpointContracts.syncSources).toMatchObject({
      method: "POST",
      operation: "source_sync",
      path: "/google/sources/:sourceKind/sync",
    });
  });

  it("records requested backend flags without allowing endpoint, network, or token behavior", () => {
    const config = buildGoogleOAuthBackendSkeletonConfig({
      VITE_GOOGLE_BACKEND_AUTH_ENABLED: "true",
      VITE_GOOGLE_BACKEND_BASE_URL: "https://backend.example.test",
      VITE_GOOGLE_BACKEND_REVOCATION_ENABLED: "true",
      VITE_GOOGLE_BACKEND_SYNC_ENABLED: "true",
      VITE_GOOGLE_CLIENT_ID: "configured-client-placeholder",
      VITE_GOOGLE_INTEGRATION_ENABLED: "true",
      VITE_GOOGLE_REDIRECT_URI: "https://app.example.test/google/callback",
    });
    const serializedConfig = JSON.stringify(config);

    expect(config.featureFlags).toMatchObject({
      endpointCallsAllowed: false,
      networkCallsAllowed: false,
      oauthRequested: true,
      providerDisconnectRequested: true,
      providerRevocationRequested: true,
      sourceSyncRequested: true,
      state: "requested_but_blocked",
      tokenStorageAllowed: false,
    });
    expect(config.backendReadiness.state).toBe("requested_but_disabled");
    expect(serializedConfig).not.toContain("configured-client");
    expect(serializedConfig).not.toContain("backend.example");
    expect(serializedConfig).not.toContain("google/callback");
  });

  it("returns typed disabled responses and never calls the optional network adapter", async () => {
    const networkClient = vi.fn();
    const client = createDisabledGoogleOAuthBackendBoundaryClient(
      buildGoogleOAuthBackendSkeletonConfig({
        VITE_GOOGLE_BACKEND_AUTH_ENABLED: "true",
        VITE_GOOGLE_BACKEND_BASE_URL: "https://backend.example.test",
        VITE_GOOGLE_BACKEND_REVOCATION_ENABLED: "true",
        VITE_GOOGLE_BACKEND_SYNC_ENABLED: "true",
        VITE_GOOGLE_CLIENT_ID: "configured-client-placeholder",
        VITE_GOOGLE_INTEGRATION_ENABLED: "true",
        VITE_GOOGLE_REDIRECT_URI: "https://app.example.test/google/callback",
      }),
      networkClient,
    );

    await expect(
      client.startOAuth({
        requestedScopeIds: ["https://www.googleapis.com/auth/drive.file"],
        returnPath: "/receipts",
        sourceKind: "google_drive",
      }),
    ).resolves.toMatchObject({
      authorizationUrl: null,
      disabled: true,
      networkCallsAllowed: false,
      ok: false,
      operation: "oauth_start",
      stateNonceStored: false,
      status: "disabled",
      tokenStorageAllowed: false,
    });
    await expect(
      client.handleOAuthCallback({
        authorizationCodePresent: true,
        errorPresent: false,
        sourceKind: "google_drive",
        statePresent: true,
      }),
    ).resolves.toMatchObject({
      authorizationResponseExchanged: false,
      credentialStateStored: false,
      operation: "oauth_callback",
      providerConnected: false,
    });
    await expect(
      client.getProviderStatus({ sourceKind: "gmail" }),
    ).resolves.toMatchObject({
      connected: false,
      operation: "provider_status",
      sourceKinds: [],
    });
    await expect(
      client.disconnectProvider({
        deleteCachedProviderData: true,
        sourceKind: "gmail",
      }),
    ).resolves.toMatchObject({
      cachedProviderDataDeleted: false,
      credentialStateDeleted: false,
      operation: "provider_disconnect",
      providerGrantRevoked: false,
    });
    await expect(
      client.revokeProvider({ sourceKind: "google_docs" }),
    ).resolves.toMatchObject({
      credentialStateDeleted: false,
      operation: "provider_revoke",
      providerGrantRevoked: false,
    });
    await expect(
      client.syncSources({ mode: "scheduled", sourceKind: "gmail" }),
    ).resolves.toMatchObject({
      candidatesSynced: 0,
      operation: "source_sync",
      sourceTextFetched: false,
      syncCursorStored: false,
    });
    expect(networkClient).not.toHaveBeenCalled();
  });

  it("does not expose token, secret, or authorization URL fields in disabled responses", async () => {
    const client = createDisabledGoogleOAuthBackendBoundaryClient();
    const responses = [
      await client.startOAuth({
        requestedScopeIds: [],
        sourceKind: "google_drive",
      }),
      await client.handleOAuthCallback({
        authorizationCodePresent: true,
        errorPresent: false,
        sourceKind: "google_drive",
        statePresent: true,
      }),
      await client.getProviderStatus(),
      await client.disconnectProvider({ deleteCachedProviderData: true }),
      await client.revokeProvider({}),
      await client.syncSources({ mode: "manual", sourceKind: "google_docs" }),
    ];
    const serializedResponses = JSON.stringify(responses);

    expect(serializedResponses).not.toMatch(/access_token/i);
    expect(serializedResponses).not.toMatch(/refresh_token/i);
    expect(serializedResponses).not.toMatch(/client_secret/i);
    expect(serializedResponses).not.toMatch(/id_token/i);
    expect(serializedResponses).not.toMatch(/https:\/\/accounts\.google\.com/i);
  });
});
