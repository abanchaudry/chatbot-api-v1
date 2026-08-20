import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { animate, style, transition, trigger } from "@angular/animations";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { environment } from "src/environments/environment";

type ChatLang = "english" | "spanish";
type StreamPhase = "idle" | "connecting" | "streaming";
type StreamEventName = "meta" | "token" | "done" | "error" | "message";

import { Router } from "@angular/router";

export type CitedSource = {
  section: string;
  topic?: string;
  fileName?: string;
  score?: number | null;
  snippet?: string;
  dataset?: "admin" | "pdf" | "web" | string;
  isWeb?: boolean;
  url?: string;
};

type ChatMsg = {
  id: string;
  sender: "bot" | "user";
  text: string;
  html: SafeHtml;
  createdAt: number | null;
  sources?: CitedSource[];
};

type QuickPrompt = {
  label: string;
  text: string;
};

type ThreadHistoryItem = {
  id: number;
  thread_id: string;
  user_id: string;
  question: string;
  answer: string;
  context: string;
  token_usage: string;
  is_answered: number;
  created_at: string;
};

type ChatTimelineItem =
  | { type: "divider"; key: string; label: string }
  | { type: "message"; key: string; message: ChatMsg };

@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrls: ["./footer.component.scss"],
  animations: [
    trigger("chatPopupAnimation", [
      transition(":enter", [
        style({
          opacity: 0,
          transform: "translateY(14px) scale(0.985)",
        }),
        animate(
          "220ms ease-out",
          style({
            opacity: 1,
            transform: "translateY(0) scale(1)",
          })
        ),
      ]),
      transition(":leave", [
        animate(
          "170ms ease-in",
          style({
            opacity: 0,
            transform: "translateY(8px) scale(0.985)",
          })
        ),
      ]),
    ]),
  ],
})
export class FooterComponent implements OnInit, OnDestroy {
  @ViewChild("chatBody") chatBody?: ElementRef<HTMLDivElement>;
  @ViewChild("chatInput") chatInput?: ElementRef<HTMLTextAreaElement>;

  appName = environment.appName;
  isChatOpen = false;
  isTyping = false;
  isHistoryLoading = false;

  readonly quickPrompts: QuickPrompt[] = [
    { label: "Mission", text: "What is the mission statement?" },
    { label: "Vision", text: "What is the vision statement?" },
    { label: "Gate Access", text: "How do I get gate access?" },
    { label: "Office Address", text: "What is the office address?" },
  ];

  private readonly TENANT = environment.tenant || "default";
  private readonly THREAD_KEY = `${this.TENANT}_threadid`;
  private readonly USER_KEY = `${this.TENANT}_userthId`;
  private readonly LANG_KEY = `${this.TENANT}_chat_lang`;

  messages: ChatMsg[] = [];
  chatTimeline: ChatTimelineItem[] = [];

  userId = "";
  threadId: string | null = null;
  newMessage = "";
  chatLanguage: ChatLang = "english";

  activeSourceSnippet: CitedSource | null = null;

  openSourceSnippetModal(source: CitedSource): void {
    this.activeSourceSnippet = source;
  }

  closeSourceSnippetModal(): void {
    this.activeSourceSnippet = null;
  }

  activeStreamMessageIndex: number | null = null;
  activeStreamMessageId: string | null = null;
  streamPhase: StreamPhase = "idle";

  private pendingRender = false;
  private pendingScroll = false;
  private destroyed = false;
  private streamEnded = false;
  private activeAbortController: AbortController | null = null;
  private hasLoadedHistory = false;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  navigateToAiKnowledge(): void {
    this.router.navigate(["/dashboard/ai-knowledge/all-ai-knowledge"]);
  }

  navigateToSource(src: any): void {
    const queryParams: any = {};
    if (src?.fileName) {
      queryParams.highlightFile = src.fileName;
    }
    if (src?.fileId) {
      queryParams.fileId = src.fileId;
    }
    if (src?.dataset) {
      queryParams.dataset = src.dataset;
    }
    this.router.navigate(["/dashboard/ai-knowledge/all-ai-knowledge"], { queryParams });
  }

  ngOnInit(): void {
    this.userId = this.getSessionId();
    this.threadId = this.getStoredThreadId();
    this.loadStoredLanguage();
    this.resetMessages(false);
    this.rebuildTimeline();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.activeAbortController?.abort();
  }

  get appInitial(): string {
    return (this.appName || "A").trim().charAt(0).toUpperCase() || "A";
  }

  get hasConversationMessages(): boolean {
    return this.messages.length > 0;
  }

  get canSend(): boolean {
    return !!this.newMessage.trim() && !this.isTyping;
  }

  get showQuickPrompts(): boolean {
    return !this.hasConversationMessages && !this.isTyping && !this.isHistoryLoading;
  }

  trackByTimeline(index: number, item: ChatTimelineItem): string {
    return item.key;
  }

  isStreamingById(messageId: string): boolean {
    return this.activeStreamMessageId === messageId && this.streamPhase === "streaming";
  }

  isConnectingById(messageId: string): boolean {
    return this.activeStreamMessageId === messageId && this.streamPhase === "connecting";
  }

  async toggleChat(): Promise<void> {
    this.isChatOpen = !this.isChatOpen;
    this.scheduleRender();

    if (this.isChatOpen) {
      await this.loadThreadHistoryIfNeeded();
      this.scheduleScroll(true);
      this.focusInputSoon();

      this.ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => this.autoResizeTextarea());
      });
    }
  }

  clearChat(): void {
    this.activeAbortController?.abort();
    this.activeAbortController = null;
    this.isTyping = false;
    this.isHistoryLoading = false;
    this.activeStreamMessageIndex = null;
    this.activeStreamMessageId = null;
    this.streamPhase = "idle";
    this.threadId = null;
    this.streamEnded = false;
    this.newMessage = "";
    this.hasLoadedHistory = false;

    localStorage.removeItem(this.THREAD_KEY);

    this.resetMessages(false);
    this.rebuildTimeline();
    this.scheduleRender();
    this.scheduleScroll(true);
    this.focusInputSoon();

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.autoResizeTextarea(true));
    });
  }

  useQuickPrompt(prompt: QuickPrompt): void {
    if (this.isTyping) return;

    this.newMessage = prompt.text;
    this.scheduleRender();
    this.focusInputSoon();

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.autoResizeTextarea());
    });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void this.sendMessage();
  }

  autoResizeTextarea(reset = false): void {
    const el = this.chatInput?.nativeElement;
    if (!el) return;

    el.style.height = "auto";

    if (reset) {
      el.style.height = "52px";
      return;
    }

    const next = Math.min(el.scrollHeight, 140);
    el.style.height = `${Math.max(next, 52)}px`;
  }

  async sendMessage(): Promise<void> {
    const trimmedMessage = this.newMessage.trim();
    if (!trimmedMessage || this.isTyping) return;

    const userMsg: ChatMsg = {
      id: this.createId(),
      sender: "user",
      text: trimmedMessage,
      html: this.toSafeHtml(trimmedMessage),
      createdAt: Date.now(),
    };

    this.messages.push(userMsg);
    this.rebuildTimeline();

    this.newMessage = "";
    this.autoResizeTextarea(true);
    this.scheduleRender();
    this.scheduleScroll(true);

    this.isTyping = true;
    this.streamEnded = false;
    this.streamPhase = "connecting";

    const botMsg: ChatMsg = {
      id: this.createId(),
      sender: "bot",
      text: "",
      html: this.toSafeHtml(""),
      createdAt: null,
    };

    this.messages.push(botMsg);
    this.activeStreamMessageIndex = this.messages.length - 1;
    this.activeStreamMessageId = botMsg.id;
    this.rebuildTimeline();
    this.scheduleRender();
    this.scheduleScroll(true);

    try {
      await this.getBotResponseStream(trimmedMessage, botMsg);

      if (!this.streamEnded) {
        throw new Error("Stream ended before done event");
      }

      if (!botMsg.text.trim()) {
        throw new Error("Empty stream response");
      }
    } catch {
      if (botMsg.createdAt === null) {
        botMsg.createdAt = Date.now();
      }

      botMsg.text = botMsg.text?.trim()
        ? botMsg.text + "\n\nConnection interrupted before the response completed. Please try again."
        : "I’m having trouble connecting right now. Please try again in a moment.";

      botMsg.html = this.toSafeHtml(botMsg.text);
      this.rebuildTimeline();
      this.scheduleRender();
      this.scheduleScroll(true);
    } finally {
      this.isTyping = false;
      this.activeStreamMessageIndex = null;
      this.activeStreamMessageId = null;
      this.streamPhase = "idle";
      this.activeAbortController = null;
      this.scheduleRender();
      this.scheduleScroll(true);
      this.focusInputSoon();
    }
  }

  private async loadThreadHistoryIfNeeded(): Promise<void> {
    if (!this.threadId || this.hasLoadedHistory || this.isHistoryLoading) return;

    this.isHistoryLoading = true;
    this.scheduleRender();

    try {
      const historyBase = (environment.api_url || environment.api_url || "").replace(/\/+$/, "");
      const url = `${historyBase}/thread/detail/${encodeURIComponent(this.threadId)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load thread history");
      }

      const json = await response.json().catch(() => null);
      const rows: ThreadHistoryItem[] = Array.isArray(json?.data) ? json.data : [];

      if (rows.length) {
        this.messages = this.mapThreadHistoryToMessages(rows);
      } else {
        this.resetMessages(false);
      }

      this.rebuildTimeline();
      this.hasLoadedHistory = true;
    } catch {
      if (!this.messages.length) {
        this.resetMessages(false);
        this.rebuildTimeline();
      }
    } finally {
      this.isHistoryLoading = false;
      this.scheduleRender();
      this.scheduleScroll(true);
    }
  }

  private mapThreadHistoryToMessages(rows: ThreadHistoryItem[]): ChatMsg[] {
    const sorted = [...rows].sort((a, b) => {
      return this.parseServerDate(a.created_at) - this.parseServerDate(b.created_at);
    });

    const mapped: ChatMsg[] = [];

    for (const row of sorted) {
      const createdAt = this.parseServerDate(row.created_at);

      if (row.question?.trim()) {
        mapped.push({
          id: `history-q-${row.id}`,
          sender: "user",
          text: row.question,
          html: this.toSafeHtml(row.question),
          createdAt,
        });
      }

      if (row.answer?.trim()) {
        mapped.push({
          id: `history-a-${row.id}`,
          sender: "bot",
          text: row.answer,
          html: this.toSafeHtml(row.answer),
          createdAt,
        });
      }
    }

    return mapped;
  }

  private rebuildTimeline(): void {
    const timeline: ChatTimelineItem[] = [];
    let previousGroupLabel = "";

    for (const message of this.messages) {
      const label = this.getDateGroupLabel(message.createdAt);

      if (label !== previousGroupLabel) {
        timeline.push({
          type: "divider",
          key: `divider-${label}-${message.id}`,
          label,
        });
        previousGroupLabel = label;
      }

      timeline.push({
        type: "message",
        key: `message-${message.id}`,
        message,
      });
    }

    this.chatTimeline = timeline;
  }

  private getDateGroupLabel(timestamp: number | null): string {
    if (timestamp === null) return "Today";

    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameCalendarDay(date, today)) return "Today";
    if (this.isSameCalendarDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  private isSameCalendarDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private parseServerDate(value: string): number {
    if (!value) return Date.now();
    const normalized = value.replace(" ", "T");
    const parsed = new Date(normalized).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  private async getBotResponseStream(userMessage: string, botMsg: ChatMsg): Promise<void> {
    const base = (environment.api_url || "").replace(/\/+$/, "");
    const streamUrl = `${base}/ask/stream`;

    const payload: Record<string, unknown> = {
      userId: this.userId,
      message: userMessage,
      language: this.chatLanguage,
    };

    if (this.threadId) {
      payload.threadId = this.threadId;
    }

    this.activeAbortController?.abort();
    this.activeAbortController = new AbortController();

    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
      signal: this.activeAbortController.signal,
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || err?.message || "Streaming request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (!this.destroyed) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/g);
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        if (!block.trim()) continue;
        this.processSSEBlock(block, botMsg);

        if (this.streamEnded) {
          try {
            await reader.cancel();
          } catch {}
          return;
        }
      }
    }

    buffer += decoder.decode();
    const finalRemainder = buffer.trim();

    if (finalRemainder) {
      this.processSSEBlock(finalRemainder, botMsg);
    }

    if (!this.streamEnded && !this.destroyed) {
      throw new Error("Stream closed before done event");
    }
  }

  private processSSEBlock(block: string, botMsg: ChatMsg): void {
    const lines = block.split(/\r?\n/g);
    let eventName: StreamEventName = "message";
    const dataLines: string[] = [];

    for (const rawLine of lines) {
      if (!rawLine) continue;
      if (rawLine.startsWith(":")) continue;

      if (rawLine.startsWith("event:")) {
        eventName = (rawLine.slice(6).trim() as StreamEventName) || "message";
        continue;
      }

      if (rawLine.startsWith("data:")) {
        let value = rawLine.slice(5);
        if (value.startsWith(" ")) value = value.slice(1);
        dataLines.push(value);
      }
    }

    if (!dataLines.length) return;

    const rawData = dataLines.join("\n");
    let data: any = rawData;

    try {
      data = JSON.parse(rawData);
    } catch {
      data = rawData;
    }

    switch (eventName) {
      case "meta":
        if (data?.threadId) {
          this.threadId = data.threadId;
          localStorage.setItem(this.THREAD_KEY, this.threadId);
          this.hasLoadedHistory = true;
        }
        break;

      case "token":
      case "message": {
        const chunk = this.extractStreamChunk(data);
        if (!chunk) break;

        if (botMsg.createdAt === null) {
          botMsg.createdAt = Date.now();
        }

        if (this.streamPhase === "connecting") {
          this.streamPhase = "streaming";
        }

        botMsg.text += chunk;
        botMsg.html = this.toSafeHtml(botMsg.text);
        this.rebuildTimeline();
        this.scheduleBotMessageUpdate();
        break;
      }

      case "done":
        if (data?.threadId) {
          this.threadId = data.threadId;
          localStorage.setItem(this.THREAD_KEY, this.threadId);
          this.hasLoadedHistory = true;
        }

        if (botMsg.createdAt === null) {
          botMsg.createdAt = Date.now();
        }

        if (Array.isArray(data?.sources) && data.sources.length > 0) {
          botMsg.sources = data.sources;
        }

        if (!botMsg.text && typeof data?.answer === "string" && data.answer.trim()) {
          botMsg.text = data.answer;
          botMsg.html = this.toSafeHtml(botMsg.text);
        }

        this.rebuildTimeline();
        this.scheduleRender();
        this.streamEnded = true;
        break;

      case "error":
        if (botMsg.createdAt === null) {
          botMsg.createdAt = Date.now();
        }
        this.streamEnded = true;
        throw new Error(data?.message || "Stream error");
    }
  }

  private extractStreamChunk(data: any): string {
    if (typeof data === "string") return data;
    if (!data || typeof data !== "object") return "";
    if (typeof data.chunk === "string") return data.chunk;
    if (typeof data.token === "string") return data.token;
    if (typeof data.text === "string") return data.text;
    if (typeof data.answer === "string") return data.answer;
    if (typeof data.message === "string") return data.message;
    return "";
  }

  private scheduleBotMessageUpdate(): void {
    if (this.pendingRender || this.destroyed) return;
    this.pendingRender = true;

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        if (this.destroyed) {
          this.pendingRender = false;
          return;
        }

        this.ngZone.run(() => {
          this.pendingRender = false;
          this.cdr.detectChanges();
          this.scheduleScroll(false);
        });
      });
    });
  }

  private scheduleRender(): void {
    if (this.destroyed) return;
    this.cdr.detectChanges();
  }

  private scheduleScroll(force: boolean): void {
    if (this.pendingScroll || this.destroyed) return;
    this.pendingScroll = true;

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        if (this.destroyed) {
          this.pendingScroll = false;
          return;
        }

        this.pendingScroll = false;
        this.scrollToBottom(force);
      });
    });
  }

  private focusInputSoon(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.chatInput?.nativeElement?.focus();
      });
    });
  }

  private shouldStickToBottom(): boolean {
    const el = this.chatBody?.nativeElement;
    if (!el) return true;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom < 120;
  }

  private scrollToBottom(force = false): void {
    const el = this.chatBody?.nativeElement;
    if (!el) return;
    if (!force && !this.shouldStickToBottom()) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: force ? "smooth" : "auto",
    });
  }

  private resetMessages(withGreeting = false): void {
    this.messages = withGreeting ? this.buildGreetingMessages() : [];
  }

  private buildGreetingMessages(): ChatMsg[] {
    const greet = `Hi there! I’m ${environment.appName}. How can I help you today?`;

    return [
      {
        id: this.createId(),
        sender: "bot",
        text: greet,
        html: this.toSafeHtml(greet),
        createdAt: Date.now(),
      },
    ];
  }

  private toSafeHtml(text: string): SafeHtml {
    const html = this.renderLinksAndBreaks(text || "");
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private escapeHtml(value: string): string {
    return (value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private buildAnchorTag(href: string, label: string): string {
    const safeHref = this.escapeHtml(href);
    const attrs = /^https?:\/\//i.test(href)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";

    return `<a href="${safeHref}"${attrs}>${label}</a>`;
  }

  private normalizePhoneHref(value: string): string | null {
    const trimmed = String(value || "").trim();
    const digits = trimmed.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 15) {
      return null;
    }

    const prefix = trimmed.startsWith("+") ? "+" : "";
    return `tel:${prefix}${digits}`;
  }

  private renderLinksAndBreaks(input: string): string {
    let value = this.escapeHtml(input);

    value = value.replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^\s)]+)\)/gi,
      (_match, label, url) => this.buildAnchorTag(url, label)
    );

    value = value.replace(
      /(^|[\s(])((https?:\/\/)[^\s<]+)(?=$|[\s).,;!?\]])/g,
      (_match, lead, url) =>
        `${lead}${this.buildAnchorTag(url, url)}`
    );

    value = value.replace(
      /(^|[\s>(])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?=$|[\s<),;!?\]])/gi,
      (_match, lead, email) =>
        `${lead}${this.buildAnchorTag(`mailto:${email}`, email)}`
    );

    value = value.replace(
      /(^|[\s>(])(\+?\d[\d\s().-]{7,}\d)(?=$|[\s<),;!?\]])/g,
      (_match, lead, phone) => {
        const href = this.normalizePhoneHref(phone);
        if (!href) {
          return `${lead}${phone}`;
        }

        return `${lead}${this.buildAnchorTag(href, phone)}`;
      }
    );

    return value.replace(/\n/g, "<br>");
  }

  private loadStoredLanguage(): void {
    const saved = localStorage.getItem(this.LANG_KEY);
    if (saved === "english" || saved === "spanish") {
      this.chatLanguage = saved;
    }
  }

  private getSessionId(): string {
    const existing = localStorage.getItem(this.USER_KEY);
    const now = Date.now();

    if (existing) {
      try {
        const { userId, timestamp } = JSON.parse(existing);
        if (userId && now - timestamp < 30 * 60 * 1000) {
          localStorage.setItem(this.USER_KEY, JSON.stringify({ userId, timestamp: now }));
          return userId;
        }
      } catch {}
    }

    const newUserId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem(this.USER_KEY, JSON.stringify({ userId: newUserId, timestamp: now }));
    return newUserId;
  }

  private getStoredThreadId(): string | null {
    return localStorage.getItem(this.THREAD_KEY);
  }

  private createId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
