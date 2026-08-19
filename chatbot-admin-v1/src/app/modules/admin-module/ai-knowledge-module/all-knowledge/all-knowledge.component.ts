import { Component, OnInit } from "@angular/core";
import { finalize } from "rxjs";
import { AiKnowledgeService } from "src/app/modules/shared/services/ai-knowledge.service";
import { AssistantService } from "src/app/modules/shared/services/assistant.service";

type DeletingState = {
  open: boolean;
  fileId: string | null;
  fileName: string | null;
  busy: boolean;
  error: string | null;
};

@Component({
  selector: "app-all-ai-knowledge",
  templateUrl: "./all-knowledge.component.html",
  styleUrls: ["./all-knowledge.component.css"],
})
export class AllAIKnowledgeComponent implements OnInit {
  page = 1;
  entries = 10;
  itemPerPage = 10;
  aiKnowledgeData: any[] = [];
  totalChunksCount: number = 0;
  isLoading = false;
  searchText: string = "";
  selectedDatasetFilter: string = "all";

  datasetSettings = {
    dataset_admin_enabled: true,
    dataset_admin_weight: 1.25,
    dataset_pdf_enabled: true,
    dataset_pdf_weight: 1.10,
    dataset_web_enabled: true,
    dataset_web_weight: 1.00,
  };
  isSavingSettings = false;
  settingsSavedMessage = false;

  deleting: DeletingState = {
    open: false,
    fileId: null,
    fileName: null,
    busy: false,
    error: null,
  };

  constructor(
    private aiKnowledgeService: AiKnowledgeService,
    private assistantService: AssistantService
  ) {}

  ngOnInit(): void {
    this.getAiKnowledgeData();
    this.loadSettings();
  }

  loadSettings() {
    this.assistantService.getSettings().subscribe({
      next: (res: any) => {
        const s = res?.settings || res?.data || res || {};
        this.datasetSettings = {
          dataset_admin_enabled: s.dataset_admin_enabled !== undefined ? Number(s.dataset_admin_enabled) !== 0 : true,
          dataset_admin_weight: s.dataset_admin_weight !== undefined ? Number(s.dataset_admin_weight) : 1.25,
          dataset_pdf_enabled: s.dataset_pdf_enabled !== undefined ? Number(s.dataset_pdf_enabled) !== 0 : true,
          dataset_pdf_weight: s.dataset_pdf_weight !== undefined ? Number(s.dataset_pdf_weight) : 1.10,
          dataset_web_enabled: s.dataset_web_enabled !== undefined ? Number(s.dataset_web_enabled) !== 0 : true,
          dataset_web_weight: s.dataset_web_weight !== undefined ? Number(s.dataset_web_weight) : 1.00,
        };
      },
      error: (err) => console.warn("Load settings warning:", err),
    });
  }

  saveDatasetSettings() {
    this.isSavingSettings = true;
    this.settingsSavedMessage = false;

    const payload = {
      dataset_admin_enabled: this.datasetSettings.dataset_admin_enabled ? 1 : 0,
      dataset_admin_weight: Number(this.datasetSettings.dataset_admin_weight) || 1.25,
      dataset_pdf_enabled: this.datasetSettings.dataset_pdf_enabled ? 1 : 0,
      dataset_pdf_weight: Number(this.datasetSettings.dataset_pdf_weight) || 1.10,
      dataset_web_enabled: this.datasetSettings.dataset_web_enabled ? 1 : 0,
      dataset_web_weight: Number(this.datasetSettings.dataset_web_weight) || 1.00,
    };

    this.assistantService
      .saveSettings(payload)
      .pipe(finalize(() => (this.isSavingSettings = false)))
      .subscribe({
        next: () => {
          this.settingsSavedMessage = true;
          setTimeout(() => (this.settingsSavedMessage = false), 4000);
        },
        error: (err) => {
          console.error("Save dataset settings failed:", err);
        },
      });
  }

  getDatasetType(item: any): "admin" | "pdf" | "web" {
    if (!item) return "admin";
    const ds = String(item.dataset || item.source || "").toLowerCase();
    if (ds === "pdf") return "pdf";
    if (ds === "web" || item.file_id?.startsWith("web_") || item.file_path?.startsWith("http")) return "web";
    return "admin";
  }

  isDatasetEnabled(dataset: string): boolean {
    const ds = (dataset || "admin").toLowerCase();
    if (ds === "pdf") return this.datasetSettings.dataset_pdf_enabled;
    if (ds === "web") return this.datasetSettings.dataset_web_enabled;
    return this.datasetSettings.dataset_admin_enabled;
  }

  get adminFilesCount(): number {
    return this.aiKnowledgeData.filter((i) => this.getDatasetType(i) === "admin").length;
  }
  get adminChunksCount(): number {
    return this.aiKnowledgeData
      .filter((i) => this.getDatasetType(i) === "admin")
      .reduce((s, i) => s + (Number(i.chunk_count) || 0), 0);
  }

  get pdfFilesCount(): number {
    return this.aiKnowledgeData.filter((i) => this.getDatasetType(i) === "pdf").length;
  }
  get pdfChunksCount(): number {
    return this.aiKnowledgeData
      .filter((i) => this.getDatasetType(i) === "pdf")
      .reduce((s, i) => s + (Number(i.chunk_count) || 0), 0);
  }

  get webFilesCount(): number {
    return this.aiKnowledgeData.filter((i) => this.getDatasetType(i) === "web").length;
  }
  get webChunksCount(): number {
    return this.aiKnowledgeData
      .filter((i) => this.getDatasetType(i) === "web")
      .reduce((s, i) => s + (Number(i.chunk_count) || 0), 0);
  }

  get filteredKnowledgeData(): any[] {
    if (!this.selectedDatasetFilter || this.selectedDatasetFilter === "all") {
      return this.aiKnowledgeData;
    }
    return this.aiKnowledgeData.filter(
      (item) => this.getDatasetType(item) === this.selectedDatasetFilter
    );
  }

  getAiKnowledgeData() {
    this.isLoading = true;

    this.aiKnowledgeService
      .getAiKnowledgeData()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          this.aiKnowledgeData = res?.files || [];
          this.totalChunksCount = this.aiKnowledgeData.reduce(
            (total, item) => total + (Number(item.chunk_count) || 0),
            0
          );
        },
        error: (err) => {
          console.error("Fetch AI knowledge list failed:", err);
        },
      });
  }

  trackByFileId(index: number, item: any): string {
    return item?.file_id || String(index);
  }

  canDownload(row: any): boolean {
    return (
      String(row?.file_status || "").toLowerCase() === "completed" &&
      !!row?.file_path
    );
  }

  download(row: any) {
    if (!this.canDownload(row)) return;

    this.aiKnowledgeService.downloadFile(row.file_id).subscribe({
      next: (blob: Blob) => {
        const a = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = row.file_name || "knowledge.txt";
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: (err) => {
        console.error("Download failed:", err);
      },
    });
  }

  openDeleteModal(row: any) {
    this.deleting = {
      open: true,
      fileId: row.file_id,
      fileName: row.file_name,
      busy: false,
      error: null,
    };
  }

  /**
   * Close modal
   * - by default we block closing while busy to prevent accidental closure mid-request
   * - but we allow force-close after a successful delete
   */
  closeDeleteModal(force = false) {
    if (this.deleting.busy && !force) return;

    this.deleting = {
      open: false,
      fileId: null,
      fileName: null,
      busy: false,
      error: null,
    };
  }

  confirmDelete() {
    const fileId = this.deleting.fileId;
    if (!fileId || this.deleting.busy) return;

    this.deleting.busy = true;
    this.deleting.error = null;

    // Optional: set row status to deleting for better UX
    this.aiKnowledgeData = this.aiKnowledgeData.map((x) =>
      x.file_id === fileId ? { ...x, file_status: "deleting" } : x
    );

    this.aiKnowledgeService
      .deleteFile(fileId)
      .pipe(
        finalize(() => {
          // Always release UI lock at the end of request
          this.deleting.busy = false;
        })
      )
      .subscribe({
        next: () => {
          // Remove item instantly from UI
          this.aiKnowledgeData = this.aiKnowledgeData.filter(
            (x) => x.file_id !== fileId
          );

          // Force-close even if request was "busy" a millisecond ago
          this.closeDeleteModal(true);

          // Refresh list to sync counts/status from backend
          this.getAiKnowledgeData();
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            "Delete failed. Please try again.";

          this.deleting.error = msg;

          // revert status if you want
          this.aiKnowledgeData = this.aiKnowledgeData.map((x) =>
            x.file_id === fileId ? { ...x, file_status: "completed" } : x
          );
        },
      });
  }

  canDelete(row: any): boolean {
    const st = String(row?.file_status || "").toLowerCase();
    return st !== "deleting";
  }
}
