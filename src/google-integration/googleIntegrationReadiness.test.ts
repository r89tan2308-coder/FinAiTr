import { describe, expect, it, vi } from "vitest";
import {
  DisabledGoogleReceiptSourceProvider,
  buildGoogleIntegrationConfig,
  createDisabledGoogleReceiptSourceProviders,
  getGoogleIntegrationStatus,
} from "./googleIntegrationReadiness";

describe("Google integration readiness", () => {
  it("defaults real Google integration to disabled", () => {
    const config = buildGoogleIntegrationConfig({});
    const status = getGoogleIntegrationStatus(config);

    expect(config).toMatchObject({
      backendBaseUrlConfigured: false,
      clientIdConfigured: false,
      driveFileImportEnabled: false,
      featureEnabled: false,
      gmailImportEnabled: false,
      missingRequiredEnv: [],
      realProviderCallsAllowed: false,
      redirectUriConfigured: false,
    });
    expect(status).toMatchObject({
      canConnect: false,
      isConnected: false,
      label: "Google integration planned / not connected",
      realProviderCallsAllowed: false,
      state: "disabled",
    });
    expect(status.detailLines.join(" ")).toContain("Feature flag is off");
  });

  it("does not expose configured env values through the status config", () => {
    const config = buildGoogleIntegrationConfig({
      VITE_GOOGLE_BACKEND_BASE_URL: "configured-backend-placeholder",
      VITE_GOOGLE_CLIENT_ID: "configured-client-id-placeholder",
      VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED: "true",
      VITE_GOOGLE_GMAIL_IMPORT_ENABLED: "true",
      VITE_GOOGLE_INTEGRATION_ENABLED: "true",
      VITE_GOOGLE_REDIRECT_URI: "configured-redirect-uri-placeholder",
    });
    const serializedConfig = JSON.stringify(config);

    expect(config.featureEnabled).toBe(true);
    expect(config.driveFileImportEnabled).toBe(true);
    expect(config.gmailImportEnabled).toBe(true);
    expect(config.missingRequiredEnv).toEqual([]);
    expect(config.realProviderCallsAllowed).toBe(false);
    expect(serializedConfig).not.toContain("configured-client-id");
    expect(serializedConfig).not.toContain("configured-backend");
    expect(serializedConfig).not.toContain("configured-redirect");
  });

  it("keeps placeholder providers disabled without calling network APIs", async () => {
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);

    const provider = new DisabledGoogleReceiptSourceProvider("gmail");

    await expect(provider.listCandidates()).resolves.toEqual([]);
    await expect(provider.getCandidateText("message-id")).rejects.toThrow(
      "Gmail provider is disabled",
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("creates disabled placeholders for Gmail, Drive, and Docs", () => {
    const providers = createDisabledGoogleReceiptSourceProviders();

    expect(providers.map((provider) => provider.kind).sort()).toEqual([
      "gmail",
      "google_docs",
      "google_drive",
    ]);
  });
});
