import { Component, OnInit, OnDestroy } from "@angular/core";
import { AiKnowledgeService } from "../../../shared/services/ai-knowledge.service";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import Swal from "sweetalert2";

interface TierFormData {
  topic: string;
  section: string;
  tags: string;
  content: string;
}

@Component({
  selector: "app-all-chunks",
  templateUrl: "./all-chunks.component.html",
  styleUrls: ["./all-chunks.component.css"],
})
export class AllChunksComponent implements OnInit, OnDestroy {
  allChunks: any[] = [];
  aiKnowledgeData: any[] = [];
  selectedFileId: string | null = null;

  isLoading: boolean = false;
  totalChunks: number = 0;
  page: number = 1;
  perPage: number = 10;
  expandedIndexes: Set<number> = new Set();

  searchText: string = "";
  private searchSubject: Subject<string> = new Subject<string>();
  private searchSub?: Subscription;

  // Multi-Tier Linked Edit Modal State (Solution 3)
  isEditModalOpen: boolean = false;
  isSavingChunk: boolean = false;
  isLoadingTiers: boolean = false;
  editingChunkId: string = "";
  activeTierTab: "small" | "medium" | "large" = "small";

  relatedTiers: { small: any; medium: any; large: any } = {
    small: null,
    medium: null,
    large: null,
  };

  tierForms: {
    small: TierFormData;
    medium: TierFormData;
    large: TierFormData;
  } = {
    small: { topic: "", section: "", tags: "", content: "" },
    medium: { topic: "", section: "", tags: "", content: "" },
    large: { topic: "", section: "", tags: "", content: "" },
  };

  constructor(private aiKnowledgeService: AiKnowledgeService) {}

  ngOnInit() {
    this.getAiKnowledgeData();
    this.fetchAllChunks();

    // 300ms live debounced search across full database
    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page = 1;
        if (this.selectedFileId) {
          this.fetchChunksFiles(this.selectedFileId, 1);
        } else {
          this.fetchAllChunks(1);
        }
      });
  }

  ngOnDestroy() {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  getAiKnowledgeData() {
    this.aiKnowledgeService.getAiKnowledgeData().subscribe((res: any) => {
      if (res.files) {
        this.aiKnowledgeData = res.files.map((file: any) => {
          const count = Math.round(Number(file.chunk_count || 0));
          return {
            ...file,
            chunk_count: count,
            displayName: `${file.file_name} (${count.toLocaleString()} chunks)`,
          };
        });
      }
    });
  }

  fetchAllChunks(page: number = 1) {
    this.isLoading = true;
    this.aiKnowledgeService.getAllChunks(page, this.perPage, this.searchText).subscribe({
      next: (res: any) => {
        this.allChunks = res.chunks || [];
        this.totalChunks = res.total || 0;
        this.page = page;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  fetchChunksFiles(fileId: string, page: number = 1) {
    this.isLoading = true;
    this.aiKnowledgeService
      .getFileChunks(fileId, page, this.perPage, this.searchText)
      .subscribe({
        next: (res: any) => {
          this.allChunks = res.chunks || [];
          this.totalChunks = res.total || 0;
          this.page = page;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  onSearchChange(text: string) {
    this.searchSubject.next(text);
  }

  onFileSelectionChange(selectedId: string | null) {
    this.page = 1;
    this.expandedIndexes.clear();

    if (selectedId) {
      this.selectedFileId = selectedId;
      this.fetchChunksFiles(selectedId, 1);
    } else {
      this.selectedFileId = null;
      this.fetchAllChunks(1);
    }
  }

  onPageChange(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page = newPage;
    if (this.selectedFileId) {
      this.fetchChunksFiles(this.selectedFileId, newPage);
    } else {
      this.fetchAllChunks(newPage);
    }
  }

  toggleContent(index: number) {
    if (this.expandedIndexes.has(index)) {
      this.expandedIndexes.delete(index);
    } else {
      this.expandedIndexes.add(index);
    }
  }

  isExpanded(index: number): boolean {
    return this.expandedIndexes.has(index);
  }

  totalPages(): number {
    return Math.ceil(this.totalChunks / this.perPage) || 1;
  }

  getPagesArray(): number[] {
    const total = this.totalPages();
    const current = this.page;
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    if (current <= 3) {
      end = Math.min(total, 5);
    } else if (current >= total - 2) {
      start = Math.max(1, total - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  reset() {
    this.selectedFileId = null;
    this.searchText = "";
    this.expandedIndexes.clear();
    this.page = 1;
    this.fetchAllChunks(1);
  }

  get totalChunk(): number {
    if (this.totalChunks > 0 && !this.selectedFileId) {
      return this.totalChunks;
    }
    return this.aiKnowledgeData.reduce(
      (total, item) => total + Math.round(Number(item.chunk_count || 0)),
      0
    );
  }

  /* -------------------------------------------
   * SOLUTION 3: MULTI-TIER LINKED EDIT MODAL HANDLERS
   * -----------------------------------------*/

  openEditModal(item: any) {
    this.editingChunkId = item.chunk_id;
    this.isEditModalOpen = true;
    this.isLoadingTiers = true;
    this.activeTierTab = "small";

    // Setup initial fallback form from selected item
    const initTags = this.tagsToString(item.tags);
    const initialFormData: TierFormData = {
      topic: item.topic || "",
      section: item.section || "",
      tags: initTags,
      content: item.content || "",
    };

    this.tierForms = {
      small: { ...initialFormData },
      medium: { ...initialFormData },
      large: { ...initialFormData },
    };

    this.relatedTiers = { small: item, medium: null, large: null };

    // Fetch all related 3-tier chunks for this section
    this.aiKnowledgeService.getRelatedTiers(item.chunk_id).subscribe({
      next: (res: any) => {
        this.isLoadingTiers = false;
        if (res.ok) {
          this.relatedTiers = {
            small: res.small,
            medium: res.medium,
            large: res.large,
          };

          if (res.small) {
            this.tierForms.small = {
              topic: res.small.topic || "",
              section: res.small.section || "",
              tags: this.tagsToString(res.small.tags),
              content: res.small.content || "",
            };
          }

          if (res.medium) {
            this.tierForms.medium = {
              topic: res.medium.topic || "",
              section: res.medium.section || "",
              tags: this.tagsToString(res.medium.tags),
              content: res.medium.content || "",
            };
          }

          if (res.large) {
            this.tierForms.large = {
              topic: res.large.topic || "",
              section: res.large.section || "",
              tags: this.tagsToString(res.large.tags),
              content: res.large.content || "",
            };
          }

          // Automatically activate tab matching target chunk
          if (res.large && res.large.chunk_id === item.chunk_id) {
            this.activeTierTab = "large";
          } else if (res.medium && res.medium.chunk_id === item.chunk_id) {
            this.activeTierTab = "medium";
          } else {
            this.activeTierTab = "small";
          }
        }
      },
      error: () => {
        this.isLoadingTiers = false;
      },
    });
  }

  switchTierTab(tab: "small" | "medium" | "large") {
    this.activeTierTab = tab;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.isSavingChunk = false;
    this.editingChunkId = "";
  }

  saveChunkEdit() {
    const currentForm = this.tierForms[this.activeTierTab];

    if (!currentForm.content.trim()) {
      Swal.fire("Required Field", "Chunk content cannot be empty.", "warning");
      return;
    }

    this.isSavingChunk = true;

    // Determine primary chunk to send to backend
    const primaryTierObj = this.relatedTiers[this.activeTierTab] || {
      chunk_id: this.editingChunkId,
    };
    const primaryChunkId = primaryTierObj.chunk_id || this.editingChunkId;

    const parsedPrimaryTags = currentForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Build relatedTiers array for bulk update across all 3 tiers
    const relatedTiersPayload: any[] = [];

    const tiersList: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
    for (const tKey of tiersList) {
      if (tKey !== this.activeTierTab && this.relatedTiers[tKey]) {
        const tf = this.tierForms[tKey];
        if (tf && tf.content.trim()) {
          relatedTiersPayload.push({
            chunk_id: this.relatedTiers[tKey].chunk_id,
            topic: tf.topic.trim(),
            section: tf.section.trim(),
            tags: tf.tags.split(",").map((t) => t.trim()).filter(Boolean),
            content: tf.content.trim(),
          });
        }
      }
    }

    const payload = {
      topic: currentForm.topic.trim(),
      section: currentForm.section.trim(),
      tags: parsedPrimaryTags,
      content: currentForm.content.trim(),
      relatedTiers: relatedTiersPayload,
    };

    this.aiKnowledgeService.updateChunk(primaryChunkId, payload).subscribe({
      next: (res: any) => {
        this.isSavingChunk = false;
        this.closeEditModal();

        const countText =
          res.extraUpdatedCount > 0
            ? `Primary tier and ${res.extraUpdatedCount} linked parent tier(s) were re-indexed!`
            : "The selected chunk tier has been re-indexed into Cloudflare Vectorize.";

        Swal.fire({
          icon: "success",
          title: "Multi-Tier Re-Indexed!",
          text: countText,
          confirmButtonColor: "#3167f3",
          timer: 3500,
        });

        if (this.selectedFileId) {
          this.fetchChunksFiles(this.selectedFileId, this.page);
        } else {
          this.fetchAllChunks(this.page);
        }
      },
      error: (err: any) => {
        this.isSavingChunk = false;
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: err.error?.message || "Failed to update and re-index chunk.",
          confirmButtonColor: "#3167f3",
        });
      },
    });
  }

  confirmDeleteChunk(item: any) {
    Swal.fire({
      title: "Delete Chunk?",
      text: `Are you sure you want to permanently delete this chunk (#${item.chunk_id})? This will remove its vector embedding from AI search.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete chunk",
    }).then((result) => {
      if (result.isConfirmed) {
        this.aiKnowledgeService.deleteChunk(item.chunk_id).subscribe({
          next: () => {
            Swal.fire({
              icon: "success",
              title: "Deleted!",
              text: "Chunk and vector embedding removed successfully.",
              confirmButtonColor: "#3167f3",
              timer: 2000,
            });

            this.getAiKnowledgeData();
            if (this.selectedFileId) {
              this.fetchChunksFiles(this.selectedFileId, this.page);
            } else {
              this.fetchAllChunks(this.page);
            }
          },
          error: (err: any) => {
            Swal.fire({
              icon: "error",
              title: "Delete Failed",
              text: err.error?.message || "Failed to delete chunk.",
              confirmButtonColor: "#3167f3",
            });
          },
        });
      }
    });
  }

  private tagsToString(tags: any): string {
    if (!tags) return "";
    if (Array.isArray(tags)) return tags.join(", ");
    if (typeof tags === "string") {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed.join(", ") : tags;
      } catch {
        return tags;
      }
    }
    return "";
  }

  formatTagsDisplay(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }
    return [];
  }
}
