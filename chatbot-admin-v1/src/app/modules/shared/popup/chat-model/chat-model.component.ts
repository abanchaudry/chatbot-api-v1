import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { jsPDF } from "jspdf";
import { ThreadsService } from "../../services/thread.service";

@Component({
  selector: "app-chat-model",
  templateUrl: "./chat-model.component.html",
  styleUrls: ["./chat-model.component.css"],
})
export class ChatModelComponent implements OnInit {
  threadId: string;
  conversation = [];
  isLoading = true;

  iconClass = "ri-download-line";
  isDownloading = false;

  constructor(
    public dialogRef: MatDialogRef<ChatModelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private threadService: ThreadsService
  ) {}

  ngOnInit(): void {
    this.threadId = this.data?.threadId;
    if (this.threadId) {
      this.getThreadDetail(this.threadId);
    }
  }

  getThreadDetail(threadId: string) {
    this.isLoading = true;
    this.threadService.getThreadDetail(threadId).subscribe((res) => {
      this.conversation = res.data || [];
      this.isLoading = false;
    });
  }

  close() {
    this.dialogRef.close();
  }

  downloadPDF() {
    this.isDownloading = true;
    this.iconClass = "ri-loader-4-line remix-spin";

    const doc = new jsPDF();
    let y = 10;
    const lineHeight = 10;
    const pageHeight = 280;

    this.conversation.forEach((item, index) => {
      const questionText = `Q${index + 1}: ${item.question}`;
      const answerText = item.answer;

      doc.setFont("Helvetica", "bold");
      doc.splitTextToSize(questionText, 180).forEach(line => {
        if (y > pageHeight) { doc.addPage(); y = 10; }
        doc.text(line, 10, y); y += lineHeight;
      });

      doc.setFont("Helvetica", "normal");
      doc.splitTextToSize(answerText, 180).forEach(line => {
        if (y > pageHeight) { doc.addPage(); y = 10; }
        doc.text(line, 10, y); y += lineHeight;
      });

      y += lineHeight;
    });

    doc.save(`${this.threadId}-conversation.pdf`);

    setTimeout(() => {
      this.iconClass = "ri-check-line";
      setTimeout(() => {
        this.iconClass = "ri-download-line";
        this.isDownloading = false;
      }, 2000);
    }, 500);
  }
}
