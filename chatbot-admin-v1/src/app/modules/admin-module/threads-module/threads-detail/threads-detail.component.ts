import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ThreadsService } from "src/app/modules/shared/services/thread.service";
import { jsPDF } from "jspdf";

@Component({
  selector: "app-threads-detail",
  templateUrl: "./threads-detail.component.html",
  styleUrls: ["./threads-detail.component.css"],
})
export class ThreadsDetailComponent implements OnInit {
  threadId: string;
  conversation = [];
  isLoading: boolean = true;
  constructor(
    private threadService: ThreadsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.threadId = params.get("id");
      this.getThreadDetail(this.threadId);
    });
  }

  getThreadDetail(threadId: string) {
    this.isLoading = true;
    this.threadService.getThreadDetail(threadId).subscribe((res) => {
      this.conversation = res.data;
      this.isLoading = false;
    });
  }
  iconClass = "ri-download-line";
  isDownloading = false;
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

    const fileName = `${this.threadId}-conversation.pdf`;
    doc.save(fileName);

    setTimeout(() => {
      this.iconClass = "ri-check-line"; // Success icon
      setTimeout(() => {
        this.iconClass = "ri-download-line"; // Reset after showing success
        this.isDownloading = false;
      }, 2000);
    }, 500); // Short delay to simulate download
  }
}
