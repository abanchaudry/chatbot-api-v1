import { Component } from "@angular/core";
import { AiKnowledgeService } from "src/app/modules/shared/services/ai-knowledge.service";
import { ActivatedRoute } from "@angular/router";
import { PageEvent } from "@angular/material/paginator";
@Component({
  selector: "app-ai-details",
  templateUrl: "./ai-details.component.html",
  styleUrls: ["./ai-details.component.css"],
})
export class AiDetailsComponent {
  page = 1;
  perPage = 10;
  totalChunks = 0;
  aiKnowledgeData: any[] = [];
  fileId: string;
  aiKnowledgeDetails: any[] = [];
  expandedIndexes: Set<number> = new Set();
  isLoading: boolean = true;

  constructor(
    private aiKnowledgeService: AiKnowledgeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.fileId = params.get("id");
      this.fetchPaginatedData(this.page);
    });
  }

  /**
   * Fetch paginated chunks
   */
  fetchPaginatedData(page: number) {
    this.isLoading = true;
    this.aiKnowledgeService
      .getFileChunks(this.fileId, page, this.perPage)
      .subscribe((res: any) => {
        this.aiKnowledgeDetails = (res.chunks || []).map((chunk) => {
          let tags = [];
          try {
            tags =
              typeof chunk.tags === "string"
                ? JSON.parse(chunk.tags)
                : chunk.tags;
          } catch {
            tags = [];
          }
          return { ...chunk, tags };
        });
        this.totalChunks = res.total || 0;
        this.page = res.page || page;
        this.isLoading = false;
      });
  }

  onMaterialPageChange(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.fetchPaginatedData(this.page);
  }

  toggleContent(index: number): void {
    if (this.expandedIndexes.has(index)) {
      this.expandedIndexes.delete(index);
    } else {
      this.expandedIndexes.add(index);
    }
  }

  isExpanded(index: number): boolean {
    return this.expandedIndexes.has(index);
  }
  get totalChunk(): number {
    return this.aiKnowledgeData.reduce(
      (total, item) => total + (item.chunk_count || 0),
      0
    );
  }
  getAiKnowledgeData() {
    this.aiKnowledgeService.getAiKnowledgeData().subscribe((res: any) => {
      if (res.files) {
        this.aiKnowledgeData = res.files.map((file: any) => ({
          ...file,
          displayName: `${file.file_name} (${file.chunk_count} chunks)`,
        }));
      }
    });
  }
}
