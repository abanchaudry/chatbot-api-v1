import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from "@angular/core";
import { NgForm } from "@angular/forms";
import Swal from "sweetalert2";
import { filesService } from "../../shared/services/files.service";
import { AssistantService } from "../../shared/services/assistant.service";
import { Assistant } from "../assistant/Model/assistant";
@Component({
  selector: "app-file-upload",
  templateUrl: "./file-upload.component.html",
  styleUrls: ["./file-upload.component.css"],
})
export class FileUploadComponent implements OnInit {
  @ViewChild("fileInput") fileInput: ElementRef;
  filePreview: string | null = null;
  fileName: string = "";
  selectedFile: File | null = null;
  fileSize: string = "";
  fileFormat: string = "";

  allAssistants = [];
  selectedAssistantId: string = "";

  selectedStoreId: string;
  assistant = new Assistant();
  vectorStore: any;
  dbFiles: any;
  files: any;
  selectedAssistant: boolean = false;

  inProcess: boolean = false;

  allFiles = [];
  constructor(
    private fileService: filesService,
    private cdr: ChangeDetectorRef,
    private assistantService: AssistantService
  ) {}

  ngOnInit(): void {
    this.getAllAssistants();
  }

  trackByFileId(index: number, item: any): string {
    return item?.id || item?.file_id || String(index);
  }

  getAllAssistants() {
    this.assistantService.getAllAssistant().subscribe((res) => {
      this.selectedAssistantId = "asst_eKIBGtoj9vAv3QgWrQiFwPmA";
      this.allAssistants = res.data.filter(
        (data) => data.id == "asst_eKIBGtoj9vAv3QgWrQiFwPmA"
      );
      this.onAssistantSelect();
    });
  }

  onAssistantSelect() {
    if (this.selectedAssistantId) {
      this.assistantService
        .getAssistant(this.selectedAssistantId)
        .subscribe((res) => {
          this.assistant = {
            ...this.assistant,
            assistantId: res.assistant.id,
            description: res.assistant.description,
            instantsDescription: res.assistant.instructions,
            model: res.assistant.model,
            storeId:
              res.assistant.tool_resources?.file_search
                ?.vector_store_ids?.[0] || "",
          };

          this.selectedStoreId =
            res.assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
            "";
          this.files =
            res.assistant.tools?.find((tool) => tool.type === "file_search")
              ?.file_search?.ranking_options || [];
          if (this.selectedStoreId) {
            this.getVectorStoreFiles(this.selectedStoreId);
          }

          this.cdr.detectChanges();
        });
    }
  }
  getVectorStoreFiles(vectorStoreId: string) {
    this.assistantService
      .getVectorStoreAndFiles(vectorStoreId)
      .subscribe((res) => {
        this.vectorStore = res?.vectorStore || null;
        this.files = res?.files || [];
        this.dbFiles = res?.dbFiles || [];
        this.allFiles = this.mergeFilesData(this.files, this.dbFiles);
      });
  }

  mergeFilesData(vectorStoreData: any, dbFilesData: any) {
    const mergedData = dbFilesData.map((dbFile: any) => {
      const fileFromVectorStore = vectorStoreData.find(
        (file: any) => file.id === dbFile.file_id
      );
      return {
        file_id: dbFile.file_id,
        file_name: dbFile.file_name,
        file_size: this.formatBytes(dbFile.file_size),
        status: fileFromVectorStore.status
          ? fileFromVectorStore.status
          : "Unknown",
        created_at: dbFile.created_at,
        usage_bytes: fileFromVectorStore
          ? fileFromVectorStore.usage_bytes
          : null,
        chunking_strategy: fileFromVectorStore
          ? fileFromVectorStore.chunking_strategy
          : null,
        file_path: dbFile.file_path,
      };
    });

    return mergedData;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  }

  onSubmit(form: NgForm): void {
    if (form.valid && this.filePreview) {
      Swal.fire({
        title: "Are you sure?",
        text: `You are about to upload the file: ${this.fileName}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, upload it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          this.uploadFile();
        } else {
          console.log("Upload canceled");
        }
      });
    }
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile = file;
      this.filePreview = URL.createObjectURL(file);
      this.fileName = file.name;
    } else {
      this.onCancel();
    }
  }

  onCancel(): void {
    this.filePreview = null;
    this.fileName = "";
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }
  uploadFile(): void {
    if (this.selectedFile) {
      this.inProcess = true;

      const fileName = this.fileName;
      const review = " uploaded file";
      const uploadId = this.selectedAssistantId || "";

      this.fileService
        .uploadFile(this.selectedFile, fileName, uploadId)
        .subscribe({
          next: (res) => {
            console.log("Upload successful:", res.url);
            this.inProcess = false;
            this.getVectorStoreFiles(this.selectedStoreId);
            this.onCancel();
            Swal.fire("Uploaded!", "Your file has been uploaded.", "success");
          },
          error: (err) => {
            console.error("Error during upload:", err);
            Swal.fire("Error", "File upload failed.", "error");
            this.inProcess = false;
          },
        });
    } else {
      console.warn("No file selected for upload.");
    }
  }

  getFormatedDate(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    const shortDate = date.toLocaleDateString("en-US");

    return shortDate;
  }

  confirmDeleteFile(file: any): void {
    Swal.fire({
      title: "Are you sure you want to delete this file?",
      text: `You are about to delete the file: ${file.file_name}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteFile(file);
      } else {
        console.log("File deletion canceled");
      }
    });
  }

  deleteFile(file): void {
    this.fileService
      .deleteFile(this.selectedStoreId, file.file_id)
      .subscribe((res) => {
        this.getVectorStoreFiles(this.selectedStoreId);
      });
  }

  downloadFile(filePath: string) {
    const path = `https://static.nvcontractorsboard.com/${filePath}`;

    const anchor = document.createElement("a");
    anchor.href = path;
    anchor.target = "_blank";
    anchor.download = filePath;
    anchor.click();
    anchor.remove();
  }
}
