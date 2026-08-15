import { Component, OnInit } from "@angular/core";
import { ThreadsService } from "src/app/modules/shared/services/thread.service";

@Component({
  selector: "app-all-threads",
  templateUrl: "./all-threads.component.html",
  styleUrls: ["./all-threads.component.css"],
})
export class AllThreadsComponent implements OnInit {
  threads = [];
  page = 1;
  entries = 10;
  itemPerPage = 10;
  searchText;
  index: number = 0;
  perPage: number = 10;
  isLoading: boolean = true;
  constructor(private threadsService: ThreadsService) {}

  ngOnInit(): void {
    this.getAllThreads();
  }

  getAllThreads() {
    this.isLoading = true;
    this.threadsService.getAllThreads().subscribe((res) => {
      this.threads = res.data.sort((a, b) => b.id - a.id);
      this.isLoading = false;
    });
  }
}
