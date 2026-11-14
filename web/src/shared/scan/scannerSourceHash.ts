import scanBackendSource from "@/shared/scan/scanBackend.ts?raw";
import buildScanQueueSource from "@/shared/scan/buildScanQueue.ts?raw";
import scanFloorSource from "@/shared/math/zerosOfF/scanFloor.ts?raw";
import scanLineAlgorithmSource from "@/shared/scan/scanLineAlgorithm.ts?raw";
import scanLineMinimaAlgorithmSource from "@/shared/scan/scanLineMinimaAlgorithm.ts?raw";
import scanIndexSource from "@/shared/math/zerosOfF/index.ts?raw";
import fScaledSource from "@/shared/math/zerosOfF/fScaled.ts?raw";
import iOfTSource from "@/shared/math/zerosOfF/iOfT.ts?raw";
import i1AccSource from "@/shared/math/zerosOfF/i1Acc.ts?raw";
import i1ScaledSource from "@/shared/math/zerosOfF/i1Scaled.ts?raw";
import r1ScaledSource from "@/shared/math/zerosOfF/r1Scaled.ts?raw";
import r2ScaledSource from "@/shared/math/zerosOfF/r2Scaled.ts?raw";
import sigma1ScaledSource from "@/shared/math/zerosOfF/sigma1Scaled.ts?raw";
import sigma2ScaledSource from "@/shared/math/zerosOfF/sigma2Scaled.ts?raw";
import sum1NegScaledSource from "@/shared/math/zerosOfF/sum1NegScaled.ts?raw";
import jMScaledSource from "@/shared/math/zerosOfF/jMScaled.ts?raw";
import negTRidgeSource from "@/shared/math/zerosOfF/negTRidge.ts?raw";
import coefficientsSource from "@/shared/math/zerosOfF/coefficients.ts?raw";
import r1nakCoefficientsSource from "@/shared/math/zerosOfF/r1nakCoefficients.ts?raw";
import logChiSource from "@/shared/math/zerosOfF/logChi.ts?raw";
import samplingIndexSource from "@/shared/math/sampling/index.ts?raw";
import xoshiroSource from "@/shared/math/sampling/xoshiro256ss.ts?raw";
import type { ScanProvenance, ScanRequest } from "@/shared/scan/scanBackend";

interface ScannerSourceFileMeta {
  path: string;
  sha256: string;
}

export interface ScannerSourceInput {
  path: string;
  source: string;
}

export interface ScannerSourceManifest {
  version: number;
  files: ScannerSourceFileMeta[];
}

export interface ScannerHashInput {
  request?: ScanRequest;
}

export interface ScannerHashState {
  scannerSourceHash: string;
  scannerFiles: string[];
}

const FILE_SOURCES = [
  { path: "src/shared/scan/scanLineAlgorithm.ts", source: scanLineAlgorithmSource },
  { path: "src/shared/scan/scanLineMinimaAlgorithm.ts", source: scanLineMinimaAlgorithmSource },
  { path: "src/shared/scan/scanBackend.ts", source: scanBackendSource },
  { path: "src/shared/scan/buildScanQueue.ts", source: buildScanQueueSource },
  { path: "src/shared/math/zerosOfF/index.ts", source: scanIndexSource },
  { path: "src/shared/math/zerosOfF/scanFloor.ts", source: scanFloorSource },
  { path: "src/shared/math/zerosOfF/fScaled.ts", source: fScaledSource },
  { path: "src/shared/math/zerosOfF/iOfT.ts", source: iOfTSource },
  { path: "src/shared/math/zerosOfF/i1Acc.ts", source: i1AccSource },
  { path: "src/shared/math/zerosOfF/i1Scaled.ts", source: i1ScaledSource },
  { path: "src/shared/math/zerosOfF/r1Scaled.ts", source: r1ScaledSource },
  { path: "src/shared/math/zerosOfF/r2Scaled.ts", source: r2ScaledSource },
  { path: "src/shared/math/zerosOfF/sigma1Scaled.ts", source: sigma1ScaledSource },
  { path: "src/shared/math/zerosOfF/sigma2Scaled.ts", source: sigma2ScaledSource },
  { path: "src/shared/math/zerosOfF/sum1NegScaled.ts", source: sum1NegScaledSource },
  { path: "src/shared/math/zerosOfF/jMScaled.ts", source: jMScaledSource },
  { path: "src/shared/math/zerosOfF/negTRidge.ts", source: negTRidgeSource },
  { path: "src/shared/math/zerosOfF/coefficients.ts", source: coefficientsSource },
  { path: "src/shared/math/zerosOfF/r1nakCoefficients.ts", source: r1nakCoefficientsSource },
  { path: "src/shared/math/zerosOfF/logChi.ts", source: logChiSource },
  { path: "src/shared/math/sampling/index.ts", source: samplingIndexSource },
  { path: "src/shared/math/sampling/xoshiro256ss.ts", source: xoshiroSource },
] as const;

const SCANNER_SOURCE_MANIFEST_VERSION = 1;
const scannerSourceFiles = FILE_SOURCES.map((entry) => entry.path);

let scannerSourceHashPromise: Promise<ScannerHashState> | null = null;

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: string): Promise<string> {
  if (typeof crypto === "undefined" || typeof crypto.subtle === "undefined") {
    throw new Error("sha256 unavailable: Web Crypto required");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return `sha256:${toHex(new Uint8Array(digest))}`;
}

async function sha256Source(source: string): Promise<string> {
  return sha256Hex(normalizeLineEndings(source));
}

/**
 * Compute the canonical scanner hash from explicit source inputs. Tests use
 * this to verify the provenance rules without depending on the current tree.
 */
export async function computeScannerSourceHashFromSources(
  sources: readonly ScannerSourceInput[],
): Promise<ScannerHashState> {
  const manifestWithHashes = {
    version: SCANNER_SOURCE_MANIFEST_VERSION,
    files: await Promise.all(sources.map(async ({ path, source }) => {
      return {
        path,
        sha256: await sha256Source(source),
      };
    })),
  };
  manifestWithHashes.files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    scannerSourceHash: await sha256Hex(JSON.stringify(manifestWithHashes)),
    scannerFiles: manifestWithHashes.files.map((file) => file.path),
  };
}

/**
 * Build the canonical manifest and compute the content hash for current scanner inputs.
 *
 * The hash is used for provenance/compatibility across local and cloud scans.
 */
export async function computeScannerSourceHash(): Promise<ScannerHashState> {
  return computeScannerSourceHashFromSources(FILE_SOURCES);
}

/**
 * Return cached scanner-source hash. Safe to call repeatedly; compute happens once.
 */
export async function getCachedScannerSourceHash(): Promise<string> {
  if (scannerSourceHashPromise === null) {
    scannerSourceHashPromise = computeScannerSourceHash();
  }
  return (await scannerSourceHashPromise).scannerSourceHash;
}

/**
 * Build partial provenance fields shared by local and cloud archives.
 */
export function makeLocalScanProvenanceBase(hash: string): Omit<ScanProvenance, "partial" | "terminalStatus"> {
  return {
    resultSchemaVersion: 1,
    scannerSourceHash: hash,
    scannerFiles: [...scannerSourceFiles],
    bundledAt: new Date().toISOString(),
    backend: "local-worker",
  };
}

export async function makeCurrentLocalScanProvenanceBase(): Promise<Omit<ScanProvenance, "partial" | "terminalStatus">> {
  const state = await summarizeScannerProvenance();
  return {
    resultSchemaVersion: 1,
    scannerSourceHash: state.scannerSourceHash,
    scannerFiles: state.scannerFiles,
    bundledAt: new Date().toISOString(),
    backend: "local-worker",
  };
}

/**
 * Compatibility helper used by list-side rendering to include scanner file paths.
 */
export function getKnownScannerSourceFiles(): string[] {
  return [...scannerSourceFiles];
}

/**
 * Build a cloud provenance skeleton from sidecar output. Bundle hash must be
 * present for cloud scans because transport integrity is tied to uploaded bytes.
 */
export function makeCloudScanProvenanceBase(
  override: Pick<ScanProvenance, "scannerSourceHash" | "bundleArtifactHash" | "backend" | "cloudProfileId">,
): Omit<ScanProvenance, "partial" | "terminalStatus"> {
  return {
    resultSchemaVersion: 1,
    scannerSourceHash: override.scannerSourceHash,
    bundleArtifactHash: override.bundleArtifactHash,
    scannerFiles: [...scannerSourceFiles],
    bundledAt: new Date().toISOString(),
    backend: override.backend,
    cloudProfileId: override.cloudProfileId,
  };
}

/**
 * Canonical scanner manifest builder for audit/debug views and tests.
 */
export function buildScannerSourceHashManifest(): ScannerSourceManifest {
  return {
    version: SCANNER_SOURCE_MANIFEST_VERSION,
    files: FILE_SOURCES
      .map(({ path, source }) => ({
        path,
        sha256: `source:${toHex(new Uint8Array(new TextEncoder().encode(normalizeLineEndings(source))))}`,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/**
 * Compute hashes from a `ScanRequest` and optional control-plane bundle hash.
 * `request` is currently reserved for future migration and kept in the signature
 * for extension points.
 */
export async function summarizeScannerProvenance(request?: ScanRequest): Promise<ScannerHashState> {
  void request;
  if (scannerSourceHashPromise === null) {
    scannerSourceHashPromise = computeScannerSourceHash();
  }
  return scannerSourceHashPromise;
}
