import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AiKnowledgeService } from '../../services/ai-knowledge.service';
import Swal from 'sweetalert2';

type UploadProgress = {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'invalid';
  totalBatches?: number;
  completedBatches?: number;
  steps?: string[];
  percent?: number; // optional server-side percent
};

@Component({
  selector: 'app-upload-progress',
  templateUrl: './upload-progress.component.html',
  styleUrls: ['./upload-progress.component.css'],
})
export class UploadProgressComponent implements OnInit, OnDestroy {
  uploadProgress: UploadProgress | null = null;
  private timer?: any;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { fileName: string; uploadId: string; startAfterDelay?: number },
    private dialogRef: MatDialogRef<UploadProgressComponent>,
    private aiService: AiKnowledgeService
  ) {}

  ngOnInit(): void {
    const delay = this.data.startAfterDelay ?? 500;
    setTimeout(() => {
      this.pollOnce();                          // immediate first read
      this.timer = setInterval(() => this.pollOnce(), 2000);
    }, delay);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private pollOnce(): void {
    const { uploadId } = this.data;
    if (!uploadId) return;

    this.aiService.progress(uploadId).subscribe({
      next: (res: UploadProgress) => {
        this.uploadProgress = res;

        if (res.status === 'invalid') {
          Swal.fire('Invalid Upload ID', 'This upload session may have expired or is invalid.', 'error');
          this.closePopup();
          return;
        }

        if (res.status === 'completed') {
          if (this.timer) clearInterval(this.timer);
          setTimeout(() => {
            this.dialogRef.close({ completed: true, uploadId });
          }, 300);
          return;
        }

        if (res.status === 'failed') {
          if (this.timer) clearInterval(this.timer);
          this.closePopup();
        }
      },
      error: (err) => {
        console.warn('Progress poll error:', err?.message || err);
      },
    });
  }

  getProgressPercentage(p: UploadProgress | null): number {
    if (!p) return 0;
    if (typeof p.percent === 'number') return Math.max(0, Math.min(100, Math.round(p.percent)));
    const total = p.totalBatches ?? 0;
    const done = p.completedBatches ?? 0;
    if (!total) return p.status === 'completed' ? 100 : 0;
    const value = Math.floor((done / total) * 100);
    return Math.max(0, Math.min(100, value));
  }

  formatStep(step: string): string {
    return step
      .replace('✂️', "✂️ <strong style='color:#d9534f'>Cut</strong>")
      .replace('✅', "✅ <strong style='color:green'>Done</strong>")
      .replace('➡️', "➡️ <strong style='color:#0275d8'>Start</strong>")
      .replace('🟢', "🟢 <strong style='color:#5cb85c'>Init</strong>");
  }

  closePopup(): void {
    if (this.timer) clearInterval(this.timer);
    this.dialogRef.close();
  }
}
