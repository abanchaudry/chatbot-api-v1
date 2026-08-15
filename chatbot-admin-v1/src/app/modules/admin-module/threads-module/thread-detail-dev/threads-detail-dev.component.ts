import { Component, OnInit, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ThreadsService } from "src/app/modules/shared/services/thread.service";
import { jsPDF } from "jspdf";
import { messageTraceService } from "src/app/modules/shared/services/message-traces.service";

type TraceEvent = { ts?: number; level?: string; scope?: string; name?: string; data?: any };

type AskTrace = {
  traceId?: string;
  startedAt?: string;
  userId: string;
  threadId: string;
  message: string;
  resolvedQuestion?: string;
  language?: string;
  assistantName?: string;
  domainHint?: string;
  flags?: { debug?: boolean; onlySearch?: boolean; enableWeb?: boolean; enablePdf?: boolean };

  timings?: Record<string, number>;
  logs?: TraceEvent[];
  retrieval?: { vectorHits?: any[]; webHits?: any[]; pdfHits?: any[]; autoragHits?: any[] };

  router?: any;
  planner?: any;
  rerank?: any;
  fusion?: any;
  answer?: any;
  gate?: any;
  context?: any;

  request?: any;
  history?: any;
  preflight?: any;
  vector?: any;
  web?: any;
  pdf?: any;
  autorag?: any;

  trace?: any;
  embed?:any;
};

type ConversationItem = {
  id?: string;
  question: string;
  answer: string;
  createdAt?: string;

  isAnswered?: boolean;
  tokenUsage?: number;

  traceLoaded?: boolean;
  trace?: AskTrace | null;
};

type TraceTab = "overview" | "timings" | "pipeline" | "retrieval" | "logs" | "raw";
type SearchMode = "highlight" | "filter";

type PipelineStage = {
  key: string;
  label: string;
  ms: number;
  pct: number;
  badgeLabel: string;
  badgeCls: string;
  note: string;
  data: any;
};

@Component({
  selector: "app-threads-detail-dev",
  templateUrl: "./threads-detail-dev.component.html",
  styleUrls: ["./threads-detail-dev.component.scss"],
})
export class ThreadsDetailDevComponent implements OnInit {
  threadId: string;
  conversation: ConversationItem[] = [];
  isLoading = true;

  iconClass = "ri-download-line";
  isDownloading = false;

  selectedIndex: number | null = null;
  selectedMessageId: string | null = null;
  selectedTrace: AskTrace | null = null;
  selectedTraceError: string | null = null;

  traceLoadingMap: Record<string, boolean> = {};

  traceSearch = "";
  traceTab: TraceTab = "overview";
  showOnlyErrors = false;
  searchMode: SearchMode = "highlight";

  expandedHitKey: string | null = null;
  expandedStageKey: string | null = null;
  copiedToast = false;

  isInspectOpen = false;
  activeScope: string = "ALL";

  constructor(
    private threadService: ThreadsService,
    private messageTraceService: messageTraceService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.threadId = params.get("id");
      this.getThreadDetail(this.threadId);
    });
  }

  @HostListener("document:keydown.escape")
  onEsc() {
    if (this.isInspectOpen) this.closeInspect();
  }

  private lockBodyScroll(lock: boolean) {
    document.body.style.overflow = lock ? "hidden" : "";
  }

  /** -----------------------------
   * KPI GETTERS (Top 4 cards)
   * ----------------------------- */
  get kpiTotalMessages(): number {
    return Array.isArray(this.conversation) ? this.conversation.length : 0;
  }

  get kpiAnswered(): number {
    return (this.conversation || []).filter((x) => x?.isAnswered === true).length;
  }

  get kpiNotAnswered(): number {
    const fallbackish = (a: string) => {
      const s = String(a || "").toLowerCase();
      return (
        !s.trim() ||
        s.includes("i don’t have enough information") ||
        s.includes("i don't have enough information") ||
        s === "fallback"
      );
    };

    return (this.conversation || []).filter((x) => {
      if (typeof x?.isAnswered === "boolean") return x.isAnswered === false;
      return fallbackish(x?.answer);
    }).length;
  }

  get kpiTotalTokens(): number {
    return (this.conversation || []).reduce((sum, x) => sum + (Number(x?.tokenUsage) || 0), 0);
  }

  /** -----------------------------
   * Data
   * ----------------------------- */
  getThreadDetail(threadId: string) {
    this.isLoading = true;
    this.threadService.getThreadDetail(threadId).subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];

        this.conversation = list.map((x: any) => ({
          id: String(x?.id ?? x?.messageId ?? x?.meta?.id ?? "").trim() || undefined,
          question: String(x?.question ?? x?.meta?.message ?? ""),
          answer: String(x?.answer ?? ""),
          createdAt: x?.createdAt ?? x?.meta?.createdAt ?? x?.created_at ?? undefined,

          isAnswered: Boolean(x?.is_answered === 1 || x?.is_answered === true),
          tokenUsage: Number(x?.token_usage ?? x?.tokensUsed ?? 0) || 0,

          traceLoaded: false,
          trace: null,
        }));

        this.isLoading = false;
      },
      error: () => {
        this.conversation = [];
        this.isLoading = false;
      },
    });
  }

  /** -----------------------------
   * Inspect drawer
   * ----------------------------- */
  openInspect(item: ConversationItem, index: number) {
    const messageId = item?.id;
    if (!messageId) return;

    this.selectedIndex = index;
    this.selectedMessageId = messageId;
    this.selectedTraceError = null;
    this.traceSearch = "";
    this.traceTab = "overview";
    this.showOnlyErrors = false;
    this.searchMode = "highlight";
    this.expandedHitKey = null;
    this.expandedStageKey = null;
    this.activeScope = "ALL";

    this.isInspectOpen = true;
    this.lockBodyScroll(true);

    if (item.traceLoaded && item.trace) {
      this.selectedTrace = item.trace;
      return;
    }

    this.selectedTrace = null;
    this.traceLoadingMap[messageId] = true;

    this.messageTraceService.getMessageTrace(messageId).subscribe({
      next: (res) => {
        const traceJson =
          res?.data?.trace_json ||
          res?.data?.traceJson ||
          res?.trace_json ||
          res?.data?.trace ||
          res?.trace;

        const parsed = this.parseTrace(traceJson);
        if (!parsed) {
          this.selectedTraceError = "Trace not available or invalid.";
          this.traceLoadingMap[messageId] = false;
          return;
        }

        // ✅ normalize timing keys + total_ms so UI never shows 0
        const normalized = this.normalizeTrace(parsed);

        item.traceLoaded = true;
        item.trace = normalized;
        this.selectedTrace = normalized;
        this.traceLoadingMap[messageId] = false;
      },
      error: () => {
        this.selectedTraceError = "Failed to load trace.";
        this.traceLoadingMap[messageId] = false;
      },
    });
  }

  closeInspect() {
    this.isInspectOpen = false;
    this.lockBodyScroll(false);

    this.selectedIndex = null;
    this.selectedMessageId = null;
    this.selectedTrace = null;
    this.selectedTraceError = null;
    this.traceSearch = "";
    this.traceTab = "overview";
    this.showOnlyErrors = false;
    this.searchMode = "highlight";
    this.expandedHitKey = null;
    this.expandedStageKey = null;
    this.activeScope = "ALL";
  }

  setTab(tab: TraceTab) {
    this.traceTab = tab;
    this.expandedHitKey = null;
    this.expandedStageKey = null;
  }

  toggleHit(key: string) {
    this.expandedHitKey = this.expandedHitKey === key ? null : key;
  }

  toggleStage(key: string) {
    this.expandedStageKey = this.expandedStageKey === key ? null : key;
  }

  toggleSearchMode() {
    this.searchMode = this.searchMode === "highlight" ? "filter" : "highlight";
  }

  copyTraceJson() {
    if (!this.selectedTrace) return;
    const json = JSON.stringify(this.selectedTrace, null, 2);
    navigator.clipboard?.writeText(json);
    this.copiedToast = true;
    setTimeout(() => (this.copiedToast = false), 900);
  }

  /** -----------------------------
   * Normalization (CRITICAL for your sample log)
   * ----------------------------- */
private normalizeTrace(trace: AskTrace): AskTrace {
  const t: Record<string, number> = { ...(trace?.timings || {}) };
  const logs: TraceEvent[] = Array.isArray(trace?.logs) ? trace.logs : [];
  const r = (trace?.retrieval || {}) as any;

  // ✅ Always produce retrieval arrays (prevents aside "retrieval" tab from breaking)
  const vectorHits = Array.isArray(r.vectorHits) ? r.vectorHits : Array.isArray((trace as any)?.vectorHits) ? (trace as any).vectorHits : [];
  const webHits = Array.isArray(r.webHits) ? r.webHits : Array.isArray((trace as any)?.webHits) ? (trace as any).webHits : [];
  const pdfHits = Array.isArray(r.pdfHits) ? r.pdfHits : Array.isArray((trace as any)?.pdfHits) ? (trace as any).pdfHits : [];

  // ✅ Your backend now only uses "autorag_web" in traceSetRetrievalHits but it stores into:
  // trace.retrieval.autoragHits + trace.autoragHits (mirror) + scope="autorag"
  const autoragHits =
    Array.isArray(r.autoragHits)
      ? r.autoragHits
      : Array.isArray((trace as any)?.autoragHits)
      ? (trace as any).autoragHits
      : [];

  // ✅ Provide total_ms reliably (only for aside timings tab)
  let total = typeof t["total_ms"] === "number" ? t["total_ms"] : 0;
  if (!total) {
    const sum = Object.values(t).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
    total = sum;

    if (!total && logs.length) {
      const ts = logs
        .map((e) => (typeof e?.ts === "number" ? e.ts : null))
        .filter((x) => x != null) as number[];
      if (ts.length) total = Math.max(0, Math.max(...ts) - Math.min(...ts));
    }

    t["total_ms"] = total;
  }

  // ✅ Keep your macro keys behavior
  if (typeof t["history_ms"] !== "number") {
    const hv = t["history_load"] ?? (t as any)["history_load_ms"] ?? t["history"] ?? 0;
    if (typeof hv === "number") t["history_ms"] = hv;
  }

  if (typeof t["preflight_ms"] !== "number") {
    const pv = t["preflight"] ?? (t as any)["preflight_total"] ?? 0;
    if (typeof pv === "number") t["preflight_ms"] = pv;
  }

  if (typeof t["answer_ms"] !== "number") {
    const av = t["answer"] ?? t["smalltalk_answer"] ?? 0;
    if (typeof av === "number") t["answer_ms"] = av;
  }

  return {
    ...trace,
    timings: t,
    retrieval: {
      ...(trace?.retrieval || {}),
      vectorHits,
      webHits,
      pdfHits,
      autoragHits, // ✅ always present
    },
    // ✅ optional mirror for aside usage (doesn't affect other parts)
    autorag: (trace as any)?.autorag ?? (trace as any)?.autorag_web ?? trace.autorag,
  };
}

  /** -----------------------------
   * Timings + metrics helpers
   * ----------------------------- */
  getTiming(trace: AskTrace, key: string): number | null {
    const t = trace?.timings || {};
    const v = t[key];
    return typeof v === "number" ? v : null;
  }

  traceTimingKeys(trace: AskTrace): string[] {
    const t = trace?.timings || {};
    return Object.keys(t).sort((a, b) => (t[b] || 0) - (t[a] || 0));
  }

  timingPct(trace: AskTrace, ms: number): number {
    const total = this.getTiming(trace, "total_ms") ?? 0;
    if (!total || !ms) return 0;
    const v = (ms / total) * 100;
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  getTraceRoute(trace: AskTrace): string {
    const router = trace?.router;
    const route = router?.route || router?.raw?.route;
    if (typeof route === "string" && route.trim()) return route;

    const pf = trace?.preflight?.route;
    if (typeof pf === "string" && pf.trim()) return pf;

    const ansRoute = trace?.answer?.route;
    if (typeof ansRoute === "string" && ansRoute.trim()) return ansRoute;

    // Some traces store route inside logs preflight_parsed
    const fromLogs = trace?.logs?.find((e) => e?.scope === "steps" && e?.name === "preflight_parsed:end")?.data?.route;
    if (typeof fromLogs === "string" && fromLogs.trim()) return fromLogs;

    return "RAG";
  }

  isFallbackFromTrace(trace: AskTrace): boolean {
    const v = trace?.answer?.fallback;
    if (v === true) return true;

    const a = String(trace?.answer?.answer || trace?.answer?.text || "").toLowerCase();
    if (a === "fallback" || a.includes("i don't have enough information") || a.includes("i don’t have enough information"))
      return true;

    return false;
  }

  getUsedChunks(trace: AskTrace): number | null {
    const chosen = trace?.fusion?.chosen;
    if (Array.isArray(chosen)) return chosen.length;

    const used = trace?.context?.used;
    if (typeof used === "number") return used;

    const used2 = trace?.answer?.usedChunks;
    if (typeof used2 === "number") return used2;

    const used3 = trace?.logs?.find((e) => e?.scope === "context" && e?.name === "final")?.data?.used;
    if (typeof used3 === "number") return used3;

    return null;
  }

  getRetrievalHits(trace: AskTrace, source: "vector" | "web" | "pdf"): any[] {
    const r = trace?.retrieval || {};
    const arr =
      source === "vector"
        ? r.vectorHits || []
        : source === "web"
        ? r.webHits || []
        : r.pdfHits || [];
    return this.searchMode === "filter" ? this.filterArrayBySearch(arr) : arr;
  }

  getTopScores(trace: AskTrace): { vector: number | null; web: number | null; pdf: number | null } {
    const vec = this.pickTopScore(this.getRetrievalHits(trace, "vector"));
    const web = this.pickTopScore(this.getRetrievalHits(trace, "web"));
    const pdf = this.pickTopScore(this.getRetrievalHits(trace, "pdf"));
    return { vector: vec, web, pdf };
  }

  private pickTopScore(hits: any[]): number | null {
    if (!Array.isArray(hits) || hits.length === 0) return null;
    const nums = hits
      .map((h) => (typeof h?.score === "number" ? h.score : null))
      .filter((x) => typeof x === "number") as number[];
    if (!nums.length) return null;
    return Math.max(...nums);
  }

  getCoverage(trace: AskTrace): number | null {
    const c =
      trace?.rerank?.coverage ??
      trace?.gate?.coverage ??
      trace?.logs?.find((e) => e?.scope === "rerank" && e?.name === "done")?.data?.coverage;
    return typeof c === "number" ? c : null;
  }

  getGateDecision(trace: AskTrace): string {
    const d =
      trace?.gate?.decision ??
      trace?.gate?.raw?.decision ??
      trace?.logs?.find((e) => e?.scope === "gate" && e?.name === "done")?.data?.decision;
    if (typeof d === "string" && d.trim()) return d;
    return "N/A";
  }

  getGateReason(trace: AskTrace): string {
    const r =
      trace?.gate?.reason ??
      trace?.logs?.find((e) => e?.scope === "gate" && e?.name === "done")?.data?.reason;
    if (typeof r === "string" && r.trim()) return r;
    return "";
  }

  getContextSummary(trace: AskTrace): { selectedSource: string; used: number; ctxChars: number | null } {
    const sel = String(
      trace?.context?.selectedSource ??
        trace?.logs?.find((e) => e?.scope === "context" && e?.name === "final")?.data?.selectedSource ??
        "N/A"
    );

    const used =
      typeof trace?.context?.used === "number"
        ? trace.context.used
        : trace?.logs?.find((e) => e?.scope === "context" && e?.name === "final")?.data?.used ?? null;

    const usedN = typeof used === "number" ? used : this.getUsedChunks(trace) ?? 0;

    const cc =
      trace?.context?.ctxChars ??
      trace?.logs?.find((e) => e?.scope === "context" && e?.name === "final")?.data?.ctxChars;

    const ctxChars = typeof cc === "number" ? cc : null;

    return { selectedSource: sel, used: usedN, ctxChars };
  }

  getLatencyLabel(trace: AskTrace): string {
    const total = this.getTiming(trace, "total_ms") ?? 0;
    if (total >= 24000) return "Slow";
    if (total >= 12000) return "Medium";
    return "Fast";
  }

  /** -----------------------------
   * Logs + filters
   * ----------------------------- */
getLogs(trace: AskTrace): TraceEvent[] {
  const logs = Array.isArray(trace?.logs) ? trace.logs : [];

  // ✅ stable sort by ts then name (so UI order is consistent)
  const sorted = logs
    .slice()
    .sort((a, b) => (Number(a?.ts || 0) - Number(b?.ts || 0)) || String(a?.name || "").localeCompare(String(b?.name || "")));

  const filtered = this.searchMode === "filter" ? this.filterLogsBySearch(sorted) : sorted;

  if (!this.showOnlyErrors) return filtered;

  return filtered.filter((e) => {
    const lvl = String(e?.level || "").toLowerCase();
    return lvl === "error" || lvl === "warn";
  });
}

  getScopedLogs(trace: AskTrace): TraceEvent[] {
    const logs = this.getLogs(trace);
    if (this.activeScope === "ALL") return logs;
    return logs.filter((e) => String(e?.scope || "") === this.activeScope);
  }

  getLogCounts(trace: AskTrace): { error: number; warn: number; scopes: number } {
    const logs = this.getLogs(trace);
    let error = 0;
    let warn = 0;
    const scopes = new Set<string>();
    logs.forEach((e) => {
      const lvl = String(e?.level || "").toLowerCase();
      if (lvl === "error") error++;
      if (lvl === "warn") warn++;
      if (e?.scope) scopes.add(String(e.scope));
    });
    return { error, warn, scopes: scopes.size };
  }

  getScopes(trace: AskTrace): string[] {
    const logs = this.getLogs(trace);
    const scopes = Array.from(new Set(logs.map((e) => String(e?.scope || "")).filter(Boolean)));
    return scopes.sort();
  }

  getScopeCount(trace: AskTrace, scope: string): number {
    const logs = this.getLogs(trace);
    return logs.filter((e) => String(e?.scope || "") === scope).length;
  }

  setScope(scope: string) {
    this.activeScope = scope || "ALL";
  }

  getLogBadgeClass(level: any) {
    const v = String(level || "").toLowerCase();
    if (v === "error") return "badge badge-error";
    if (v === "warn") return "badge badge-warn";
    if (v === "debug") return "badge badge-debug";
    return "badge badge-info";
  }

  getHealth(trace: AskTrace) {
    const total = this.getTiming(trace, "total_ms") ?? 0;
    const fallback = this.isFallbackFromTrace(trace);
    const hasAny =
      (this.getRetrievalHits(trace, "vector") || []).length > 0 ||
      (this.getRetrievalHits(trace, "web") || []).length > 0 ||
      (this.getRetrievalHits(trace, "pdf") || []).length > 0;

    const hasVec = (this.getRetrievalHits(trace, "vector") || []).length > 0;

    if (fallback) return { label: "fallback", cls: "pill pill-warn" };
    if (!hasAny) return { label: "no hits", cls: "pill pill-muted" };
    if (!hasVec) return { label: "no vector", cls: "pill pill-muted" };
    if (total >= 24000) return { label: "slow", cls: "pill pill-warn" };
    return { label: "ok", cls: "pill pill-ok" };
  }

  /** -----------------------------
   * Pipeline
   * ----------------------------- */
  getPipeline(trace: AskTrace): PipelineStage[] {
    const logs = Array.isArray(trace?.logs) ? trace.logs : [];
    const total = this.getTiming(trace, "total_ms") ?? 0;

    // ✅ Works with your sample timings keys
    const stageDefs: Array<{
      key: string;
      label: string;
      timingKeys?: string[];
      scope?: string;
      note?: (t: AskTrace) => string;
      data?: (t: AskTrace) => any;
    }> = [
      {
        key: "request",
        label: "Request",
        timingKeys: ["request"],
        scope: "steps",
        note: () => "",
        data: (t) => t.request,
      },
      {
        key: "history",
        label: "History",
        timingKeys: ["history_ms", "history_load", "history_load_ms", "history"],
        scope: "history",
        data: (t) => t.history,
      },
      {
        key: "preflight",
        label: "Preflight",
        timingKeys: ["preflight_ms", "preflight"],
        scope: "preflight",
        data: (t) => t.preflight,
        note: (t) => {
          const r = t?.preflight?.route ?? t?.logs?.find((e) => e?.name === "preflight_parsed:end")?.data?.route;
          return typeof r === "string" ? r : "";
        },
      },
      {
        key: "embed",
        label: "Embed",
        timingKeys: ["embed_message", "embed"],
        scope: "embed",
        data: (t) => t.embed,
        note: () => "",
      },
      {
        key: "vector",
        label: "Vector",
        timingKeys: ["vector_ms", "vector"],
        scope: "vector",
        data: (t) => ({ ...t.vector, hits: t.retrieval?.vectorHits?.length || 0, top: this.getTopScores(t).vector }),
      },
      {
        key: "web",
        label: "Web",
        timingKeys: ["web_ms", "web"],
        scope: "web",
        data: (t) => ({ ...t.web, hits: t.retrieval?.webHits?.length || 0, top: this.getTopScores(t).web }),
      },
      {
        key: "pdf",
        label: "PDF",
        timingKeys: ["pdf_ms", "pdf"],
        scope: "pdf",
        data: (t) => ({ ...t.pdf, hits: t.retrieval?.pdfHits?.length || 0, top: this.getTopScores(t).pdf }),
      },
      {
        key: "answer",
        label: "Answer",
        timingKeys: ["answer_ms", "answer", "smalltalk_answer"],
        scope: "answer",
        data: (t) => t.answer,
        note: (t) => (this.isFallbackFromTrace(t) ? "fallback" : ""),
      },
      { key: "fusion", label: "Fusion", scope: "fusion", data: (t) => t.fusion },
      { key: "rerank", label: "Rerank", scope: "rerank", note: (t) => (this.getCoverage(t) != null ? `coverage ${this.getCoverage(t)}%` : ""), data: (t) => t.rerank },
      { key: "gate", label: "Gate", scope: "gate", note: (t) => this.getGateDecision(t), data: (t) => t.gate },
      { key: "context", label: "Context", scope: "context", note: (t) => `${this.getContextSummary(t).used} used`, data: (t) => t.context },
    ];

    const spansByScope = this.computeScopeSpans(logs);

    const out: PipelineStage[] = stageDefs
      .map((d) => {
        const msA = this.pickTimingAny(trace, d.timingKeys);
        const msB = d.scope ? spansByScope[d.scope]?.ms ?? null : null;
        const ms = typeof msA === "number" ? msA : typeof msB === "number" ? msB : 0;

        const pct = total ? Math.max(0, Math.min(100, Math.round((ms / total) * 100))) : 0;

        const sData = d.data ? d.data(trace) : this.pickScopeLogs(logs, d.scope);
        const note = d.note ? d.note(trace) : "";

        const badge = this.stageBadge(trace, d.key);

        return {
          key: d.key,
          label: d.label,
          ms,
          pct,
          badgeLabel: badge.label,
          badgeCls: badge.cls,
          note: note || "",
          data: sData,
        };
      })
      .filter((s) => s.ms > 0 || ["fusion", "rerank", "gate", "context"].includes(s.key));

    return this.searchMode === "filter" ? out.filter((s) => this.stageMatchesSearch(s)) : out;
  }

  private pickTimingAny(trace: AskTrace, keys?: string[]): number | null {
    if (!keys?.length) return null;
    for (const k of keys) {
      const v = this.getTiming(trace, k);
      if (typeof v === "number" && v > 0) return v;
    }
    return null;
  }

  private stageMatchesSearch(s: PipelineStage): boolean {
    const q = (this.traceSearch || "").trim().toLowerCase();
    if (!q) return true;
    const blob = `${s.key} ${s.label} ${s.note} ${JSON.stringify(s.data ?? {})}`.toLowerCase();
    return blob.includes(q);
  }

  private stageBadge(trace: AskTrace, key: string): { label: string; cls: string } {
    const decision = this.getGateDecision(trace);
    const totals = {
      vec: this.getRetrievalHits(trace, "vector").length,
      web: this.getRetrievalHits(trace, "web").length,
      pdf: this.getRetrievalHits(trace, "pdf").length,
    };

    if (key === "vector") {
      if (totals.vec === 0) return { label: "MISS", cls: "badge-muted" };
      const top = this.getTopScores(trace).vector ?? 0;
      return top >= 60 ? { label: "OK", cls: "badge-ok" } : { label: "LOW", cls: "badge-warn2" };
    }

    if (key === "web") {
      if (totals.web === 0) return { label: "MISS", cls: "badge-muted" };
      return { label: "OK", cls: "badge-info2" };
    }

    if (key === "pdf") {
      if (totals.pdf === 0) return { label: "MISS", cls: "badge-muted" };
      return { label: "OK", cls: "badge-ok" };
    }

    if (key === "gate") {
      if (decision === "YES") return { label: "PASS", cls: "badge-ok" };
      if (decision === "NO") return { label: "BLOCK", cls: "badge-error2" };
      return { label: "N/A", cls: "badge-muted" };
    }

    if (key === "answer") {
      if (this.isFallbackFromTrace(trace)) return { label: "FALLBACK", cls: "badge-warn2" };
      return { label: "OK", cls: "badge-ok" };
    }

    if (key === "preflight") {
      const r = this.getTraceRoute(trace);
      if (r === "LANGUAGE_MISMATCH") return { label: "LANG", cls: "badge-warn2" };
      if (r === "NEEDS_CLARIFICATION") return { label: "CLARIFY", cls: "badge-info2" };
      if (r === "SMALL_TALK") return { label: "CHAT", cls: "badge-ok" };
      return { label: "OK", cls: "badge-ok" };
    }

    return { label: "OK", cls: "badge-info2" };
  }

  private computeScopeSpans(logs: TraceEvent[]): Record<string, { start: number; end: number; ms: number }> {
    const by: Record<string, { start: number; end: number }> = {};
    (logs || []).forEach((e) => {
      const scope = String(e?.scope || "");
      const ts = typeof e?.ts === "number" ? e.ts : null;
      if (!scope || ts == null) return;
      if (!by[scope]) by[scope] = { start: ts, end: ts };
      by[scope].start = Math.min(by[scope].start, ts);
      by[scope].end = Math.max(by[scope].end, ts);
    });

    const out: Record<string, { start: number; end: number; ms: number }> = {};
    Object.keys(by).forEach((k) => {
      const s = by[k];
      out[k] = { start: s.start, end: s.end, ms: Math.max(0, s.end - s.start) };
    });
    return out;
  }

  private pickScopeLogs(logs: TraceEvent[], scope?: string): any {
    if (!scope) return null;
    const rows = (logs || []).filter((e) => String(e?.scope || "") === scope);
    if (!rows.length) return null;
    return rows.map((e) => ({ ts: e.ts, level: e.level, name: e.name, data: e.data }));
  }

  /** -----------------------------
   * Formatting
   * ----------------------------- */
  formatTs(ts: any): string {
    const n = typeof ts === "number" ? ts : Number(ts);
    if (!Number.isFinite(n)) return "";
    const d = new Date(n);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  toFixed(v: any, n: number): string {
    const x = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(x)) return "";
    return x.toFixed(n);
  }

  filterJson(obj: any): string {
    const str = JSON.stringify(obj ?? {}, null, 2);
    const q = (this.traceSearch || "").trim().toLowerCase();
    if (!q) return str;

    if (this.searchMode === "filter") {
      return str.toLowerCase().includes(q) ? str : "[filtered out]";
    }

    return this.highlightText(str, q);
  }

  filterText(text: any): string {
    const s = String(text ?? "");
    const q = (this.traceSearch || "").trim().toLowerCase();
    if (!q) return s;

    if (this.searchMode === "filter") {
      return s.toLowerCase().includes(q) ? s : "[filtered out]";
    }

    return this.highlightText(s, q);
  }

  private highlightText(s: string, q: string): string {
    if (!q) return s;
    const idx = s.toLowerCase().indexOf(q);
    if (idx < 0) return s;
    const before = s.slice(0, idx);
    const mid = s.slice(idx, idx + q.length);
    const after = s.slice(idx + q.length);
    return `${before}⟦${mid}⟧${after}`;
  }

  private filterArrayBySearch(arr: any[]): any[] {
    const q = (this.traceSearch || "").trim().toLowerCase();
    if (!q) return arr;

    return (arr || []).filter((x) => {
      const blob =
        String(x?.id ?? x?.sourceId ?? "") +
        " " +
        String(x?.sourceType ?? x?.type ?? "") +
        " " +
        String(x?.title ?? "") +
        " " +
        String(x?.section ?? "") +
        " " +
        String(x?.url ?? "") +
        " " +
        String(x?.text ?? "");
      return blob.toLowerCase().includes(q);
    });
  }

  private filterLogsBySearch(arr: TraceEvent[]): TraceEvent[] {
    const q = (this.traceSearch || "").trim().toLowerCase();
    if (!q) return arr;

    return (arr || []).filter((e) => {
      const blob =
        String(e?.level ?? "") +
        " " +
        String(e?.scope ?? "") +
        " " +
        String(e?.name ?? "") +
        " " +
        JSON.stringify(e?.data ?? {});
      return blob.toLowerCase().includes(q);
    });
  }

  /** -----------------------------
   * PDF export
   * ----------------------------- */
  downloadPDF() {
    this.isDownloading = true;
    this.iconClass = "ri-loader-4-line remix-spin";

    const doc = new jsPDF();
    let y = 10;
    const lineHeight = 10;
    const pageHeight = 280;

    this.conversation.forEach((item, index) => {
      const questionText = `Question ${index + 1}: ${item.question}`;
      const answerText = `${item.answer}`;

      doc.setFont("Helvetica", "bold");
      const questionLines = doc.splitTextToSize(questionText, 180);
      questionLines.forEach((line) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage();
          y = 10;
        }
        doc.text(line, 10, y);
        y += lineHeight;
      });

      doc.setFont("Helvetica", "normal");
      const answerLines = doc.splitTextToSize(answerText, 180);
      answerLines.forEach((line) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage();
          y = 10;
        }
        doc.text(line, 10, y);
        y += lineHeight;
      });

      y += lineHeight;
    });

    doc.save(`${this.threadId}-conversation.pdf`);

    setTimeout(() => {
      this.iconClass = "ri-check-line";
      setTimeout(() => {
        this.iconClass = "ri-download-line";
        this.isDownloading = false;
      }, 1200);
    }, 500);
  }

  /** -----------------------------
   * Trace parsing
   * ----------------------------- */
  private parseTrace(input: any): AskTrace | null {
    if (!input) return null;

    if (typeof input === "object") {
      const t = input as AskTrace;
      if (t?.trace && typeof t.trace === "object") return t.trace as AskTrace;
      if (t?.timings || t?.logs || t?.retrieval) return t;
      return t;
    }

    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        if (parsed?.trace && typeof parsed.trace === "object") return parsed.trace as AskTrace;
        return parsed as AskTrace;
      } catch {
        return null;
      }
    }

    return null;
  }

  /** -----------------------------
   * KPI Percentages
   * ----------------------------- */
  private pct(part: number, total: number): number {
    if (!total) return 0;
    const v = (part / total) * 100;
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  get kpiAnsweredPct(): number {
    return this.pct(this.kpiAnswered, this.kpiTotalMessages);
  }

  get kpiNotAnsweredPct(): number {
    return this.pct(this.kpiNotAnswered, this.kpiTotalMessages);
  }
}