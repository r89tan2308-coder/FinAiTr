import {
  type ISODateTimeString,
  type ReceiptDraftSourceKind,
} from "../domain/models";
import {
  type ReceiptTextCandidate,
  type ReceiptTextSourceProvider,
  type ReceiptTextSourceReference,
} from "./types";

export type MockGoogleReceiptSourceKind = Extract<
  ReceiptDraftSourceKind,
  "gmail" | "google_drive" | "google_docs"
>;

export interface MockGoogleReceiptSourceRecord {
  externalId: string;
  kind: MockGoogleReceiptSourceKind;
  modifiedAt?: ISODateTimeString;
  rawText: string;
  receivedAt?: ISODateTimeString;
  sender?: string;
  title: string;
  url?: string;
}

export interface MockGoogleReceiptSourceSummary {
  contentHash: string;
  id: string;
  kind: MockGoogleReceiptSourceKind;
  modifiedAt?: ISODateTimeString;
  receivedAt?: ISODateTimeString;
  sender?: string;
  sourceId: string;
  title: string;
}

const mockSourceProviderName = "mock-google-source-provider";
const mockDetectedAt = "2026-06-23T00:00:00.000Z";

export const mockGoogleReceiptSourceRecords: MockGoogleReceiptSourceRecord[] = [
  {
    externalId: "gmail-message-fresh-market-20260604",
    kind: "gmail",
    rawText: `From: receipts@fresh.example
Subject: Fresh Market receipt
Date: 2026-06-04T10:15:00.000Z

Fresh Market
2026-06-04
Milk 2 x 3.00
Bread 2.00
TOTAL USD 5.00`,
    receivedAt: "2026-06-04T10:15:00.000Z",
    sender: "receipts@fresh.example",
    title: "Fresh Market receipt",
    url: "mock://gmail/gmail-message-fresh-market-20260604",
  },
  {
    externalId: "drive-file-city-pharmacy-20260606",
    kind: "google_drive",
    modifiedAt: "2026-06-06T15:45:00.000Z",
    rawText: `Title: City Pharmacy receipt
Source: Google Drive
Modified: 2026-06-06T15:45:00.000Z

City Pharmacy
2026-06-06
Pain relief 8.50
Vitamins 12.00
TOTAL USD 20.50`,
    sender: "drive-owner@example.com",
    title: "City Pharmacy receipt",
    url: "mock://drive/drive-file-city-pharmacy-20260606",
  },
  {
    externalId: "docs-document-cloud-tools-20260605",
    kind: "google_docs",
    modifiedAt: "2026-06-05T09:30:00.000Z",
    rawText: `Title: Software receipt
Source: Google Docs
Modified: 2026-06-05T09:30:00.000Z

Cloud Tools
2026-06-05
Pro plan 1 x 12.00
TOTAL 12.00 USD`,
    sender: "docs-owner@example.com",
    title: "Software receipt",
    url: "mock://docs/docs-document-cloud-tools-20260605",
  },
];

export const mockGoogleReceiptSourceProviders: ReceiptTextSourceProvider[] = [
  createMockGoogleReceiptSourceProvider("gmail"),
  createMockGoogleReceiptSourceProvider("google_drive"),
  createMockGoogleReceiptSourceProvider("google_docs"),
];

export function createMockGoogleReceiptSourceProvider(
  kind: MockGoogleReceiptSourceKind,
  records: readonly MockGoogleReceiptSourceRecord[] = mockGoogleReceiptSourceRecords,
): ReceiptTextSourceProvider {
  const matchingRecords = records.filter((record) => record.kind === kind);

  return {
    kind,
    async getCandidateText(candidateId: string): Promise<ReceiptTextCandidate> {
      const record = matchingRecords.find(
        (candidate) =>
          buildMockGoogleCandidateId(candidate) === candidateId ||
          candidate.externalId === candidateId,
      );

      if (!record) {
        throw new Error(`Mock ${formatSourceKind(kind)} source was not found.`);
      }

      return recordToCandidate(record);
    },
    async listCandidates(): Promise<ReceiptTextCandidate[]> {
      return matchingRecords.map(recordToCandidate);
    },
  };
}

export async function getMockGoogleReceiptSourceCandidate(
  candidateId: string,
  providers: readonly ReceiptTextSourceProvider[] = mockGoogleReceiptSourceProviders,
): Promise<ReceiptTextCandidate> {
  for (const provider of providers) {
    try {
      return await provider.getCandidateText(candidateId);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("source was not found")
      ) {
        throw error;
      }
    }
  }

  throw new Error("Mock Google receipt source was not found.");
}

export async function listMockGoogleReceiptSourceCandidates(
  providers: readonly ReceiptTextSourceProvider[] = mockGoogleReceiptSourceProviders,
): Promise<ReceiptTextCandidate[]> {
  const candidateGroups = await Promise.all(
    providers.map((provider) => provider.listCandidates()),
  );

  return candidateGroups.flat();
}

export function listMockGoogleReceiptSourceSummaries(
  records: readonly MockGoogleReceiptSourceRecord[] = mockGoogleReceiptSourceRecords,
): MockGoogleReceiptSourceSummary[] {
  return records.map((record) => {
    const source = buildMockGoogleSourceReference(record);

    return {
      contentHash: source.contentHash ?? "",
      id: buildMockGoogleCandidateId(record),
      kind: record.kind,
      modifiedAt: record.modifiedAt,
      receivedAt: record.receivedAt,
      sender: record.sender,
      sourceId: record.externalId,
      title: record.title,
    };
  });
}

function recordToCandidate(
  record: MockGoogleReceiptSourceRecord,
): ReceiptTextCandidate {
  return {
    detectedAt: record.modifiedAt ?? record.receivedAt ?? mockDetectedAt,
    id: buildMockGoogleCandidateId(record),
    rawText: record.rawText,
    source: buildMockGoogleSourceReference(record),
    warnings: [
      `Mock ${formatSourceKind(record.kind)} source. No real Google API was called.`,
    ],
  };
}

function buildMockGoogleSourceReference(
  record: MockGoogleReceiptSourceRecord,
): ReceiptTextSourceReference {
  return {
    kind: record.kind,
    contentHash: stableTextHash(record.rawText),
    modifiedAt: record.modifiedAt,
    receivedAt: record.receivedAt,
    sender: record.sender,
    sourceId: record.externalId,
    sourceProviderName: mockSourceProviderName,
    title: record.title,
    url: record.url,
  };
}

function buildMockGoogleCandidateId(
  record: MockGoogleReceiptSourceRecord,
): string {
  return `${record.kind}:${record.externalId}`;
}

function stableTextHash(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

function formatSourceKind(kind: ReceiptDraftSourceKind): string {
  return kind
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
