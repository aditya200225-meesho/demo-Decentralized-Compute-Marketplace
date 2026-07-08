import os from "node:os";

export type DetectedSpecs = {
  cpuCores: number;
  ramGb: number;
  hasGpu: boolean;
  gpuModel: string | null;
};

/** Detect the real host's hardware specs (used when a real machine registers as a provider). */
export function detectHostSpecs(): DetectedSpecs {
  const cpuCores = os.cpus()?.length || 2;
  const ramGb = Math.max(1, Math.round(os.totalmem() / 1024 ** 3));
  return { cpuCores, ramGb, hasGpu: false, gpuModel: null };
}

const VIRTUAL_PROFILES: DetectedSpecs[] = [
  { cpuCores: 2, ramGb: 4, hasGpu: false, gpuModel: null },
  { cpuCores: 4, ramGb: 8, hasGpu: false, gpuModel: null },
  { cpuCores: 4, ramGb: 16, hasGpu: false, gpuModel: null },
  { cpuCores: 8, ramGb: 16, hasGpu: false, gpuModel: null },
  { cpuCores: 6, ramGb: 16, hasGpu: true, gpuModel: "GTX 1660" },
  { cpuCores: 8, ramGb: 32, hasGpu: true, gpuModel: "RTX 3060" },
];

/** Plausible specs for a simulated "idle laptop in a college lab" style provider. */
export function randomVirtualSpecs(seed: number): DetectedSpecs {
  return VIRTUAL_PROFILES[seed % VIRTUAL_PROFILES.length];
}
