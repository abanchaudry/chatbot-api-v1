export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type LedgerCall = {
  name: string;          // "preflight" | "embed" | "rerank" | "gate" | "answer"
  model: string;
  usage: TokenUsage;
  costUsd?: number;
};

export type TokenLedger = {
  calls: LedgerCall[];
  totals: TokenUsage;
  totalCostUsd: number;
};

export function makeLedger(): TokenLedger {
  return {
    calls: [],
    totals: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    totalCostUsd: 0,
  };
}

export function extractUsageFromLangChain(res: any): { model?: string; usage?: TokenUsage } {
  const meta = res?.response_metadata || {};
  const usage =
    meta?.token_usage ||
    res?.usage_metadata ||
    res?.response_metadata?.usage ||
    null;

  // Normalize fields if present
  if (!usage) return {};

  const u: TokenUsage = {
    prompt_tokens: Number(usage.prompt_tokens || usage.input_tokens || 0),
    completion_tokens: Number(usage.completion_tokens || usage.output_tokens || 0),
    total_tokens: Number(usage.total_tokens || 0),
  };

  // If total_tokens missing, compute
  if (!u.total_tokens) u.total_tokens = u.prompt_tokens + u.completion_tokens;

  const model = meta?.model || res?.model || undefined;
  return { model, usage: u };
}

/**
 * Pricing is intentionally NOT hard-coded.
 * You pass modelRates from env/config: { "<model>": { in: number, out: number } } per 1M tokens.
 */
export function costUsdForUsage(
  usage: TokenUsage,
  rates?: { inputPer1M: number; outputPer1M: number }
) {
  if (!rates) return 0;
  const inCost = (usage.prompt_tokens / 1_000_000) * rates.inputPer1M;
  const outCost = (usage.completion_tokens / 1_000_000) * rates.outputPer1M;
  return inCost + outCost;
}

export function ledgerAdd(
  ledger: TokenLedger,
  call: { name: string; model?: string; usage?: TokenUsage; costUsd?: number }
) {
  if (!call.usage) return;

  const model = call.model || "unknown";
  const usage = call.usage;

  ledger.calls.push({
    name: call.name,
    model,
    usage,
    costUsd: call.costUsd,
  });

  ledger.totals.prompt_tokens += usage.prompt_tokens;
  ledger.totals.completion_tokens += usage.completion_tokens;
  ledger.totals.total_tokens += usage.total_tokens;

  ledger.totalCostUsd += Number(call.costUsd || 0);
}
