type UploadProgress = {
  fileName: string;
  totalBatches: number;
  completedBatches: number;
  status: "processing" | "completed" | "failed";
  error?: string;
  steps: string[];
};

const MAX_STEPS = 300;

function timeStamp() {
  return new Date().toISOString();
}

function trimSteps(steps: string[]) {
  return steps.length > MAX_STEPS ? steps.slice(steps.length - MAX_STEPS) : steps;
}

function addLine(p: UploadProgress, line: string): UploadProgress {
  const steps = trimSteps([...p.steps, `${timeStamp()} ${line}`]);
  return { ...p, steps };
}

function initialProgress(fileName: string, totalBatches: number): UploadProgress {
  return {
    fileName,
    totalBatches,
    completedBatches: 0,
    status: "processing",
    steps: [`${timeStamp()} Upload started for ${fileName} with ${totalBatches} batches`],
  };
}

const memory = new Map<string, UploadProgress>();

export const progressTracker = {
  init(uploadId: string, fileName: string, totalBatches: number) {
    memory.set(uploadId, initialProgress(fileName, totalBatches));
  },
  setTotalBatches(uploadId: string, totalBatches: number) {
    const cur = memory.get(uploadId);
    if (!cur) return;
    memory.set(uploadId, addLine({ ...cur, totalBatches }, `totalBatches set to ${totalBatches}`));
  },
  update(uploadId: string) {
    const cur = memory.get(uploadId);
    if (!cur) return;
    const newCount = Math.min(cur.completedBatches + 1, cur.totalBatches);
    const next = addLine(cur, `Batch ${newCount}/${cur.totalBatches} completed`);
    memory.set(uploadId, { ...next, completedBatches: newCount });
  },
  step(uploadId: string, message: string) {
    const cur = memory.get(uploadId);
    if (!cur) return;
    memory.set(uploadId, addLine(cur, message));
  },
  complete(uploadId: string, message = "Upload completed successfully") {
    const cur = memory.get(uploadId);
    if (!cur) return;
    const next = addLine(cur, message);
    memory.set(uploadId, { ...next, status: "completed" });
  },
  fail(uploadId: string, error = "An unexpected error occurred") {
    const cur = memory.get(uploadId);
    if (!cur) return;
    const next = addLine(cur, `Failed: ${error}`);
    memory.set(uploadId, { ...next, status: "failed", error });
  },
  get(uploadId: string): UploadProgress | null {
    return memory.get(uploadId) || null;
  },
  reset(uploadId: string) {
    memory.delete(uploadId);
  },
};

export const progressTrackerKV = (kv: KVNamespace) => ({
  async init(uploadId: string, fileName: string, totalBatches: number) {
    const data = initialProgress(fileName, totalBatches);
    await kv.put(`progress:${uploadId}`, JSON.stringify(data), { expirationTtl: 86400 });
  },
  async setTotalBatches(uploadId: string, totalBatches: number) {
    const curRaw = await kv.get(`progress:${uploadId}`);
    if (!curRaw) return;
    const cur = JSON.parse(curRaw) as UploadProgress;
    const next = addLine({ ...cur, totalBatches }, `totalBatches set to ${totalBatches}`);
    await kv.put(`progress:${uploadId}`, JSON.stringify(next), { expirationTtl: 86400 });
  },
  async update(uploadId: string) {
    const curRaw = await kv.get(`progress:${uploadId}`);
    if (!curRaw) return;
    const cur = JSON.parse(curRaw) as UploadProgress;
    const newCount = Math.min(cur.completedBatches + 1, cur.totalBatches);
    const next = addLine(cur, `Batch ${newCount}/${cur.totalBatches} completed`);
    const fin = { ...next, completedBatches: newCount };
    await kv.put(`progress:${uploadId}`, JSON.stringify(fin), { expirationTtl: 86400 });
  },
  async step(uploadId: string, message: string) {
    const curRaw = await kv.get(`progress:${uploadId}`);
    if (!curRaw) return;
    const cur = JSON.parse(curRaw) as UploadProgress;
    const next = addLine(cur, message);
    await kv.put(`progress:${uploadId}`, JSON.stringify(next), { expirationTtl: 86400 });
  },
  async complete(uploadId: string, message = "Upload completed successfully") {
    const curRaw = await kv.get(`progress:${uploadId}`);
    if (!curRaw) return;
    const cur = JSON.parse(curRaw) as UploadProgress;
    const next = addLine(cur, message);
    await kv.put(`progress:${uploadId}`, JSON.stringify({ ...next, status: "completed" }), { expirationTtl: 86400 });
  },
  async fail(uploadId: string, error = "An unexpected error occurred") {
    const curRaw = await kv.get(`progress:${uploadId}`);
    if (!curRaw) return;
    const cur = JSON.parse(curRaw) as UploadProgress;
    const next = addLine(cur, `Failed: ${error}`);
    await kv.put(`progress:${uploadId}`, JSON.stringify({ ...next, status: "failed", error }), { expirationTtl: 86400 });
  },
  async get(uploadId: string): Promise<UploadProgress | null> {
    const raw = await kv.get(`progress:${uploadId}`);
    return raw ? (JSON.parse(raw) as UploadProgress) : null;
  },
  async reset(uploadId: string) {
    await kv.delete(`progress:${uploadId}`);
  },
});
