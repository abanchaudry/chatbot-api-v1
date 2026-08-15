// import { Component, OnInit } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';
// import Swal from 'sweetalert2';
// import { nanoid } from 'nanoid';
// import { AiKnowledgeService } from '../../../shared/services/ai-knowledge.service';
// import { UploadProgressComponent } from '../../../shared/popup/upload-progress/upload-progress.component';

// @Component({
//   selector: 'app-add-new-knowledge',
//   templateUrl: './add-new.component.html',
//   styleUrls: ['./add-new.component.css']
// })
// export class AddNewKnowledgeComponent implements OnInit {
//   // view state
//   showForm = true;
//   showTable = false;

//   // file state
//   fileToUpload: File | null = null;
//   fileName = '';
//   filePreview = false;

//   // progress + paging
//   inProcess = false;
//   page = 1;
//   entries = 10;
//   itemPerPage = 10;

//   // chunk preview
//   chunkData: any[] = [];

//   // ids
//   uploadId = '';
//   fileId: string = ''; // <-- used when saving reviewed chunks

//   // form model
//   model: any = {
//     id: '',
//     fileType: 'text',
//     fileId: '',
//     strategy: 'semantic', // 'general' | 'semantic'
//     version: '',
//   };

//   constructor(
//     private aiService: AiKnowledgeService,
//     private dialog: MatDialog
//   ) {}

//   ngOnInit(): void {
//     this.uploadId = nanoid();
//     this.model.fileId = this.uploadId;
//   }

//   onFile(event: Event) {
//     const input = event.target as HTMLInputElement;
//     const file = input?.files?.[0];
//     if (!file) {
//       this.fileToUpload = null;
//       this.fileName = '';
//       this.filePreview = false;
//       return;
//     }
//     this.fileToUpload = file;
//     this.fileName = file.name;
//     this.filePreview = true;
//   }

//   // Step 1: preview (no DB / vector writes)
//   onSubmit(form: any) {
//     if (form.invalid || !this.fileToUpload) return;

//     const formData = new FormData();
//     formData.append('files', this.fileToUpload);
//     formData.append('strategy', this.model.strategy || 'semantic');
//     formData.append('uploadId', this.uploadId);

//     this.inProcess = true;

//     let dialogRef: any = null;
//     if (this.model.strategy !== 'general') {
//       dialogRef = this.dialog.open(UploadProgressComponent, {
//         disableClose: true,
//         data: {
//           fileName: this.fileName,
//           file: this.fileToUpload,
//           uploadId: this.uploadId,
//           startAfterDelay: 1500,
//         },
//       });
//     }

//     this.aiService.getProcessedChunks(formData).subscribe({
//       next: (res: any) => {
//         if (dialogRef) dialogRef.close();

//         const result = res?.results?.[0];
//         const chunks = result?.chunks;

//         if (chunks?.length) {
//           this.chunkData = chunks;
//           this.model.version = result.version;
//           // create a persistent fileId for this save
//           this.fileId = nanoid(); // <--- important
//           this.showForm = false;
//           this.showTable = true;
//         } else {
//           Swal.fire('Error', result?.error || 'File too short to process.', 'error');
//         }
//         this.inProcess = false;
//       },
//       error: () => {
//         if (dialogRef) dialogRef.close();
//         Swal.fire('Error', 'Failed to fetch preview chunks.', 'error');
//         this.inProcess = false;
//       },
//     });
//   }

//   // Step 2: SAVE REVIEWED CHUNKS (no re-chunk on server)
//   onProceed() {
//     if (!this.chunkData?.length) {
//       Swal.fire('Error', 'No chunks to save. Please preview again.', 'error');
//       return;
//     }
//     if (!this.fileId) {
//       // safety: ensure we have a fileId to write under
//       this.fileId = nanoid();
//     }

//     const payload = {
//       fileName: this.fileName || `manual-${new Date().toISOString()}.txt`,
//       version: this.model.version || `v${Date.now()}`,
//       fileId: this.fileId,
//       uploadId: this.uploadId,
//       chunkMethod: this.model.strategy || 'semantic',
//       // You can expose this as a dropdown later if you want:
//       embeddingModel: 'text-embedding-3-small',
//       chunks: this.chunkData.map((c: any, idx: number) => ({
//         index: typeof c.index === 'number' ? c.index : idx,
//         content: c.content,
//         section: c.section,
//         tags: Array.isArray(c.tags) ? c.tags : [],
//         topic: c.topic || 'general',
//       })),
//     };

//     const dialogRef = this.dialog.open(UploadProgressComponent, {
//       disableClose: true,
//       width: '600px',
//       minWidth: '500px',
//       data: { fileName: this.fileName, uploadId: this.uploadId },
//     });

//     this.aiService.finalizeReviewedChunks(payload).subscribe({
//       next: (res) => {
//         if (dialogRef) dialogRef.close();
//         if (res?.ok) {
//           Swal.fire('Saved', 'Reviewed chunks stored successfully.', 'success');
//           this.resetForm();
//         } else {
//           Swal.fire('Error', res?.message || 'Failed to save chunks.', 'error');
//         }
//       },
//       error: (err) => {
//         if (dialogRef) dialogRef.close();
//         Swal.fire('Error', err?.error?.message || 'Failed to save chunks.', 'error');
//       },
//     });
//   }

//   onBack() {
//     this.showForm = true;
//     this.showTable = false;
//   }

//   onCancel() {
//     this.resetForm();
//   }

//   resetForm() {
//     this.model = {
//       id: '',
//       fileType: 'text',
//       fileId: '',
//       strategy: 'semantic',
//       version: '',
//     };
//     this.fileName = '';
//     this.filePreview = false;
//     this.fileToUpload = null;
//     this.chunkData = [];
//     this.showForm = true;
//     this.showTable = false;
//     this.inProcess = false;

//     this.uploadId = nanoid();
//     this.model.fileId = this.uploadId;
//     this.fileId = '';
//     this.page = 1;
//   }

//   getProgressPercentage(progress: any): number {
//     if (!progress || !progress.totalBatches) return 0;
//     return Math.floor((progress.completedBatches / progress.totalBatches) * 100);
//   }

//   viewInfo() {
//     // this.dialog.open(ChunckInfoComponent, { width: '600px' });
//   }
// }


import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import Swal from "sweetalert2";
import { nanoid } from "nanoid";
import { AiKnowledgeService } from "../../../shared/services/ai-knowledge.service";
import { UploadProgressComponent } from "../../../shared/popup/upload-progress/upload-progress.component";

@Component({
  selector: "app-add-new-knowledge",
  templateUrl: "./add-new.component.html",
  styleUrls: ["./add-new.component.css"],
})
export class AddNewKnowledgeComponent implements OnInit {
  showForm = true;
  showTable = false;

  activeIngestTab: "file" | "web" = "file";
  crawlUrl = "";
  crawlSchedule = "manual";

  // Recursive crawler state
  crawlMaxDepth = 2;
  crawlMaxPages = 50;
  discoveredPages: Array<{ url: string; title: string; depth: number; selected: boolean }> = [];
  showPageSelector = false;
  isDiscovering = false;
  isCrawlingSelected = false;
  crawlResults: any[] = [];

  fileToUpload: File | null = null;
  fileName = "";
  filePreview = false;

  inProcess = false;
  page = 1;
  entries = 10;
  itemPerPage = 10;

  chunkData: any[] = [];

  uploadId = "";
  fileId = "";

  // Edit Chunk Modal state
  showEditChunkModal = false;
  selectedChunk: any = null;
  selectedChunkIndex = -1;
  editingContent = "";
  editingSection = "";
  editingTagsStr = "";

  // Full Document View Modal state
  showFullDocumentModal = false;
  fullDocumentContent = "";
  rawFullMarkdown = "";


  // Tier Filter state for table preview
  selectedTierFilter = "all";

  get displayChunkData(): any[] {
    if (!this.selectedTierFilter || this.selectedTierFilter === "all") return this.chunkData;
    return this.chunkData.filter((c) => c.tier === this.selectedTierFilter);
  }


  // Dynamic Step Progress Status
  processingStep = 1;
  processingStatusText = "Preparing document...";
  processingSubText = "Initializing document processing pipeline";
  processingPercent = 10;
  private progressTimer: any = null;

  processingSteps = [
    { key: "prep", label: "Document Pre-rendering & Upload", icon: "description", status: "pending" },
    { key: "ocr", label: "Multimodal AI Vision & OCR", icon: "visibility", status: "pending" },
    { key: "classify", label: "Document Classification", icon: "category", status: "pending" },
    { key: "chunk", label: "3-Tier Tree Chunking", icon: "account_tree", status: "pending" },
    { key: "preview", label: "Generating Preview Table", icon: "view_list", status: "pending" },
  ];

  model: any = {
    id: "",
    fileType: "text",
    fileId: "",
    strategy: "adaptive",
    engineMode: "offline",
    version: "",
  };

  constructor(
    private aiService: AiKnowledgeService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  onCrawlSubmit(): void {
    if (!this.crawlUrl) {
      Swal.fire("Error", "Please enter a valid website URL", "error");
      return;
    }

    this.inProcess = true;
    this.startCrawlStepProgress();

    this.aiService.crawlWebUrl({ url: this.crawlUrl, crawlSchedule: this.crawlSchedule }).subscribe({
      next: (res: any) => {
        this.completeStepProgress();
        this.inProcess = false;
        if (res?.ok) {
          Swal.fire({
            title: "Web Page Crawled & Indexed!",
            text: `Successfully crawled ${res.fileName || this.crawlUrl}. ${res.chunkCounts?.total || 0} Agentic AI 3-tier chunks created and indexed in Cloudflare Vectorize.`,
            icon: "success",
            confirmButtonText: "View All Knowledge",
          }).then(() => {
            this.router.navigate(["/dashboard/ai-knowledge/all-ai-knowledge"]);
          });
        } else {
          Swal.fire("Error", res?.message || "Failed to crawl web page", "error");
        }
      },
      error: (err: any) => {
        this.completeStepProgress();
        this.inProcess = false;
        const errObj = err?.error || err;
        const errMsg = typeof errObj === "string" ? errObj : (errObj?.message || errObj?.error || err?.message || "Failed to crawl website URL");
        Swal.fire("Crawl Error", errMsg, "error");
      },
    });
  }

  startCrawlStepProgress() {
    this.processingPercent = 15;
    this.processingStatusText = "Fetching Web Page Content...";
    this.processingSubText = "Launching Cloudflare Browser Run headless Chrome engine";
    this.processingSteps = [
      { key: "fetch", label: "Cloudflare Edge Browser Fetch", icon: "public", status: "active" },
      { key: "clean", label: "DOM Cleaning & Boilerplate Stripping", icon: "cleaning_services", status: "pending" },
      { key: "chunk", label: "Agentic AI 3-Tier Semantic Chunking", icon: "account_tree", status: "pending" },
      { key: "vector", label: "1536d OpenAI Vector Indexing", icon: "scatter_plot", status: "pending" },
      { key: "done", label: "Saving to Cloudflare D1 & Cache Purge", icon: "check_circle", status: "pending" },
    ];

    let timerCount = 0;
    this.progressTimer = setInterval(() => {
      timerCount++;
      if (timerCount === 2) {
        this.processingPercent = 35;
        this.processingStatusText = "Cleaning DOM & Stripping Boilerplate...";
        this.processingSubText = "Removing navbars, headers, footers, and scripts";
        this.processingSteps[0].status = "completed";
        this.processingSteps[1].status = "active";
      } else if (timerCount === 4) {
        this.processingPercent = 65;
        this.processingStatusText = "Agentic AI 3-Tier Semantic Chunking...";
        this.processingSubText = "Building linked Large, Medium, and Small chunks";
        this.processingSteps[1].status = "completed";
        this.processingSteps[2].status = "active";
      } else if (timerCount === 6) {
        this.processingPercent = 85;
        this.processingStatusText = "Generating OpenAI Vectors & Indexing...";
        this.processingSubText = "Upserting 1536d vectors into Cloudflare Vectorize";
        this.processingSteps[2].status = "completed";
        this.processingSteps[3].status = "active";
      }
      this.cdr.detectChanges();
    }, 1500);
  }

  completeStepProgress() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.processingPercent = 100;
    this.processingStatusText = "Processing complete!";
    this.processingSubText = "Web content chunked and indexed successfully";
    this.processingSteps.forEach((s) => (s.status = "completed"));
    this.cdr.detectChanges();
  }

  // Phase 1: Discover sub-links
  onDiscoverPages(): void {
    if (!this.crawlUrl) {
      Swal.fire('Error', 'Please enter a valid website URL', 'error');
      return;
    }
    this.isDiscovering = true;
    this.discoveredPages = [];
    this.showPageSelector = false;

    this.aiService.discoverLinks({
      url: this.crawlUrl,
      maxDepth: this.crawlMaxDepth,
      maxPages: this.crawlMaxPages
    }).subscribe({
      next: (res: any) => {
        this.isDiscovering = false;
        if (res?.ok && res.pages?.length > 0) {
          this.discoveredPages = res.pages.map((p: any) => ({
            ...p,
            selected: true  // Select all by default
          }));
          this.showPageSelector = true;
        } else {
          Swal.fire('No Pages Found', 'Could not discover any sub-pages from this URL.', 'warning');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isDiscovering = false;
        const errMsg = err?.error?.message || err?.message || 'Failed to discover pages';
        Swal.fire('Discovery Error', errMsg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // Toggle select all / deselect all
  toggleSelectAll(event: any): void {
    const checked = event.target.checked;
    this.discoveredPages.forEach(p => p.selected = checked);
  }

  get selectedPageCount(): number {
    return this.discoveredPages.filter(p => p.selected).length;
  }

  get allPagesSelected(): boolean {
    return this.discoveredPages.length > 0 && this.discoveredPages.every(p => p.selected);
  }

  // Phase 2: Crawl selected pages
  onCrawlSelected(): void {
    const selectedUrls = this.discoveredPages.filter(p => p.selected).map(p => p.url);
    if (selectedUrls.length === 0) {
      Swal.fire('Error', 'Please select at least one page to crawl.', 'error');
      return;
    }

    this.isCrawlingSelected = true;
    this.inProcess = true;
    this.startCrawlSelectedProgress(selectedUrls.length);

    this.aiService.crawlSelectedPages({
      rootUrl: this.crawlUrl,
      crawlSchedule: this.crawlSchedule,
      pages: selectedUrls
    }).subscribe({
      next: (res: any) => {
        this.completeCrawlSelectedProgress();
        this.isCrawlingSelected = false;
        this.inProcess = false;
        if (res?.ok) {
          this.crawlResults = res.results || [];
          Swal.fire({
            title: 'Web Pages Crawled & Indexed!',
            html: `Successfully crawled <strong>${res.crawled || selectedUrls.length}</strong> pages.<br><br>` +
                  `Total chunks created: <strong>${res.totalChunks || 0}</strong><br>` +
                  `Total vectors indexed: <strong>${res.totalVectors || 0}</strong>`,
            icon: 'success',
            confirmButtonText: 'View All Knowledge'
          }).then(() => {
            this.router.navigate(['/dashboard/ai-knowledge/all-ai-knowledge']);
          });
        } else {
          Swal.fire('Error', res?.message || 'Failed to crawl selected pages', 'error');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.completeCrawlSelectedProgress();
        this.isCrawlingSelected = false;
        this.inProcess = false;
        const errMsg = err?.error?.message || err?.message || 'Failed to crawl selected pages';
        Swal.fire('Crawl Error', errMsg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  startCrawlSelectedProgress(pageCount: number) {
    this.processingPercent = 10;
    this.processingStatusText = `Crawling ${pageCount} selected pages...`;
    this.processingSubText = 'Launching Cloudflare Edge crawler for each page';
    this.processingSteps = [
      { key: 'discover', label: 'Page Discovery Complete', icon: 'search', status: 'completed' },
      { key: 'fetch', label: `Fetching ${pageCount} Pages via Edge Browser`, icon: 'public', status: 'active' },
      { key: 'chunk', label: 'Agentic AI 3-Tier Semantic Chunking', icon: 'account_tree', status: 'pending' },
      { key: 'vector', label: '1536d OpenAI Vector Embedding & Indexing', icon: 'scatter_plot', status: 'pending' },
      { key: 'done', label: 'Saving Per-Page Files to D1 & Cache Purge', icon: 'check_circle', status: 'pending' },
    ];

    let timerCount = 0;
    this.progressTimer = setInterval(() => {
      timerCount++;
      if (timerCount === 3) {
        this.processingPercent = 40;
        this.processingStatusText = 'Processing page content...';
        this.processingSubText = 'Cleaning DOM & stripping boilerplate for each page';
        this.processingSteps[1].status = 'completed';
        this.processingSteps[2].status = 'active';
      } else if (timerCount === 6) {
        this.processingPercent = 70;
        this.processingStatusText = 'Generating vectors & indexing...';
        this.processingSubText = 'Upserting 1536d vectors for each page into Cloudflare Vectorize';
        this.processingSteps[2].status = 'completed';
        this.processingSteps[3].status = 'active';
      } else if (timerCount === 9) {
        this.processingPercent = 90;
        this.processingStatusText = 'Saving per-page records...';
        this.processingSubText = 'Creating individual file records in Cloudflare D1';
        this.processingSteps[3].status = 'completed';
        this.processingSteps[4].status = 'active';
      }
      this.cdr.detectChanges();
    }, 2000);
  }

  completeCrawlSelectedProgress() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.processingPercent = 100;
    this.processingStatusText = 'All pages crawled & indexed!';
    this.processingSubText = 'Per-page files, chunks, and vectors saved successfully';
    this.processingSteps.forEach(s => s.status = 'completed');
    this.cdr.detectChanges();
  }

  resetCrawlerState(): void {
    this.discoveredPages = [];
    this.showPageSelector = false;
    this.isDiscovering = false;
    this.isCrawlingSelected = false;
    this.crawlResults = [];
  }

  ngOnInit(): void {
    this.uploadId = nanoid();
    this.model.fileId = this.uploadId;
  }

  resetProcessingSteps() {
    this.processingStep = 1;
    this.processingPercent = 10;
    this.processingStatusText = "Preparing document...";
    this.processingSubText = "Initializing document processing pipeline";
    this.processingSteps = [
      { key: "prep", label: "Document Pre-rendering & Upload", icon: "description", status: "active" },
      { key: "ocr", label: "Multimodal AI Vision & OCR", icon: "visibility", status: "pending" },
      { key: "classify", label: "Document Classification", icon: "category", status: "pending" },
      { key: "chunk", label: "3-Tier Tree Chunking", icon: "account_tree", status: "pending" },
      { key: "preview", label: "Generating Preview Table", icon: "view_list", status: "pending" },
    ];
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  updateProcessingStep(stepIdx: number, statusText: string, subText: string, percent: number) {
    this.processingStep = stepIdx;
    this.processingStatusText = statusText;
    this.processingSubText = subText;
    this.processingPercent = percent;

    for (let i = 0; i < this.processingSteps.length; i++) {
      if (i < stepIdx - 1) {
        this.processingSteps[i].status = "completed";
      } else if (i === stepIdx - 1) {
        this.processingSteps[i].status = "active";
      } else {
        this.processingSteps[i].status = "pending";
      }
    }
    this.cdr.detectChanges();
  }

  startSimulatedProgress() {
    let elapsedSec = 0;
    this.progressTimer = setInterval(() => {
      elapsedSec += 1;
      if (elapsedSec === 2) {
        this.updateProcessingStep(2, "Multimodal AI Vision & OCR", "Transcribing pages, tables & code snippets with GPT-4o...", 35);
      } else if (elapsedSec === 6) {
        this.updateProcessingStep(3, "Classifying Document Structure", "Detecting category, clauses & section boundaries...", 65);
      } else if (elapsedSec === 10) {
        this.updateProcessingStep(4, "Building 3-Tier Tree Chunks", "Generating Large, Medium & Small parent-child nodes...", 85);
      } else if (elapsedSec === 14) {
        this.updateProcessingStep(5, "Finalizing Preview Table", "Tagging metadata and preparing review table...", 95);
      }
    }, 1000);
  }

  stopProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }


  openEditChunkModal(chunk: any, index: number) {
    const targetIndex = this.chunkData.findIndex((c) => c === chunk || (c.id && c.id === chunk.id));
    this.selectedChunk = chunk;
    this.selectedChunkIndex = targetIndex >= 0 ? targetIndex : (this.page - 1) * this.entries + index;
    this.editingContent = chunk.content || "";
    this.editingSection = chunk.section || "";
    this.editingTagsStr = Array.isArray(chunk.tags) ? chunk.tags.join(", ") : "";
    this.showEditChunkModal = true;
    this.cdr.detectChanges();
  }


  saveChunkEdits() {
    if (this.selectedChunkIndex >= 0 && this.selectedChunkIndex < this.chunkData.length) {
      const updatedTags = this.editingTagsStr
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      this.chunkData[this.selectedChunkIndex].content = this.editingContent;
      this.chunkData[this.selectedChunkIndex].section = this.editingSection;
      this.chunkData[this.selectedChunkIndex].tags = updatedTags;

      Swal.fire({
        icon: "success",
        title: "Chunk Updated",
        text: `Chunk #${this.selectedChunkIndex + 1} changes saved to preview table.`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
    this.showEditChunkModal = false;
    this.cdr.detectChanges();
  }

  closeEditChunkModal() {
    this.showEditChunkModal = false;
    this.cdr.detectChanges();
  }

  openFullDocumentModal() {
    if (this.rawFullMarkdown) {
      this.fullDocumentContent = this.rawFullMarkdown;
    } else {
      const topTiers = this.chunkData.filter((c) => c.tier === "large");
      const sourceChunks = topTiers.length > 0 ? topTiers : this.chunkData;
      this.fullDocumentContent = sourceChunks
        .map((c, i) => `### Section ${i + 1} (${c.section || "General"})\n\n${c.content}`)
        .join("\n\n---\n\n");
    }
    this.showFullDocumentModal = true;
    this.cdr.detectChanges();
  }



  closeFullDocumentModal() {
    this.showFullDocumentModal = false;
    this.cdr.detectChanges();
  }


  copyFullDocument() {
    navigator.clipboard.writeText(this.fullDocumentContent).then(() => {
      Swal.fire({
        icon: "success",
        title: "Copied!",
        text: "Full extracted document text copied to clipboard.",
        timer: 1500,
        showConfirmButton: false,
      });
    });
  }


  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      this.fileToUpload = null;
      this.fileName = "";
      this.filePreview = false;
      return;
    }
    this.fileToUpload = file;
    this.fileName = file.name;
    this.filePreview = true;
  }

  /**
   * Client-Side HTML5 Canvas 300 DPI PDF Page Rasterizer (Option 3 / ai-full)
   * Pre-renders PDF pages at 2.0x scale (300 DPI) into base64 PNG data URLs
   */
  async renderPdfPagesToImages(file: File): Promise<Array<{ pageNum: number; dataUrl: string }>> {
    try {
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageImages: Array<{ pageNum: number; dataUrl: string }> = [];

      const maxPages = pdf.numPages; // No page limit: rasterize all pages in the PDF
      for (let i = 1; i <= maxPages; i++) {


        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // 300 DPI scale
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          pageImages.push({
            pageNum: i,
            dataUrl: canvas.toDataURL("image/png"),
          });
        }
      }
      return pageImages;
    } catch (err) {
      console.warn("Client 300 DPI PDF rendering note:", err);
      return [];
    }
  }

  async onSubmit(form: any) {
    if (form.invalid || !this.fileToUpload) return;

    this.uploadId = nanoid();
    this.model.fileId = this.uploadId;
    this.inProcess = true;
    this.resetProcessingSteps();

    const formData = new FormData();
    formData.append("files", this.fileToUpload);
    formData.append("strategy", this.model.strategy || "semantic");
    formData.append("engineMode", this.model.engineMode || "");
    formData.append("uploadId", this.uploadId);

    // Pre-render 300 DPI page images for PDF files in AI Vision modes
    if (
      this.fileToUpload.name.toLowerCase().endsWith(".pdf") &&
      (this.model.engineMode === "ai-full" || this.model.engineMode === "hybrid")
    ) {
      this.updateProcessingStep(1, "Pre-rendering 300 DPI Canvas Pages", "Rendering PDF pages into high-resolution visual streams...", 20);
      const pageImages = await this.renderPdfPagesToImages(this.fileToUpload);
      if (pageImages.length > 0) {
        formData.append("pageImages", JSON.stringify(pageImages));
      }
    }

    this.updateProcessingStep(2, "Multimodal AI Vision OCR", "Transcribing text, code snippets & GFM tables...", 35);
    this.startSimulatedProgress();

    // ── Determine if this is the NEW synchronous pipeline ─────────────
    // engineMode set means the scalable-rag bridge handles it synchronously.
    // 'general' and 'semantic' (no engineMode) use the legacy async flow.
    const isSyncPipeline = !!this.model.engineMode;

    if (isSyncPipeline || this.model.strategy === "general") {
      // ── SYNC PATH: no polling dialog, spinner is shown inline ────────
      // getProcessedChunks returns chunks directly in the response body.
      this.aiService.getProcessedChunks(formData).subscribe({
        next: (res: any) => {
          this.stopProgressTimer();
          const result = res?.results?.[0];
          const chunks = result?.chunks;

          if (chunks && Array.isArray(chunks) && chunks.length > 0) {
            this.rawFullMarkdown = result?.fullMarkdown || "";
            this.updateProcessingStep(5, "Processing Complete!", "Loading preview table...", 100);
            this.processingSteps.forEach((s) => (s.status = "completed"));


            setTimeout(() => {
              this.chunkData = [...chunks];
              this.model.version = result.version || `v${Date.now()}`;
              this.fileId = crypto.randomUUID();
              this.showForm = false;
              this.showTable = true;
              this.inProcess = false;
              this.cdr.detectChanges();
            }, 300);
          } else {
            this.inProcess = false;
            Swal.fire("Error", result?.error || "File too short or no chunks returned.", "error");
            this.cdr.detectChanges();
          }
        },
        error: (err: any) => {
          this.stopProgressTimer();
          this.inProcess = false;
          console.error("Preview chunk error:", err);
          Swal.fire("Error", err?.error?.message || "Failed to fetch preview chunks.", "error");
          this.cdr.detectChanges();
        },
      });


    } else {
      // ── ASYNC PATH: 'semantic' strategy uses KV polling progress dialog ─
      const dialogRef = this.dialog.open(UploadProgressComponent, {
        disableClose: true,
        data: {
          fileName: this.fileName,
          file: this.fileToUpload,
          uploadId: this.uploadId,
          startAfterDelay: 1500,
        },
      });

      dialogRef.afterClosed().subscribe((res: any) => {
        if (res?.completed && this.uploadId) {
          this.aiService.getPreviewChunks(this.uploadId).subscribe({
            next: (previewRes: any) => {
              const result = previewRes?.results?.[0];
              const chunks = result?.chunks;
              if (chunks && Array.isArray(chunks) && chunks.length > 0) {
                this.chunkData = [...chunks];
                this.model.version = result.version || `v${Date.now()}`;
                this.fileId = crypto.randomUUID();
                this.showForm = false;
                this.showTable = true;
              } else {
                Swal.fire("Error", "No chunks found for this file.", "error");
              }
              this.inProcess = false;
              this.cdr.detectChanges();
            },
            error: (err: any) => {
              console.error("Fetch stored preview chunks error:", err);
              Swal.fire("Error", "Failed to load preview chunks table.", "error");
              this.inProcess = false;
              this.cdr.detectChanges();
            },
          });
        } else {
          // dialog closed without completion (e.g. failed/cancelled)
          this.inProcess = false;
          this.cdr.detectChanges();
        }
      });

      // Fire the async request — progress dialog polls KV for updates
      this.aiService.getProcessedChunks(formData).subscribe({
        next: () => { /* async: chunks are retrieved via afterClosed + getPreviewChunks */ },
        error: (err: any) => {
          console.error("Async chunk processing error:", err);
          dialogRef.close();
          Swal.fire("Error", "Failed to process document.", "error");
          this.inProcess = false;
          this.cdr.detectChanges();
        },
      });
    }
  }


  async onProceed() {
    if (!this.chunkData?.length) {
      Swal.fire("Error", "No chunks to save. Please preview again.", "error");
      return;
    }

    if (!this.fileId) {
      this.fileId = crypto.randomUUID();
    }

    const rawText = this.fileToUpload ? await this.fileToUpload.text() : "";

    const payload = {
      fileName: this.fileName || `manual-${new Date().toISOString()}.txt`,
      version: this.model.version || `v${Date.now()}`,
      fileId: this.fileId,
      uploadId: this.uploadId,
      chunkMethod: this.model.strategy || "semantic",
      engineMode: this.model.engineMode || "",
      embeddingModel: "text-embedding-3-small",
      rawText,
      chunks: this.chunkData.map((c: any, idx: number) => ({
        index: typeof c.index === "number" ? c.index : idx,
        content: c.content,
        section: c.section,
        tags: Array.isArray(c.tags) ? c.tags : [],
        topic: c.topic || "general",
      })),
    };

    const dialogRef = this.dialog.open(UploadProgressComponent, {
      disableClose: true,
      width: "600px",
      minWidth: "500px",
      data: { fileName: this.fileName, uploadId: this.uploadId },
    });

    this.aiService.finalizeReviewedChunks(payload).subscribe({
      next: (res: any) => {
        if (dialogRef) dialogRef.close();
        if (res?.ok) {
          Swal.fire("Saved", "Reviewed chunks stored successfully.", "success");
          this.resetForm();
        } else {
          Swal.fire("Error", res?.message || "Failed to save chunks.", "error");
        }
      },
      error: (err: any) => {
        if (dialogRef) dialogRef.close();
        Swal.fire("Error", err?.error?.message || "Failed to save chunks.", "error");
      },
    });
  }

  onBack() {
    this.showForm = true;
    this.showTable = false;
  }

  onCancel() {
    this.resetForm();
  }

  resetForm() {
    this.model = {
      id: "",
      fileType: "text",
      fileId: "",
      strategy: "adaptive",
      engineMode: "offline",
      version: "",
    };
    this.fileName = "";
    this.filePreview = false;
    this.fileToUpload = null;
    this.chunkData = [];
    this.showForm = true;
    this.showTable = false;
    this.inProcess = false;

    this.uploadId = nanoid();
    this.model.fileId = this.uploadId;
    this.fileId = "";
    this.page = 1;
    this.resetCrawlerState();
  }

  getProgressPercentage(progress: any): number {
    if (!progress || !progress.totalBatches) return 0;
    return Math.floor((progress.completedBatches / progress.totalBatches) * 100);
  }

  viewInfo() {}
}
