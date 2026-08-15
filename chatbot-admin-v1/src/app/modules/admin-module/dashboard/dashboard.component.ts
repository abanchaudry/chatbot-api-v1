import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AiKnowledgeService } from "src/app/modules/shared/services/ai-knowledge.service";
import { DashboardStat } from "./dashboard";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  stats: DashboardStat[] = [];
  isLoading: boolean = true;
  constructor(private aiService: AiKnowledgeService, private router: Router) {}

  ngOnInit(): void {
    this.getDashboardStats();
  }

  getDashboardStats() {
    this.isLoading = true;
    this.aiService.getDashboardStats().subscribe((res) => {
      this.stats = [
        {
          title: "Total Files",
          value: res.totalFiles || 0,
          icon: "ri-folder-3-line",
          colorClass: "text-primary",
          borderClass: "border-primary",
          route: "/dashboard/ai-knowledge/all-ai-knowledge",
        },
        {
          title: "Total Chunks",
          value: res.totalChunks || 0,
          icon: "ri-database-2-line",
          colorClass: "text-success",
          borderClass: "border-success",
          route: "/dashboard/chunks/view-all",
        },
        {
          title: "Total Threads",
          value: res.totalThreads || 0,
          icon: "ri-git-branch-line",
          colorClass: "text-warning",
          borderClass: "border-warning",
          route: "/dashboard/threads/all-threads",
        },
        {
          title: "Total Messages",
          value: res.totalMessages || 0,
          icon: "ri-message-3-line",
          colorClass: "text-danger",
          borderClass: "border-danger",
          route: "/dashboard/threads/all-threads",
        },
      ];
      this.isLoading = false;
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
