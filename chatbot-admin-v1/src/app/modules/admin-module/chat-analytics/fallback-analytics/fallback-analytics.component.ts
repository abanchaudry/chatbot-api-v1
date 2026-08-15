import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChatAnalyticsService } from '../../../shared/services/chat-analytics.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import * as moment from 'moment';

export type FallbackCluster = {
  id: string;
  cluster_name: string;
  summary: string;
  query_count: number;
  sample_queries: string[];
  suggested_action: string;
  is_new_category: boolean;
  suggested_category_name?: string;
  frequency_period: string;
  created_at: string;
};

export type FallbackQuery = {
  id: string;
  thread_id: string;
  user_id: string;
  query_text: string;
  reason: string;
  created_at: string;
};

@Component({
  selector: 'app-fallback-analytics',
  templateUrl: './fallback-analytics.component.html',
  styleUrls: ['./fallback-analytics.component.css']
})
export class FallbackAnalyticsComponent implements OnInit, OnDestroy {
  // Main Fallback Data
  fallbackClusters: FallbackCluster[] = [];
  unclusteredCount: number = 0;
  totalClusters: number = 0;
  totalPages: number = 1;
  currentPage: number = 1;
  limit: number = 6;
  newCategorySuggestionsCount: number = 0;
  clusteringSchedule: 'daily' | 'weekly' | 'monthly' = 'weekly';

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  getPagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Loading States
  isLoadingClusters: boolean = false;
  isClusteringLoading: boolean = false;
  clusteringMessage: string = '';

  // Cluster Queries Expansion / Drawer State
  expandedClusterIds: Set<string> = new Set<string>();
  drawerOpen: boolean = false;
  selectedClusterName: string = '';
  selectedClusterQueries: FallbackQuery[] = [];
  isLoadingDrawerQueries: boolean = false;

  // Custom Time Filter & Re-Clustering Control Panel State
  customFilterModalOpen: boolean = false;
  filterTimePreset: 'all' | '24h' | '7d' | '30d' | 'custom' = '24h';
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterMode: 'unclustered_only' | 'recluster_all' = 'unclustered_only';

  previewMatchingCount: number = 0;
  isLoadingPreview: boolean = false;

  private filterPreviewSubject = new Subject<void>();
  private filterPreviewSub?: Subscription;

  constructor(private analyticsService: ChatAnalyticsService) {}

  ngOnInit(): void {
    this.fetchClusters(1);

    this.filterPreviewSub = this.filterPreviewSubject
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.fetchFilterPreviewCount();
      });
  }

  ngOnDestroy(): void {
    if (this.filterPreviewSub) {
      this.filterPreviewSub.unsubscribe();
    }
  }

  // -------------------------------------------------------------
  // Data Fetching & Pagination
  // -------------------------------------------------------------
  fetchClusters(page: number = 1): void {
    this.isLoadingClusters = true;
    this.currentPage = page;

    this.analyticsService.getFallbackClusters(this.limit, page).subscribe({
      next: (res) => {
        this.isLoadingClusters = false;
        if (res && res.ok) {
          this.fallbackClusters = res.clusters || [];
          this.unclusteredCount = res.unclusteredCount || 0;
          this.totalClusters = res.totalClusters || 0;
          this.totalPages = res.totalPages || 1;
          this.currentPage = res.currentPage || page;
          this.newCategorySuggestionsCount = res.newCategorySuggestionsCount || 0;
          this.clusteringSchedule = res.schedule || 'weekly';
        }
      },
      error: (err) => {
        this.isLoadingClusters = false;
        console.error('Failed to load fallback clusters:', err);
      }
    });
  }

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.fetchClusters(newPage);
    }
  }

  updateSchedule(newSchedule: 'daily' | 'weekly' | 'monthly'): void {
    this.clusteringSchedule = newSchedule;
    this.analyticsService.updateFallbackSchedule(newSchedule).subscribe({
      next: () => {
        this.clusteringMessage = `Auto-clustering schedule updated to ${newSchedule.toUpperCase()}.`;
        setTimeout(() => (this.clusteringMessage = ''), 4000);
      },
      error: (err) => console.error('Failed to update schedule:', err)
    });
  }

  // -------------------------------------------------------------
  // Custom Filter Panel & Re-Clustering Controls
  // -------------------------------------------------------------
  toggleCustomFilterModal(): void {
    this.customFilterModalOpen = !this.customFilterModalOpen;
    if (this.customFilterModalOpen) {
      this.selectClusterPreset('24h');
    }
  }

  closeCustomFilterModal(): void {
    this.customFilterModalOpen = false;
  }

  selectClusterPreset(preset: 'all' | '24h' | '7d' | '30d' | 'custom'): void {
    this.filterTimePreset = preset;
    const now = moment();

    if (preset === 'all') {
      this.filterStartDate = '';
      this.filterEndDate = '';
    } else if (preset === '24h') {
      this.filterStartDate = moment().subtract(24, 'hours').format('YYYY-MM-DDTHH:mm');
      this.filterEndDate = now.format('YYYY-MM-DDTHH:mm');
    } else if (preset === '7d') {
      this.filterStartDate = moment().subtract(7, 'days').format('YYYY-MM-DDTHH:mm');
      this.filterEndDate = now.format('YYYY-MM-DDTHH:mm');
    } else if (preset === '30d') {
      this.filterStartDate = moment().subtract(30, 'days').format('YYYY-MM-DDTHH:mm');
      this.filterEndDate = now.format('YYYY-MM-DDTHH:mm');
    } else if (preset === 'custom') {
      if (!this.filterStartDate) {
        this.filterStartDate = moment().subtract(7, 'days').format('YYYY-MM-DDTHH:mm');
      }
      if (!this.filterEndDate) {
        this.filterEndDate = now.format('YYYY-MM-DDTHH:mm');
      }
    }
    this.updateFilterPreview();
  }

  updateFilterPreview(): void {
    this.isLoadingPreview = true;
    this.filterPreviewSubject.next();
  }

  private fetchFilterPreviewCount(): void {
    const opts = {
      startDate: this.filterStartDate ? new Date(this.filterStartDate).toISOString() : undefined,
      endDate: this.filterEndDate ? new Date(this.filterEndDate).toISOString() : undefined,
      unclusteredOnly: this.filterMode === 'unclustered_only'
    };

    this.analyticsService.getFallbackQueryCount(opts).subscribe({
      next: (res) => {
        this.isLoadingPreview = false;
        this.previewMatchingCount = res.count || 0;
      },
      error: () => {
        this.isLoadingPreview = false;
        this.previewMatchingCount = 0;
      }
    });
  }

  executeCustomClustering(): void {
    this.isClusteringLoading = true;
    this.clusteringMessage = 'Running custom AI clustering on selected fallback queries...';

    const payload = {
      period: 'manual',
      startDate: this.filterStartDate ? new Date(this.filterStartDate).toISOString() : undefined,
      endDate: this.filterEndDate ? new Date(this.filterEndDate).toISOString() : undefined,
      recluster: this.filterMode === 'recluster_all',
      unclusteredOnly: this.filterMode === 'unclustered_only'
    };

    this.analyticsService.runFallbackClustering(payload).subscribe({
      next: (res) => {
        this.isClusteringLoading = false;
        this.clusteringMessage = res.message || 'Clustering process completed successfully!';
        this.fetchClusters(1);
        setTimeout(() => (this.clusteringMessage = ''), 6000);
      },
      error: (err) => {
        this.isClusteringLoading = false;
        this.clusteringMessage = `Clustering failed: ${err.message || 'Server error'}`;
      }
    });
  }

  triggerManualClustering(period: 'daily' | 'weekly' | 'monthly' | 'manual' = 'manual'): void {
    this.isClusteringLoading = true;
    this.clusteringMessage = 'Analyzing unmapped fallback queries with LLM...';

    this.analyticsService.runFallbackClustering({ period, unclusteredOnly: true }).subscribe({
      next: (res) => {
        this.isClusteringLoading = false;
        this.clusteringMessage = res.message || 'Clustering completed!';
        this.fetchClusters(1);
        setTimeout(() => (this.clusteringMessage = ''), 6000);
      },
      error: (err) => {
        this.isClusteringLoading = false;
        this.clusteringMessage = `Clustering failed: ${err.message || 'Server error'}`;
      }
    });
  }

  // -------------------------------------------------------------
  // Inline Query Expansion & Side Drawer Inspection
  // -------------------------------------------------------------
  toggleQueryExpansion(clusterId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.expandedClusterIds.has(clusterId)) {
      this.expandedClusterIds.delete(clusterId);
    } else {
      this.expandedClusterIds.add(clusterId);
    }
  }

  isClusterExpanded(clusterId: string): boolean {
    return this.expandedClusterIds.has(clusterId);
  }

  openClusterDrawer(cluster: FallbackCluster): void {
    this.selectedClusterName = cluster.cluster_name;
    this.drawerOpen = true;
    this.isLoadingDrawerQueries = true;
    this.selectedClusterQueries = [];

    this.analyticsService.getClusterQueries(cluster.id).subscribe({
      next: (res) => {
        this.isLoadingDrawerQueries = false;
        if (res && res.ok) {
          this.selectedClusterQueries = res.queries || [];
        }
      },
      error: (err) => {
        this.isLoadingDrawerQueries = false;
        console.error('Failed to load cluster queries:', err);
      }
    });
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }
}
