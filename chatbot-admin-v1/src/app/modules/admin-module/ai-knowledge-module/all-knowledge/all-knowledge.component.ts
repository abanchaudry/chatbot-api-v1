import { Component, OnInit } from "@angular/core";
import { finalize } from "rxjs";
import { AiKnowledgeService } from "src/app/modules/shared/services/ai-knowledge.service";

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

  deleting: DeletingState = {
    open: false,
    fileId: null,
    fileName: null,
    busy: false,
    error: null,
  };

  constructor(private aiKnowledgeService: AiKnowledgeService) {}

  ngOnInit(): void {
    this.getAiKnowledgeData();
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
