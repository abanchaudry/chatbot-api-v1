import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { jsPDF } from "jspdf";
import { ThreadsService } from "src/app/modules/shared/services/thread.service";
import { messageTraceService } from "src/app/modules/shared/services/message-traces.service";

type TracePrimitive = string | number | boolean | null | undefined;
type TraceLevel = "info" | "warn" | "error" | "debug" | string;
type ViewMode = "client" | "developer";
type ClientTraceTab = "summary" | "sources" | "timeline";
type DeveloperTraceTab = "overview" | "timings" | "pipeline" | "retrieval" | "logs" | "raw";
type TraceTab = ClientTraceTab | DeveloperTraceTab;
type SearchMode = "highlight" | "filter";
type ConfidenceLabel = "High" | "Medium" | "Low" | "Limited";
type ScoreBucket = "High" | "Medium" | "Low";

type TraceEvent = {
  ts?: number;
  level?: TraceLevel;
  scope?: string;
  name?: string;
  data?: any;
};

type RetrievalHit = {
  id?: string | number;
  title?: string;
  score?: number;
  rawScore?: number;
  sourceType?: string;
  type?: string;
  source?: string;
  sourceName?: string;
  section?: string;
  url?: string;
  text?: string;
  excerpt?: string;
  used?: boolean;
  selected?: boolean;
  [key: string]: any;
};

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
  retrieval?: { vectorHits?: RetrievalHit[]; webHits?: RetrievalHit[]; pdfHits?: RetrievalHit[]; autoragHits?: RetrievalHit[] };
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
  embed?: any;
  [key: string]: any;
};

type ClientSourceCard = {
  id: string;
  title: string;
  sourceName: string;
  sourceType: string;
  section: string | null;
  excerpt: string;
  scoreBucket: ScoreBucket;
  scoreValue: number | null;
  usedInAnswer: boolean;
  url?: string;
};

type ClientTimelineItem = {
  key: string;
  label: string;
  description: string;
  durationMs: number | null;
  status: "complete" | "partial" | "skipped";
};

type ClientSummaryMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "info";
  hint?: string;
};

type ClientTraceSummary = {
  outcome: string;
  outcomeTone: "good" | "warn" | "neutral";
  routeLabel: string;
  routeDescription: string;
  totalMs: number | null;
  sourceCount: number;
  sourceType: string;
  usedChunks: number | null;
  confidenceLabel: ConfidenceLabel;
  fallback: boolean;
  narrative: string;
  metrics: ClientSummaryMetric[];
  timeline: ClientTimelineItem[];
  sources: ClientSourceCard[];
};

type ConversationCardSummary = {
  statusLabel: string;
  statusCls: string;
  conciseRow: string[];
  actionLabel: string;
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
  selector: "app-threads-detail-page",
  templateUrl: "./threads-detail-page.component.html",
  styleUrls: ["./threads-detail-page.component.scss"],
})
export class ThreadsDetailPageComponent implements OnInit {
  threadId: string;
  conversation: ConversationItem[] = [];
  isLoading = true;

  iconClass = "ri-download-line";
  isDownloading = false;

  viewMode: ViewMode = "client";
  traceTab: TraceTab = "summary";

  selectedIndex: number | null = null;
  selectedMessageId: string | null = null;
  selectedTrace: AskTrace | null = null;
  selectedTraceError: string | null = null;

  traceLoadingMap: Record<string, boolean> = {};

  traceSearch = "";
  showOnlyErrors = false;
  searchMode: SearchMode = "highlight";

  expandedHitKey: string | null = null;
  expandedStageKey: string | null = null;
  copiedToast = false;

  isInspectOpen = false;
  activeScope = "ALL";

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

  get isClientView(): boolean {
    return this.viewMode === "client";
  }

  get isDeveloperView(): boolean {
    return this.viewMode === "developer";
  }

  get clientTabs(): ClientTraceTab[] {
    return ["summary", "sources", "timeline"];
  }

  get developerTabs(): DeveloperTraceTab[] {
    return ["overview", "timings", "pipeline", "retrieval", "logs", "raw"];
  }

  get selectedItem(): ConversationItem | null {
    if (this.selectedIndex == null) return null;
    return this.conversation[this.selectedIndex] ?? null;
  }

  get selectedClientSummary(): ClientTraceSummary | null {
    return this.selectedTrace ? this.buildClientTraceSummary(this.selectedTrace) : null;
  }

  get kpiTotalMessages(): number {
    return Array.isArray(this.conversation) ? this.conversation.length : 0;
  }

  get kpiAnswered(): number {
    return (this.conversation || []).filter((x) => x?.isAnswered === true).length;
  }

  get kpiNotAnswered(): number {
    return (this.conversation || []).filter((x) => this.isAnswerFallbackish(x?.answer) || x?.isAnswered === false).length;
  }

  get kpiTotalTokens(): number {
    return (this.conversation || []).reduce((sum, x) => sum + (Number(x?.tokenUsage) || 0), 0);
  }

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
          isAnswered: typeof x?.is_answered === "boolean" ? x.is_answered : Boolean(x?.is_answered === 1),
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

  setViewMode(mode: ViewMode) {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.ensureTraceTabForMode();
  }

  openInspect(item: ConversationItem, index: number) {
    const messageId = item?.id;
    if (!messageId) return;

    this.selectedIndex = index;
    this.selectedMessageId = messageId;
    this.selectedTraceError = null;
    this.traceSearch = "";
    this.showOnlyErrors = false;
    this.searchMode = "highlight";
    this.expandedHitKey = null;
    this.expandedStageKey = null;
    this.activeScope = "ALL";
    this.traceTab = this.viewMode === "client" ? "summary" : "overview";

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
        const traceJson = res?.data?.trace_json || res?.data?.traceJson || res?.trace_json || res?.data?.trace || res?.trace;
        const parsed = this.parseTrace(traceJson);
        if (!parsed) {
          this.selectedTraceError = "Trace not available or invalid.";
          this.traceLoadingMap[messageId] = false;
          return;
        }

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
    this.traceTab = this.viewMode === "client" ? "summary" : "overview";
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

  private ensureTraceTabForMode() {
    if (this.isClientView && !this.clientTabs.includes(this.traceTab as ClientTraceTab)) {
      this.traceTab = "summary";
    }
    if (this.isDeveloperView && !this.developerTabs.includes(this.traceTab as DeveloperTraceTab)) {
      this.traceTab = "overview";
    }
  }

  private normalizeTrace(trace: AskTrace): AskTrace {
    const timings: Record<string, number> = { ...(trace?.timings || {}) };
    const logs: TraceEvent[] = Array.isArray(trace?.logs) ? trace.logs : [];
    const retrieval = (trace?.retrieval || {}) as AskTrace["retrieval"];

    const vectorHits = Array.isArray(retrieval?.vectorHits) ? retrieval.vectorHits : this.asArray<RetrievalHit>((trace as any)?.vectorHits);
    const webHits = Array.isArray(retrieval?.webHits) ? retrieval.webHits : this.asArray<RetrievalHit>((trace as any)?.webHits);
    const pdfHits = Array.isArray(retrieval?.pdfHits) ? retrieval.pdfHits : this.asArray<RetrievalHit>((trace as any)?.pdfHits);
    const autoragHits = Array.isArray(retrieval?.autoragHits)
      ? retrieval.autoragHits
      : this.asArray<RetrievalHit>((trace as any)?.autoragHits);

    let total = typeof timings.total_ms === "number" ? timings.total_ms : 0;
    if (!total) {
      total = Object.values(timings).reduce((acc, value) => acc + (typeof value === "number" ? value : 0), 0);
      if (!total && logs.length) {
        const ts = logs.map((event) => (typeof event?.ts === "number" ? event.ts : null)).filter((value) => value != null) as number[];
        if (ts.length) total = Math.max(0, Math.max(...ts) - Math.min(...ts));
      }
      timings.total_ms = total;
    }

    if (typeof timings.history_ms !== "number") {
      const historyValue = timings.history_load ?? (timings as any).history_load_ms ?? timings.history ?? 0;
      if (typeof historyValue === "number") timings.history_ms = historyValue;
    }

    if (typeof timings.preflight_ms !== "number") {
      const preflightValue = timings.preflight ?? (timings as any).preflight_total ?? 0;
      if (typeof preflightValue === "number") timings.preflight_ms = preflightValue;
    }

    if (typeof timings.answer_ms !== "number") {
      const answerValue = timings.answer ?? timings.smalltalk_answer ?? 0;
      if (typeof answerValue === "number") timings.answer_ms = answerValue;
    }

    return {
      ...trace,
      timings,
      retrieval: {
        ...(trace?.retrieval || {}),
        vectorHits,
        webHits,
        pdfHits,
        autoragHits,
      },
      autorag: (trace as any)?.autorag ?? (trace as any)?.autorag_web ?? trace.autorag,
    };
  }

  getTiming(trace: AskTrace, key: string): number | null {
    const value = trace?.timings?.[key];
    return typeof value === "number" ? value : null;
  }

  traceTimingKeys(trace: AskTrace): string[] {
    const timings = trace?.timings || {};
    return Object.keys(timings).sort((a, b) => (timings[b] || 0) - (timings[a] || 0));
  }

  timingPct(trace: AskTrace, ms: number): number {
    const total = this.getTiming(trace, "total_ms") ?? 0;
    if (!total || !ms) return 0;
    return Math.max(0, Math.min(100, Math.round((ms / total) * 100)));
  }

  getTraceRoute(trace: AskTrace): string {
    const route = trace?.router?.route || trace?.router?.raw?.route || trace?.preflight?.route || trace?.answer?.route;
    if (typeof route === "string" && route.trim()) return route;

    const fromLogs = trace?.logs?.find((event) => event?.scope === "steps" && event?.name === "preflight_parsed:end")?.data?.route;
    if (typeof fromLogs === "string" && fromLogs.trim()) return fromLogs;
    return "RAG";
  }

  getClientRouteLabel(trace: AskTrace): string {
    return this.routeLabelFromKey(this.getTraceRoute(trace));
  }

  getClientRouteDescription(trace: AskTrace): string {
    const route = this.getTraceRoute(trace);
    const map: Record<string, string> = {
      RAG: "The assistant looked up supporting context before answering.",
      SMALL_TALK: "The assistant answered directly without needing document retrieval.",
      NEEDS_CLARIFICATION: "The assistant determined that the request needed clarification before a confident answer.",
      LANGUAGE_MISMATCH: "The request required language handling before a final response could be produced.",
      SEARCH_ONLY: "The request was handled as a search-first response.",
      WEB_ONLY: "The assistant relied primarily on web sources for this reply.",
    };
    return map[route] || "The assistant selected the best available handling path for this request.";
  }

  isFallbackFromTrace(trace: AskTrace): boolean {
    if (trace?.answer?.fallback === true) return true;
    const answer = String(trace?.answer?.answer || trace?.answer?.text || "");
    return this.isAnswerFallbackish(answer);
  }

  getUsedChunks(trace: AskTrace): number | null {
    const chosen = trace?.fusion?.chosen;
    if (Array.isArray(chosen)) return chosen.length;

    const candidates = [
      trace?.context?.used,
      trace?.answer?.usedChunks,
      trace?.logs?.find((event) => event?.scope === "context" && event?.name === "final")?.data?.used,
    ];

    for (const value of candidates) {
      if (typeof value === "number") return value;
    }
    return null;
  }

  getRetrievalHits(trace: AskTrace, source: "vector" | "web" | "pdf" | "autorag"): RetrievalHit[] {
    const retrieval = trace?.retrieval || {};
    const all =
      source === "vector"
        ? retrieval.vectorHits || []
        : source === "web"
        ? retrieval.webHits || []
        : source === "pdf"
        ? retrieval.pdfHits || []
        : retrieval.autoragHits || [];

    return this.searchMode === "filter" ? this.filterArrayBySearch(all) : all;
  }

  getTopScores(trace: AskTrace): { vector: number | null; web: number | null; pdf: number | null; autorag: number | null } {
    return {
      vector: this.pickTopScore(this.getRetrievalHits(trace, "vector")),
      web: this.pickTopScore(this.getRetrievalHits(trace, "web")),
      pdf: this.pickTopScore(this.getRetrievalHits(trace, "pdf")),
      autorag: this.pickTopScore(this.getRetrievalHits(trace, "autorag")),
    };
  }

  getCoverage(trace: AskTrace): number | null {
    const value =
      trace?.rerank?.coverage ??
      trace?.gate?.coverage ??
      trace?.logs?.find((event) => event?.scope === "rerank" && event?.name === "done")?.data?.coverage;
    return typeof value === "number" ? value : null;
  }

  getGateDecision(trace: AskTrace): string {
    const decision =
      trace?.gate?.decision ??
      trace?.gate?.raw?.decision ??
      trace?.logs?.find((event) => event?.scope === "gate" && event?.name === "done")?.data?.decision;
    return typeof decision === "string" && decision.trim() ? decision : "N/A";
  }

  getGateReason(trace: AskTrace): string {
    const reason = trace?.gate?.reason ?? trace?.logs?.find((event) => event?.scope === "gate" && event?.name === "done")?.data?.reason;
    return typeof reason === "string" && reason.trim() ? reason : "";
  }

  getContextSummary(trace: AskTrace): { selectedSource: string; used: number; ctxChars: number | null } {
    const selectedSource = String(
      trace?.context?.selectedSource ?? trace?.logs?.find((event) => event?.scope === "context" && event?.name === "final")?.data?.selectedSource ?? "N/A"
    );

    const usedValue =
      typeof trace?.context?.used === "number"
        ? trace.context.used
        : trace?.logs?.find((event) => event?.scope === "context" && event?.name === "final")?.data?.used;

    const ctxChars =
      typeof trace?.context?.ctxChars === "number"
        ? trace.context.ctxChars
        : trace?.logs?.find((event) => event?.scope === "context" && event?.name === "final")?.data?.ctxChars ?? null;

    return {
      selectedSource,
      used: typeof usedValue === "number" ? usedValue : this.getUsedChunks(trace) ?? 0,
      ctxChars: typeof ctxChars === "number" ? ctxChars : null,
    };
  }

  getLatencyLabel(trace: AskTrace): string {
    const total = this.getTiming(trace, "total_ms") ?? 0;
    if (total >= 24000) return "Slow";
    if (total >= 12000) return "Medium";
    return "Fast";
  }

  getLogs(trace: AskTrace): TraceEvent[] {
    const logs = Array.isArray(trace?.logs) ? trace.logs : [];
    const sorted = logs
      .slice()
      .sort((a, b) => Number(a?.ts || 0) - Number(b?.ts || 0) || String(a?.name || "").localeCompare(String(b?.name || "")));

    const filtered = this.searchMode === "filter" ? this.filterLogsBySearch(sorted) : sorted;
    if (!this.showOnlyErrors) return filtered;

    return filtered.filter((event) => {
      const level = String(event?.level || "").toLowerCase();
      return level === "error" || level === "warn";
    });
  }

  getScopedLogs(trace: AskTrace): TraceEvent[] {
    const logs = this.getLogs(trace);
    if (this.activeScope === "ALL") return logs;
    return logs.filter((event) => String(event?.scope || "") === this.activeScope);
  }

  getLogCounts(trace: AskTrace): { error: number; warn: number; scopes: number } {
    const logs = this.getLogs(trace);
    let error = 0;
    let warn = 0;
    const scopes = new Set<string>();

    logs.forEach((event) => {
      const level = String(event?.level || "").toLowerCase();
      if (level === "error") error += 1;
      if (level === "warn") warn += 1;
      if (event?.scope) scopes.add(String(event.scope));
    });

    return { error, warn, scopes: scopes.size };
  }

  getScopes(trace: AskTrace): string[] {
    const scopes = Array.from(new Set(this.getLogs(trace).map((event) => String(event?.scope || "")).filter(Boolean)));
    return scopes.sort();
  }

  getScopeCount(trace: AskTrace, scope: string): number {
    return this.getLogs(trace).filter((event) => String(event?.scope || "") === scope).length;
  }

  setScope(scope: string) {
    this.activeScope = scope || "ALL";
  }

  getLogBadgeClass(level: TracePrimitive) {
    const value = String(level || "").toLowerCase();
    if (value === "error") return "badge badge-error";
    if (value === "warn") return "badge badge-warn";
    if (value === "debug") return "badge badge-debug";
    return "badge badge-info";
  }

  getHealth(trace: AskTrace) {
    const total = this.getTiming(trace, "total_ms") ?? 0;
    const fallback = this.isFallbackFromTrace(trace);
    const hitCount =
      this.getRetrievalHits(trace, "vector").length +
      this.getRetrievalHits(trace, "web").length +
      this.getRetrievalHits(trace, "pdf").length +
      this.getRetrievalHits(trace, "autorag").length;
    const hasVector = this.getRetrievalHits(trace, "vector").length > 0;

    if (fallback) return { label: "fallback", cls: "pill pill-warn" };
    if (!hitCount) return { label: "no hits", cls: "pill pill-muted" };
    if (!hasVector && this.getTraceRoute(trace) === "RAG") return { label: "no vector", cls: "pill pill-muted" };
    if (total >= 24000) return { label: "slow", cls: "pill pill-warn" };
    return { label: "ok", cls: "pill pill-ok" };
  }

  getConversationCardSummary(item: ConversationItem): ConversationCardSummary {
    if (!item?.trace) {
      const fallback = this.isAnswerFallbackish(item?.answer);
      return {
        statusLabel: fallback ? "Limited" : item?.isAnswered === false ? "Needs review" : "Answered",
        statusCls: fallback ? "pill pill-warn" : item?.isAnswered === false ? "pill pill-muted" : "pill pill-ok",
        conciseRow: [fallback ? "Limited answer" : "Answer available", item?.tokenUsage ? `${item.tokenUsage} tokens` : "Trace available on demand"].filter(Boolean),
        actionLabel: this.isClientView ? "View details" : "Inspect trace",
      };
    }

    const summary = this.buildClientTraceSummary(item.trace);
    return {
      statusLabel: summary.outcome,
      statusCls: this.getClientOutcomeClass(summary),
      conciseRow: [
        summary.routeLabel,
        summary.totalMs != null ? `${summary.totalMs} ms` : "Timing unavailable",
        summary.sourceCount ? `${summary.sourceCount} sources` : "No supporting sources",
        summary.fallback ? "Fallback used" : `Confidence ${summary.confidenceLabel}`,
      ],
      actionLabel: this.isClientView ? "View details" : "Inspect trace",
    };
  }

  buildClientTraceSummary(trace: AskTrace): ClientTraceSummary {
    const routeLabel = this.getClientRouteLabel(trace);
    const routeDescription = this.getClientRouteDescription(trace);
    const totalMs = this.getTiming(trace, "total_ms");
    const fallback = this.isFallbackFromTrace(trace);
    const usedChunks = this.getUsedChunks(trace);
    const sourceCards = this.buildClientSourceCards(trace);
    const sourceCount = sourceCards.length;
    const confidenceLabel = this.getConfidenceLabel(trace, sourceCards);
    const sourceType = this.getClientSourceTypeLabel(trace, sourceCards);
    const outcome = this.getClientOutcomeLabel(trace, sourceCards);
    const outcomeTone = this.getClientOutcomeTone(trace, sourceCards);

    const metrics: ClientSummaryMetric[] = [
      { label: "Outcome", value: outcome, tone: outcomeTone },
      { label: "Handling", value: routeLabel, tone: "info", hint: routeDescription },
      { label: "Response time", value: totalMs != null ? `${totalMs} ms` : "Unavailable", tone: totalMs != null && totalMs > 15000 ? "warn" : "neutral" },
      { label: "Sources used", value: sourceCount ? `${sourceCount}` : "None", tone: sourceCount ? "good" : "warn" },
      { label: "Fallback", value: fallback ? "Yes" : "No", tone: fallback ? "warn" : "good" },
      { label: "Confidence", value: confidenceLabel, tone: confidenceLabel === "High" ? "good" : confidenceLabel === "Low" || confidenceLabel === "Limited" ? "warn" : "neutral" },
    ];

    const narrativeParts = [
      `${routeLabel}.`,
      totalMs != null ? `The system responded in ${totalMs} ms.` : "Response timing was not available.",
      sourceCount
        ? `It relied on ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}${sourceType !== "Mixed" ? ` from ${sourceType.toLowerCase()}` : ""}.`
        : "No supporting source evidence was captured for this answer.",
      fallback
        ? "A fallback path was used, so the answer should be reviewed before sharing broadly."
        : `Confidence appears ${confidenceLabel.toLowerCase()} based on the trace signals that were captured.`,
    ];

    return {
      outcome,
      outcomeTone,
      routeLabel,
      routeDescription,
      totalMs,
      sourceCount,
      sourceType,
      usedChunks,
      confidenceLabel,
      fallback,
      narrative: narrativeParts.join(" "),
      metrics,
      timeline: this.buildClientTimeline(trace),
      sources: sourceCards,
    };
  }

  getClientOutcomeClass(summary: ClientTraceSummary): string {
    if (summary.outcomeTone === "good") return "pill pill-ok";
    if (summary.outcomeTone === "warn") return "pill pill-warn";
    return "pill pill-muted";
  }

  getClientMetricToneClass(tone?: ClientSummaryMetric["tone"]): string {
    if (tone === "good") return "summary-card-good";
    if (tone === "warn") return "summary-card-warn";
    if (tone === "info") return "summary-card-info";
    return "summary-card-neutral";
  }

  getTimelineToneClass(status: ClientTimelineItem["status"]): string {
    if (status === "complete") return "timeline-step-complete";
    if (status === "partial") return "timeline-step-partial";
    return "timeline-step-skipped";
  }

  getScoreBucketClass(bucket: ScoreBucket): string {
    if (bucket === "High") return "source-score-high";
    if (bucket === "Medium") return "source-score-medium";
    return "source-score-low";
  }

  getPipeline(trace: AskTrace): PipelineStage[] {
    const logs = Array.isArray(trace?.logs) ? trace.logs : [];
    const total = this.getTiming(trace, "total_ms") ?? 0;

    const stageDefs: Array<{
      key: string;
      label: string;
      timingKeys?: string[];
      scope?: string;
      note?: (currentTrace: AskTrace) => string;
      data?: (currentTrace: AskTrace) => any;
    }> = [
      { key: "request", label: "Request", timingKeys: ["request"], scope: "steps", data: (currentTrace) => currentTrace.request },
      { key: "history", label: "History", timingKeys: ["history_ms", "history_load", "history_load_ms", "history"], scope: "history", data: (currentTrace) => currentTrace.history },
      {
        key: "preflight",
        label: "Preflight",
        timingKeys: ["preflight_ms", "preflight"],
        scope: "preflight",
        data: (currentTrace) => currentTrace.preflight,
        note: (currentTrace) => currentTrace?.preflight?.route ?? currentTrace?.logs?.find((event) => event?.name === "preflight_parsed:end")?.data?.route ?? "",
      },
      { key: "embed", label: "Embed", timingKeys: ["embed_message", "embed"], scope: "embed", data: (currentTrace) => currentTrace.embed },
      {
        key: "vector",
        label: "Vector",
        timingKeys: ["vector_ms", "vector"],
        scope: "vector",
        data: (currentTrace) => ({ ...currentTrace.vector, hits: currentTrace.retrieval?.vectorHits?.length || 0, top: this.getTopScores(currentTrace).vector }),
      },
      {
        key: "web",
        label: "Web",
        timingKeys: ["web_ms", "web"],
        scope: "web",
        data: (currentTrace) => ({ ...currentTrace.web, hits: currentTrace.retrieval?.webHits?.length || 0, top: this.getTopScores(currentTrace).web }),
      },
      {
        key: "pdf",
        label: "PDF",
        timingKeys: ["pdf_ms", "pdf"],
        scope: "pdf",
        data: (currentTrace) => ({ ...currentTrace.pdf, hits: currentTrace.retrieval?.pdfHits?.length || 0, top: this.getTopScores(currentTrace).pdf }),
      },
      {
        key: "answer",
        label: "Answer",
        timingKeys: ["answer_ms", "answer", "smalltalk_answer"],
        scope: "answer",
        data: (currentTrace) => currentTrace.answer,
        note: (currentTrace) => (this.isFallbackFromTrace(currentTrace) ? "fallback" : ""),
      },
      { key: "fusion", label: "Fusion", scope: "fusion", data: (currentTrace) => currentTrace.fusion },
      {
        key: "rerank",
        label: "Rerank",
        scope: "rerank",
        note: (currentTrace) => (this.getCoverage(currentTrace) != null ? `coverage ${this.getCoverage(currentTrace)}%` : ""),
        data: (currentTrace) => currentTrace.rerank,
      },
      { key: "gate", label: "Gate", scope: "gate", note: (currentTrace) => this.getGateDecision(currentTrace), data: (currentTrace) => currentTrace.gate },
      { key: "context", label: "Context", scope: "context", note: (currentTrace) => `${this.getContextSummary(currentTrace).used} used`, data: (currentTrace) => currentTrace.context },
    ];

    const spansByScope = this.computeScopeSpans(logs);

    const stages = stageDefs
      .map((stageDef) => {
        const timingValue = this.pickTimingAny(trace, stageDef.timingKeys);
        const scopeValue = stageDef.scope ? spansByScope[stageDef.scope]?.ms ?? null : null;
        const ms = typeof timingValue === "number" ? timingValue : typeof scopeValue === "number" ? scopeValue : 0;
        const pct = total ? Math.max(0, Math.min(100, Math.round((ms / total) * 100))) : 0;
        const data = stageDef.data ? stageDef.data(trace) : this.pickScopeLogs(logs, stageDef.scope);
        const note = stageDef.note ? stageDef.note(trace) : "";
        const badge = this.stageBadge(trace, stageDef.key);

        return {
          key: stageDef.key,
          label: stageDef.label,
          ms,
          pct,
          badgeLabel: badge.label,
          badgeCls: badge.cls,
          note,
          data,
        };
      })
      .filter((stage) => stage.ms > 0 || ["fusion", "rerank", "gate", "context"].includes(stage.key));

    return this.searchMode === "filter" ? stages.filter((stage) => this.stageMatchesSearch(stage)) : stages;
  }

  formatTs(ts: any): string {
    const value = typeof ts === "number" ? ts : Number(ts);
    if (!Number.isFinite(value)) return "";
    const date = new Date(value);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  toFixed(value: any, decimals: number): string {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return "";
    return parsed.toFixed(decimals);
  }

  filterJson(obj: any): string {
    const stringified = JSON.stringify(obj ?? {}, null, 2);
    const query = (this.traceSearch || "").trim().toLowerCase();
    if (!query) return stringified;
    if (this.searchMode === "filter") return stringified.toLowerCase().includes(query) ? stringified : "[filtered out]";
    return this.highlightText(stringified, query);
  }

  filterText(text: any): string {
    const stringified = String(text ?? "");
    const query = (this.traceSearch || "").trim().toLowerCase();
    if (!query) return stringified;
    if (this.searchMode === "filter") return stringified.toLowerCase().includes(query) ? stringified : "[filtered out]";
    return this.highlightText(stringified, query);
  }

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
      questionLines.forEach((line: string) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage();
          y = 10;
        }
        doc.text(line, 10, y);
        y += lineHeight;
      });

      doc.setFont("Helvetica", "normal");
      const answerLines = doc.splitTextToSize(answerText, 180);
      answerLines.forEach((line: string) => {
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

  private parseTrace(input: any): AskTrace | null {
    if (!input) return null;

    if (typeof input === "object") {
      const trace = input as AskTrace;
      if (trace?.trace && typeof trace.trace === "object") return trace.trace as AskTrace;
      return trace;
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

  private pickTopScore(hits: RetrievalHit[]): number | null {
    const numericScores = (hits || [])
      .map((hit) => (typeof hit?.score === "number" ? hit.score : typeof hit?.rawScore === "number" ? hit.rawScore : null))
      .filter((value): value is number => typeof value === "number");
    return numericScores.length ? Math.max(...numericScores) : null;
  }

  private buildClientSourceCards(trace: AskTrace): ClientSourceCard[] {
    const chosenIds = new Set(this.collectChosenSourceKeys(trace));
    const contextSummary = this.getContextSummary(trace);
    const hits = [
      ...this.getRetrievalHits(trace, "vector").map((hit) => ({ ...hit, __sourceType: "Knowledge base" })),
      ...this.getRetrievalHits(trace, "web").map((hit) => ({ ...hit, __sourceType: "Web" })),
      ...this.getRetrievalHits(trace, "pdf").map((hit) => ({ ...hit, __sourceType: "Document" })),
      ...this.getRetrievalHits(trace, "autorag").map((hit) => ({ ...hit, __sourceType: "AutoRAG" })),
    ];

    const normalized = hits.map((hit, index) => {
      const id = String(hit?.id ?? hit?.url ?? hit?.title ?? `source-${index}`);
      const title = String(hit?.title || hit?.sourceName || hit?.source || `${hit.__sourceType} source ${index + 1}`);
      const scoreValue = typeof hit?.score === "number" ? hit.score : typeof hit?.rawScore === "number" ? hit.rawScore : null;
      const usedInAnswer = Boolean(hit?.used || hit?.selected || chosenIds.has(id) || chosenIds.has(String(hit?.url || "")) || chosenIds.has(String(hit?.title || "")));
      const excerpt = this.trimText(String(hit?.excerpt || hit?.text || "No excerpt available."), 180);

      return {
        id,
        title,
        sourceName: String(hit?.sourceName || hit?.source || hit?.__sourceType || "Source"),
        sourceType: String(hit?.__sourceType || hit?.sourceType || hit?.type || contextSummary.selectedSource || "Source"),
        section: hit?.section ? String(hit.section) : null,
        excerpt,
        scoreBucket: this.toScoreBucket(scoreValue),
        scoreValue,
        usedInAnswer,
        url: typeof hit?.url === "string" ? hit.url : undefined,
      };
    });

    const prioritized = normalized
      .sort((a, b) => Number(b.usedInAnswer) - Number(a.usedInAnswer) || (b.scoreValue ?? -1) - (a.scoreValue ?? -1))
      .filter((card, index, array) => array.findIndex((item) => item.id === card.id) === index);

    const usedOnly = prioritized.filter((card) => card.usedInAnswer);
    if (usedOnly.length) return usedOnly.slice(0, 8);
    return prioritized.slice(0, Math.max(usedOnly.length, contextSummary.used || 4, 4));
  }

  private buildClientTimeline(trace: AskTrace): ClientTimelineItem[] {
    const spans = this.computeScopeSpans(this.getLogs(trace));
    const routeLabel = this.getClientRouteLabel(trace);
    const sourceCards = this.buildClientSourceCards(trace);
    const sourceCount = sourceCards.length;
    const usedChunks = this.getUsedChunks(trace);

    const stages: ClientTimelineItem[] = [
      {
        key: "request",
        label: "Request received",
        description: "The message was accepted and prepared for processing.",
        durationMs: this.pickTimingAny(trace, ["request"]),
        status: "complete",
      },
      {
        key: "preflight",
        label: "Intent classified",
        description: `Handling path selected: ${routeLabel}.`,
        durationMs: this.pickTimingAny(trace, ["preflight_ms", "preflight"]) ?? spans.preflight?.ms ?? null,
        status: "complete",
      },
      {
        key: "retrieval",
        label: "Retrieval completed",
        description: sourceCount
          ? `${sourceCount} candidate ${sourceCount === 1 ? "source was" : "sources were"} gathered for consideration.`
          : "No supporting sources were gathered for this run.",
        durationMs: this.sumNumbers([
          this.pickTimingAny(trace, ["vector_ms", "vector"]),
          this.pickTimingAny(trace, ["web_ms", "web"]),
          this.pickTimingAny(trace, ["pdf_ms", "pdf"]),
        ]),
        status: sourceCount ? "complete" : "partial",
      },
      {
        key: "context",
        label: "Context selected",
        description: usedChunks ? `${usedChunks} source chunk${usedChunks === 1 ? "" : "s"} were selected for the final answer.` : "The system chose the best available context for response generation.",
        durationMs: this.sumNumbers([
          spans.rerank?.ms,
          spans.fusion?.ms,
          spans.gate?.ms,
          spans.context?.ms,
        ]),
        status: usedChunks || sourceCount ? "complete" : "partial",
      },
      {
        key: "answer",
        label: "Answer generated",
        description: this.isFallbackFromTrace(trace)
          ? "A fallback response path was used during generation."
          : "The assistant generated the final answer.",
        durationMs: this.pickTimingAny(trace, ["answer_ms", "answer", "smalltalk_answer"]) ?? spans.answer?.ms ?? null,
        status: "complete",
      },
      {
        key: "final",
        label: "Final response sent",
        description: "The response was returned to the user interface.",
        durationMs: this.getTiming(trace, "total_ms"),
        status: "complete",
      },
    ];

    return stages;
  }

  private getConfidenceLabel(trace: AskTrace, sources: ClientSourceCard[]): ConfidenceLabel {
    if (this.isFallbackFromTrace(trace)) return "Limited";
    const topScore = Math.max(this.getTopScores(trace).vector ?? 0, this.getTopScores(trace).web ?? 0, this.getTopScores(trace).pdf ?? 0, this.getTopScores(trace).autorag ?? 0);
    const usedCount = this.getUsedChunks(trace) ?? sources.filter((source) => source.usedInAnswer).length;

    if (topScore >= 75 || usedCount >= 4) return "High";
    if (topScore >= 45 || usedCount >= 2) return "Medium";
    if (sources.length) return "Low";
    return "Limited";
  }

  private getClientSourceTypeLabel(trace: AskTrace, sources: ClientSourceCard[]): string {
    const selectedSource = this.getContextSummary(trace).selectedSource;
    if (selectedSource && selectedSource !== "N/A") return this.routeLabelFromKey(selectedSource);

    const types = Array.from(new Set(sources.map((source) => source.sourceType).filter(Boolean)));
    if (!types.length) return "None";
    if (types.length === 1) return types[0];
    return "Mixed";
  }

  private getClientOutcomeLabel(trace: AskTrace, sources: ClientSourceCard[]): string {
    if (this.isFallbackFromTrace(trace)) return "Fallback response";
    if (!sources.length && this.getTraceRoute(trace) === "RAG") return "Limited evidence";
    if (this.getTraceRoute(trace) === "NEEDS_CLARIFICATION") return "Clarification requested";
    return "Answered successfully";
  }

  private getClientOutcomeTone(trace: AskTrace, sources: ClientSourceCard[]): ClientTraceSummary["outcomeTone"] {
    if (this.isFallbackFromTrace(trace)) return "warn";
    if (!sources.length && this.getTraceRoute(trace) === "RAG") return "neutral";
    return "good";
  }

  private routeLabelFromKey(value: string): string {
    const key = String(value || "").toUpperCase();
    const map: Record<string, string> = {
      RAG: "Knowledge-backed answer",
      SMALL_TALK: "Direct answer",
      NEEDS_CLARIFICATION: "Clarification flow",
      LANGUAGE_MISMATCH: "Language handling",
      SEARCH_ONLY: "Search-first response",
      WEB_ONLY: "Web-assisted answer",
      VECTOR: "Knowledge base",
      WEB: "Web",
      PDF: "Document",
      AUTORAG: "AutoRAG",
    };
    return map[key] || this.toTitleCase(String(value || "standard processing").replace(/[_-]+/g, " "));
  }

  private collectChosenSourceKeys(trace: AskTrace): string[] {
    const candidates = this.asArray<any>(trace?.fusion?.chosen).concat(this.asArray<any>(trace?.context?.selected));
    const keys = candidates.flatMap((item) => [item?.id, item?.url, item?.title, item?.sourceId]).filter(Boolean).map((value) => String(value));
    return keys;
  }

  private toScoreBucket(score: number | null): ScoreBucket {
    if (score == null) return "Low";
    if (score >= 75 || score >= 0.75) return "High";
    if (score >= 45 || score >= 0.45) return "Medium";
    return "Low";
  }

  private pickTimingAny(trace: AskTrace, keys?: string[]): number | null {
    if (!keys?.length) return null;
    for (const key of keys) {
      const value = this.getTiming(trace, key);
      if (typeof value === "number" && value >= 0) return value;
    }
    return null;
  }

  private stageMatchesSearch(stage: PipelineStage): boolean {
    const query = (this.traceSearch || "").trim().toLowerCase();
    if (!query) return true;
    return `${stage.key} ${stage.label} ${stage.note} ${JSON.stringify(stage.data ?? {})}`.toLowerCase().includes(query);
  }

  private stageBadge(trace: AskTrace, key: string): { label: string; cls: string } {
    const decision = this.getGateDecision(trace);
    const totals = {
      vector: this.getRetrievalHits(trace, "vector").length,
      web: this.getRetrievalHits(trace, "web").length,
      pdf: this.getRetrievalHits(trace, "pdf").length,
    };

    if (key === "vector") {
      if (!totals.vector) return { label: "MISS", cls: "badge-muted" };
      return (this.getTopScores(trace).vector ?? 0) >= 60 ? { label: "OK", cls: "badge-ok" } : { label: "LOW", cls: "badge-warn2" };
    }
    if (key === "web") {
      if (!totals.web) return { label: "MISS", cls: "badge-muted" };
      return { label: "OK", cls: "badge-info2" };
    }
    if (key === "pdf") {
      if (!totals.pdf) return { label: "MISS", cls: "badge-muted" };
      return { label: "OK", cls: "badge-ok" };
    }
    if (key === "gate") {
      if (decision === "YES") return { label: "PASS", cls: "badge-ok" };
      if (decision === "NO") return { label: "BLOCK", cls: "badge-error2" };
      return { label: "N/A", cls: "badge-muted" };
    }
    if (key === "answer") {
      return this.isFallbackFromTrace(trace) ? { label: "FALLBACK", cls: "badge-warn2" } : { label: "OK", cls: "badge-ok" };
    }
    if (key === "preflight") {
      const route = this.getTraceRoute(trace);
      if (route === "LANGUAGE_MISMATCH") return { label: "LANG", cls: "badge-warn2" };
      if (route === "NEEDS_CLARIFICATION") return { label: "CLARIFY", cls: "badge-info2" };
      if (route === "SMALL_TALK") return { label: "CHAT", cls: "badge-ok" };
      return { label: "OK", cls: "badge-ok" };
    }
    return { label: "OK", cls: "badge-info2" };
  }

  private computeScopeSpans(logs: TraceEvent[]): Record<string, { start: number; end: number; ms: number }> {
    const scopes: Record<string, { start: number; end: number }> = {};
    (logs || []).forEach((event) => {
      const scope = String(event?.scope || "");
      const ts = typeof event?.ts === "number" ? event.ts : null;
      if (!scope || ts == null) return;
      if (!scopes[scope]) scopes[scope] = { start: ts, end: ts };
      scopes[scope].start = Math.min(scopes[scope].start, ts);
      scopes[scope].end = Math.max(scopes[scope].end, ts);
    });

    return Object.keys(scopes).reduce((acc, key) => {
      acc[key] = { ...scopes[key], ms: Math.max(0, scopes[key].end - scopes[key].start) };
      return acc;
    }, {} as Record<string, { start: number; end: number; ms: number }>);
  }

  private pickScopeLogs(logs: TraceEvent[], scope?: string): any {
    if (!scope) return null;
    const rows = (logs || []).filter((event) => String(event?.scope || "") === scope);
    if (!rows.length) return null;
    return rows.map((event) => ({ ts: event.ts, level: event.level, name: event.name, data: event.data }));
  }

  private highlightText(value: string, query: string): string {
    if (!query) return value;
    const index = value.toLowerCase().indexOf(query);
    if (index < 0) return value;
    return `${value.slice(0, index)}⟦${value.slice(index, index + query.length)}⟧${value.slice(index + query.length)}`;
  }

  private filterArrayBySearch(arr: RetrievalHit[]): RetrievalHit[] {
    const query = (this.traceSearch || "").trim().toLowerCase();
    if (!query) return arr;

    return (arr || []).filter((hit) => {
      const blob = `${hit?.id ?? hit?.sourceId ?? ""} ${hit?.sourceType ?? hit?.type ?? ""} ${hit?.title ?? ""} ${hit?.section ?? ""} ${hit?.url ?? ""} ${hit?.text ?? ""}`;
      return blob.toLowerCase().includes(query);
    });
  }

  private filterLogsBySearch(arr: TraceEvent[]): TraceEvent[] {
    const query = (this.traceSearch || "").trim().toLowerCase();
    if (!query) return arr;

    return (arr || []).filter((event) => {
      const blob = `${event?.level ?? ""} ${event?.scope ?? ""} ${event?.name ?? ""} ${JSON.stringify(event?.data ?? {})}`;
      return blob.toLowerCase().includes(query);
    });
  }

  private isAnswerFallbackish(answer: string): boolean {
    const value = String(answer || "").toLowerCase().trim();
    return !value || value.includes("i don't have enough information") || value.includes("i don’t have enough information") || value === "fallback";
  }

  private trimText(value: string, limit: number): string {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trim()}...`;
  }

  private toTitleCase(value: string): string {
    return String(value || "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  private sumNumbers(values: Array<number | null | undefined>): number | null {
    const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (!filtered.length) return null;
    return filtered.reduce((sum, value) => sum + value, 0);
  }

  private asArray<T>(value: any): T[] {
    return Array.isArray(value) ? value : [];
  }

  private pct(part: number, total: number): number {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
  }

  get kpiAnsweredPct(): number {
    return this.pct(this.kpiAnswered, this.kpiTotalMessages);
  }

  get kpiNotAnsweredPct(): number {
    return this.pct(this.kpiNotAnswered, this.kpiTotalMessages);
  }
}
