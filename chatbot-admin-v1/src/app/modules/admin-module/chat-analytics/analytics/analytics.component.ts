import { Component, HostListener, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { ChatModelComponent } from 'src/app/modules/shared/popup/chat-model/chat-model.component';
import { ChatAnalyticsService, Granularity } from '../../../shared/services/chat-analytics.service'; 

interface FilterState {
  startDate: string | null;
  endDate: string | null;
  preset: string | null;
  aggregation: 'Daily' | 'Weekly' | 'Monthly';
}

interface AnalyticsCard {
  label: string;
  value: string;
  subLabel?: string;
  icon: string;
  iconStyle: string;
}

interface DailySession {
  date: string;        
  sessions: number;
  messages?: number;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit, AfterViewInit {

  isFixed: boolean = false;
  fixedWidth: number = 0;
  fixedLeft: number = 0;
  toolbarHeight: number = 0;
  threshold: number = 0;

  @ViewChild('filterToolbar') filterToolbar!: ElementRef;
  @ViewChild('toolbarPlaceholder') toolbarPlaceholder!: ElementRef;

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.filterToolbar?.nativeElement) return;
      const rect = this.filterToolbar.nativeElement.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      this.threshold = rect.top + scrollTop;
      this.fixedWidth = rect.width;
      this.fixedLeft = rect.left;
      this.toolbarHeight = rect.height;
    }, 100);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollY = window.scrollY;
    if (!this.filterToolbar?.nativeElement) return;

    if (scrollY >= this.threshold) {
      if (!this.isFixed) {
        const rect = this.filterToolbar.nativeElement.getBoundingClientRect();
        this.fixedWidth = rect.width;
        this.fixedLeft = rect.left;
        this.toolbarHeight = rect.height;
        this.isFixed = true;
      }
    } else {
      this.isFixed = false;
    }
  }

  /* ---------------- UI State ---------------- */
  analyticsCards: AnalyticsCard[] = [
    { label: 'Total Sessions', value: '-', icon: 'ri-user-2-line', iconStyle: 'icon-primary' },
    { label: 'Avg. Sessions / Day', value: '-', icon: 'ri-bar-chart-line', iconStyle: 'icon-success' },
  
    { label: 'Total Messages', value: '-', icon: 'ri-chat-3-line', iconStyle: 'icon-info' }
  ];

  dailySessions: DailySession[] = [];

  // daterangepicker
  selected: any;
  alwaysShowCalendars: boolean = true;

  ranges: any = {
    'Today': [moment(), moment()],
    'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
    'Last 7 Days': [moment().subtract(6, 'days'), moment()],
    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
    'This Month': [moment().startOf('month'), moment().endOf('month')],
    'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
  };

  drawerOpen: boolean = false;
  selectedThreads: any[] = [];
  selectedDate: string = '';

  aggregationOptions: ('Daily' | 'Weekly' | 'Monthly')[] = ['Daily', 'Weekly', 'Monthly'];
  presets = [
    { label: 'Today', value: 'today' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '3M', value: '3m' }
  ];

  page = 1;
  itemPerPage = 10;
  searchText: string = '';

  isLoadingStats = false;
  isLoadingBreakdown = false;
  isLoadingThreads = false;

  applied: FilterState = {
    startDate: null,
    endDate: null,
    preset: '30d',
    aggregation: 'Daily'
  };

  draft: FilterState = { ...this.applied };

  // Fallback Intelligence state
  fallbackClusters: any[] = [];
  unclusteredCount: number = 0;
  newCategoryCount: number = 0;
  clusteringSchedule: string = 'weekly';
  isClusteringLoading: boolean = false;
  isClustersLoading: boolean = false;
  clusteringMessage: string = '';

  constructor(
    private dialog: MatDialog,
    private chatAnalyticsService: ChatAnalyticsService
  ) {}

  ngOnInit(): void {
    // Default: Last 30 days
    this.selectPreset('30d');
    this.applied = { ...this.draft };
    this.loadFallbackClusters();

    this.selected = {
      startDate: moment(this.applied.startDate, 'YYYY-MM-DD'),
      endDate: moment(this.applied.endDate, 'YYYY-MM-DD'),
      chosenLabel: 'Last 30 Days'
    };

    this.loadAll();
  }

  loadFallbackClusters() {
    this.isClustersLoading = true;
    this.chatAnalyticsService.getFallbackClusters().subscribe({
      next: (res) => {
        if (res?.ok) {
          this.fallbackClusters = res.clusters || [];
          this.unclusteredCount = res.unclusteredCount || 0;
          this.newCategoryCount = res.newCategorySuggestionsCount || 0;
          this.clusteringSchedule = res.schedule || 'weekly';
        }
      },
      error: () => {},
      complete: () => (this.isClustersLoading = false)
    });
  }

  triggerManualClustering(period: 'daily' | 'weekly' | 'monthly' | 'manual' = 'manual') {
    this.isClusteringLoading = true;
    this.clusteringMessage = 'AI is clustering fallback queries into topic groups...';
    this.chatAnalyticsService.runFallbackClustering(period).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.clusteringMessage = res.message || 'Clustering completed successfully!';
          this.loadFallbackClusters();
        } else {
          this.clusteringMessage = 'Clustering failed: ' + (res?.message || 'Unknown error');
        }
      },
      error: (err) => {
        this.clusteringMessage = 'Clustering error: ' + (err?.message || 'Server error');
      },
      complete: () => {
        this.isClusteringLoading = false;
        setTimeout(() => (this.clusteringMessage = ''), 5000);
      }
    });
  }

  updateSchedule(newSchedule: any) {
    const validSchedule = newSchedule as 'daily' | 'weekly' | 'monthly';
    this.chatAnalyticsService.updateFallbackSchedule(validSchedule).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.clusteringSchedule = validSchedule;
          this.clusteringMessage = `Auto-clustering schedule updated to ${validSchedule.toUpperCase()}`;
          setTimeout(() => (this.clusteringMessage = ''), 4000);
        }
      },
      error: (err) => {
        console.error("Failed to update schedule:", err);
      }
    });
  }

  // Custom Filter & Re-Clustering Controls
  customFilterModalOpen: boolean = false;
  filterTimePreset: 'all' | '24h' | '7d' | '30d' | 'custom' = 'all';
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterMode: 'unclustered_only' | 'recluster_all' = 'unclustered_only';
  previewMatchingCount: number = 0;
  isLoadingPreview: boolean = false;

  openCustomFilterModal() {
    this.customFilterModalOpen = true;
    this.updateFilterPreview();
  }

  closeCustomFilterModal() {
    this.customFilterModalOpen = false;
  }

  selectClusterPreset(preset: 'all' | '24h' | '7d' | '30d' | 'custom') {
    this.filterTimePreset = preset;
    const now = new Date();

    if (preset === '24h') {
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      this.filterStartDate = past.toISOString().slice(0, 16);
      this.filterEndDate = now.toISOString().slice(0, 16);
    } else if (preset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      this.filterStartDate = past.toISOString().slice(0, 16);
      this.filterEndDate = now.toISOString().slice(0, 16);
    } else if (preset === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.filterStartDate = past.toISOString().slice(0, 16);
      this.filterEndDate = now.toISOString().slice(0, 16);
    } else if (preset === 'all') {
      this.filterStartDate = '';
      this.filterEndDate = '';
    }
    this.updateFilterPreview();
  }

  updateFilterPreview() {
    this.isLoadingPreview = true;
    const filterOpts: any = {
      unclusteredOnly: this.filterMode === 'unclustered_only',
    };
    if (this.filterStartDate) filterOpts.startDate = this.filterStartDate;
    if (this.filterEndDate) filterOpts.endDate = this.filterEndDate;

    this.chatAnalyticsService.getFallbackQueryCount(filterOpts).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.previewMatchingCount = res.count || 0;
        }
      },
      error: () => (this.previewMatchingCount = 0),
      complete: () => (this.isLoadingPreview = false)
    });
  }

  executeCustomClustering() {
    const payload: any = {
      period: 'manual',
      recluster: this.filterMode === 'recluster_all',
      unclusteredOnly: this.filterMode === 'unclustered_only',
    };
    if (this.filterStartDate) payload.startDate = this.filterStartDate;
    if (this.filterEndDate) payload.endDate = this.filterEndDate;

    this.closeCustomFilterModal();
    this.isClusteringLoading = true;
    this.clusteringMessage = `Running custom clustering (${this.filterMode === 'recluster_all' ? 'Re-Clustering All' : 'Unclustered Only'})...`;

    this.chatAnalyticsService.runFallbackClustering(payload).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.clusteringMessage = res.message || 'Clustering completed!';
          this.loadFallbackClusters();
        } else {
          this.clusteringMessage = 'Clustering failed: ' + (res?.message || 'Unknown error');
        }
      },
      error: (err) => {
        this.clusteringMessage = 'Clustering error: ' + (err?.message || 'Server error');
      },
      complete: () => {
        this.isClusteringLoading = false;
        setTimeout(() => (this.clusteringMessage = ''), 5000);
      }
    });
  }

  // Inline cluster query expansion
  expandedClusterIds: Set<string> = new Set();
  clusterQueriesMap: { [clusterId: string]: any[] } = {};
  loadingClusterQueriesMap: { [clusterId: string]: boolean } = {};

  isClusterExpanded(clusterId: string): boolean {
    return this.expandedClusterIds.has(clusterId);
  }

  toggleExpandCluster(cluster: any) {
    if (this.expandedClusterIds.has(cluster.id)) {
      this.expandedClusterIds.delete(cluster.id);
    } else {
      this.expandedClusterIds.add(cluster.id);
      if (!this.clusterQueriesMap[cluster.id]) {
        this.loadingClusterQueriesMap[cluster.id] = true;
        this.chatAnalyticsService.getClusterQueries(cluster.id).subscribe({
          next: (res) => {
            if (res?.ok) {
              this.clusterQueriesMap[cluster.id] = res.queries || [];
            }
          },
          error: () => {},
          complete: () => {
            this.loadingClusterQueriesMap[cluster.id] = false;
          }
        });
      }
    }
  }

  // Side Drawer state for Fallback Queries
  clusterDrawerOpen: boolean = false;
  selectedClusterName: string = '';
  selectedClusterQueries: any[] = [];
  isLoadingClusterDrawer: boolean = false;

  openClusterDrawer(cluster: any) {
    this.selectedClusterName = cluster.cluster_name;
    this.clusterDrawerOpen = true;
    this.selectedClusterQueries = [];
    this.isLoadingClusterDrawer = true;

    this.chatAnalyticsService.getClusterQueries(cluster.id).subscribe({
      next: (res) => {
        if (res?.ok) {
          this.selectedClusterQueries = res.queries || [];
        }
      },
      error: () => {},
      complete: () => (this.isLoadingClusterDrawer = false)
    });
  }

  closeClusterDrawer() {
    this.clusterDrawerOpen = false;
    this.selectedClusterQueries = [];
    this.selectedClusterName = '';
  }

  /* ---------------- Helpers ---------------- */

  private toGranularity(agg: FilterState['aggregation']): Granularity {
    return agg === 'Weekly' ? 'weekly' : agg === 'Monthly' ? 'monthly' : 'daily';
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  get canApply(): boolean {
    return JSON.stringify(this.draft) !== JSON.stringify(this.applied);
  }

  formatRange(start: moment.Moment, end: moment.Moment): string {
    if (start.isSame(end, 'day')) return start.format('DD MMM YYYY');
    if (start.isSame(end, 'month')) return `${start.format('DD')} – ${end.format('DD MMM YYYY')}`;
    return `${start.format('DD MMM YYYY')} → ${end.format('DD MMM YYYY')}`;
  }

  /* ---------------- Filter Events ---------------- */

  selectPreset(value: string) {
    this.draft.preset = value;
    const end = new Date();
    let start = new Date();

    if (value === 'today') {
      start = new Date();
    } else if (value === '7d') {
      start.setDate(end.getDate() - 6); 
    } else if (value === '30d') {
      start.setDate(end.getDate() - 29); 
    } else if (value === '3m') {
      start.setDate(end.getDate() - 90);
    }

    this.draft.startDate = this.formatDate(start);
    this.draft.endDate = this.formatDate(end);
  }

  onCustomDateChange() {
    this.draft.preset = null;
  }

  onDateSelected(value: any) {
    this.selected = value;
    this.draft.startDate = value.startDate.format('YYYY-MM-DD');
    this.draft.endDate = value.endDate.format('YYYY-MM-DD');
    this.draft.preset = value.chosenLabel || null;
    this.applyFilters();
  }

  clearDate() {
    this.selected = null;
    this.draft.startDate = null;
    this.draft.endDate = null;
    this.draft.preset = null;


    this.selectPreset('30d');
    this.applyFilters();
  }

  applyFilters() {
    this.applied = { ...this.draft };
    this.page = 1;
    this.drawerOpen = false;
    this.selectedThreads = [];
    this.selectedDate = '';

    this.loadAll();
  }

  /* ---------------- Data Loading ---------------- */

  private loadAll() {
    const from = this.applied.startDate || moment().subtract(29, 'days').format('YYYY-MM-DD');
    const to = this.applied.endDate || moment().format('YYYY-MM-DD');
    const granularity = this.toGranularity(this.applied.aggregation);

    this.loadStats(from, to, granularity);
    this.loadDailyBreakdown(from, to);
  }

  private loadStats(from: string, to: string, granularity: Granularity) {
    this.isLoadingStats = true;

    this.chatAnalyticsService.getStats({ from, to, granularity }).subscribe({
      next: (res) => {
        if (!res?.ok) return;

        const totals:any = res.totals;

        this.analyticsCards = [
          {
            label: 'Total Sessions',
            value: this.formatNumber(totals.total_sessions),
            icon: 'ri-user-2-line',
            iconStyle: 'icon-primary'
          },
          {
            label: 'Avg. Sessions / Day',
            value: this.formatNumber(totals.avg_sessions_per_day),
            icon: 'ri-bar-chart-line',
            iconStyle: 'icon-success'
          },
      
          {
            label: 'Total Messages',
            value: this.compactNumber(totals.total_messages),
            icon: 'ri-chat-3-line',
            iconStyle: 'icon-info'
          }
        ];
      },
      error: () => {},
      complete: () => (this.isLoadingStats = false)
    });
  }

  private loadDailyBreakdown(from: string, to: string) {
    this.isLoadingBreakdown = true;

    this.chatAnalyticsService.getDailyBreakdown({ from, to, q: this.searchText || undefined }).subscribe({
      next: (res) => {
        if (!res?.ok) return;

        this.dailySessions = (res.rows || []).map(r => ({
          date: r.date,
          sessions: r.sessions,
          messages: r.messages
        }));
      },
      error: () => {},
      complete: () => (this.isLoadingBreakdown = false)
    });
  }

  private formatNumber(n: any): string {
    const num = Number(n || 0);
    return num.toLocaleString();
  }

  private compactNumber(n: any): string {
    const num = Number(n || 0);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(num);
  }

  /* ---------------- Drawer Flow ---------------- */

  viewThreads(session: DailySession) {
    this.selectedDate = session.date;
    this.drawerOpen = true;
    this.selectedThreads = [];
    this.isLoadingThreads = true;

    this.chatAnalyticsService.getThreadsByDate(session.date).subscribe({
      next: (res) => {
        if (!res?.ok) return;

        // Map API -> your drawer expected fields
        this.selectedThreads = (res.threads || []).map(t => ({
          id: t.thread_id,
          user: t.user_id,
          messages: t.message_count,
          time: moment(t.started_at).format('h:mm A'),
          answered: t.answered_count
        }));
      },
      error: () => {},
      complete: () => (this.isLoadingThreads = false)
    });
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.selectedThreads = [];
    this.selectedDate = '';
  }

  openChatModel(thread: any) {

    this.dialog.open(ChatModelComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        threadId: thread?.id,
        userId: thread?.user,
        date: this.selectedDate
      }
    });
  }
}
