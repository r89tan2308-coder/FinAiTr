import { describe, expect, it, vi } from "vitest";
import {
  buildGoogleBackendReadiness,
  createDisabledGoogleOAuthBackendClient,
  googleBackendEndpointDefinitions,
  googleOAuthBackendArchitectureDecision,
} from "./googleBackendReadiness";

describe("Google backend readiness", () => {
  it("defaults backend OAuth integration to disabled and no-op", () => {
    const readiness = buildGoogleBackendReadiness({});

    expect(readiness).toMatchObject({
      backendAuthRequested: false,
      backendBaseUrlConfigured: false,
      backendRequiredForProduction: true,
      backendRevocationRequested: false,
      backendSyncRequested: false,
      credentialPersistenceAllowed: false,
      endpointCallsAllowed: false,
      missingRequiredEnv: [],
      networkCallsAllowed: false,
      state: "disabled",
    });
  });

  it("records requested backend flags without enabling endpoint or network calls", () => {
    const readiness = buildGoogleBackendReadiness({
      VITE_GOOGLE_BACKEND_AUTH_ENABLED: "true",
      VITE_GOOGLE_BACKEND_BASE_URL: "https://backend.example.test",
      VITE_GOOGLE_BACKEND_REVOCATION_ENABLED: "true",
      VITE_GOOGLE_BACKEND_SYNC_ENABLED: "true",
      VITE_GOOGLE_CLIENT_ID: "configured-client-placeholder",
      VITE_GOOGLE_INTEGRATION_ENABLED: "true",
      VITE_GOOGLE_REDIRECT_URI: "https://app.example.test/oauth/callback",
    });
    const serializedReadiness = JSON.stringify(readiness);

    expect(readiness.backendAuthRequested).toBe(true);
    expect(readiness.backendSyncRequested).toBe(true);
    expect(readiness.backendRevocationRequested).toBe(true);
    expect(readiness.backendBaseUrlConfigured).toBe(true);
    expect(readiness.endpointCallsAllowed).toBe(false);
    expect(readiness.networkCallsAllowed).toBe(false);
    expect(readiness.credentialPersistenceAllowed).toBe(false);
    expect(readiness.state).toBe("requested_but_disabled");
    expect(serializedReadiness).not.toContain("configured-client");
    expect(serializedReadiness).not.toContain("backend.example");
    expect(serializedReadiness).not.toContain("oauth/callback");
  });

  it("surfaces missing backend placeholders when backend auth is requested", () => {
    const readiness = buildGoogleBackendReadiness({
      VITE_GOOGLE_BACKEND_AUTH_ENABLED: "true",
      VITE_GOOGLE_INTEGRATION_ENABLED: "true",
    });

    expect(readiness.state).toBe("misconfigured");
    expect(readiness.missingRequiredEnv).toEqual([
      "VITE_GOOGLE_BACKEND_BASE_URL",
      "VITE_GOOGLE_CLIENT_ID",
      "VITE_GOOGLE_REDIRECT_URI",
    ]);
  });

  it("keeps future backend endpoint definitions disabled", () => {
    expect(
      Object.values(googleBackendEndpointDefinitions).every(
        (endpoint) => endpoint.disabled,
      ),
    ).toBe(true);
    expect(googleBackendEndpointDefinitions.oauthStart).toMatchObject({
      method: "GET",
      path: "/google/oauth/start",
      requiredCapability: "oauth_callback",
    });
    expect(googleBackendEndpointDefinitions.scheduledSyncStatus).toMatchObject({
      disabled: true,
      requiredCapability: "scheduled_sync",
    });
  });

  it("documents backend as required for production Gmail and scheduled sync paths", () => {
    expect(googleOAuthBackendArchitectureDecision).toMatchObject({
      date: "2026-06-24",
      productionBackendRequired: true,
    });
    expect(
      googleOAuthBackendArchitectureDecision.backendRequiredFor.scheduled_sync,
    ).toContain("Background sync");
    expect(
      googleOAuthBackendArchitectureDecision.firstScopePlan.find(
        (scope) => scope.sourceKind === "gmail",
      ),
    ).toMatchObject({
      phase: "deferred",
      sensitivity: "restricted",
      scope: "https://www.googleapis.com/auth/gmail.readonly",
    });
  });

  it("keeps the disabled backend client from calling fetch or storing state", async () => {
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);

    const client = createDisabledGoogleOAuthBackendClient();

    await expect(client.getStatus()).resolves.toMatchObject({
      connected: false,
      endpointCallsAllowed: false,
      networkCallsAllowed: false,
      provider: "google",
    });
    await expect(
      client.startOAuth({
        requestedScopeIds: ["https://www.googleapis.com/auth/drive.file"],
        sourceKind: "google_drive",
      }),
    ).rejects.toThrow("Google OAuth backend is disabled");
    await expect(
      client.exchangeAuthorizationCode({
        authorizationCodePresent: true,
        redirectUriConfigured: true,
        statePresent: true,
      }),
    ).rejects.toThrow("Google OAuth backend is disabled");
    await expect(client.disconnect()).resolves.toMatchObject({
      disconnected: false,
      localCredentialStateDeleted: false,
      providerGrantRevoked: false,
    });
    await expect(client.listReceiptSources("gmail")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
