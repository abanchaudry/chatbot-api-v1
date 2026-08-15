import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services';

export type Granularity = 'daily' | 'weekly' | 'monthly';

export type AnalyticsStatsResponse = {
  ok: boolean;
  from: string;
  to: string;
  granularity: Granularity;
  totals: {
    sessions: number;
    avg_sessions_per_day: number;
    busiest_day_sessions: number;
    busiest_day_date: string | null;
    messages: number;
  };
  series: Array<{
    date: string;
    sessions: number;
    messages: number;
  }>;
};

export type DailyBreakdownRow = {
  date: string;
  sessions: number;
  messages: number;
};

export type DailyBreakdownResponse = {
  ok: boolean;
  from: string;
  to: string;
  granularity: 'daily';
  rows: DailyBreakdownRow[];
};

export type ThreadRow = {
  thread_id: string;
  user_id: string;
  started_at: string;
  message_count: number;
  answered_count: number;
};

export type ThreadsByDateResponse = {
  ok: boolean;
  date: string;
  total_threads: number;
  threads: ThreadRow[];
};

export type MessageRow = {
  id: number;
  thread_id: string;
  user_id: string;
  question: string;
  answer: string;
  context: string;
  token_usage: number;
  is_answered: number;
  created_at: string;
};

export type ThreadMessagesResponse = {
  ok: boolean;
  thread_id: string;
  messages: MessageRow[];
};

@Injectable({ providedIn: 'root' })
export class ChatAnalyticsService {
  constructor(private _api: ApiService) {}

  private handleError(label: string) {
    return (error: any) => {
      console.error(`${label} failed:`, error);
      return throwError(() => error);
    };
  }

  getStats(params?: {
    from?: string;
    to?: string;
    granularity?: Granularity;
  }): Observable<AnalyticsStatsResponse> {
    let p = new HttpParams();
    if (params?.from) p = p.set('from', params.from);
    if (params?.to) p = p.set('to', params.to);
    if (params?.granularity) p = p.set('granularity', params.granularity);

    return this._api.get('analytics/stats', p).pipe(
      map((res: any) => res as AnalyticsStatsResponse),
      catchError(this.handleError('Fetch analytics stats'))
    );
  }

  getDailyBreakdown(params?: {
    from?: string;
    to?: string;
    q?: string;
  }): Observable<DailyBreakdownResponse> {
    let p = new HttpParams();
    if (params?.from) p = p.set('from', params.from);
    if (params?.to) p = p.set('to', params.to);
    if (params?.q) p = p.set('q', params.q);

    return this._api.get('analytics/daily-breakdown', p).pipe(
      map((res: any) => res as DailyBreakdownResponse),
      catchError(this.handleError('Fetch daily breakdown'))
    );
  }

  getThreadsByDate(date: string): Observable<ThreadsByDateResponse> {
    const p = new HttpParams().set('date', date);
    return this._api.get('analytics/threads', p).pipe(
      map((res: any) => res as ThreadsByDateResponse),
      catchError(this.handleError(`Fetch threads for date=${date}`))
    );
  }

  getThreadMessages(threadId: string): Observable<ThreadMessagesResponse> {
    return this._api
      .get(`analytics/threads/${encodeURIComponent(threadId)}/messages`)
      .pipe(
        map((res: any) => res as ThreadMessagesResponse),
        catchError(this.handleError(`Fetch messages for threadId=${threadId}`))
      );
  }

  getFallbackClusters(limit: number = 6, page: number = 1): Observable<{
    ok: boolean;
    unclusteredCount: number;
    totalClusters: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    newCategorySuggestionsCount: number;
    schedule: 'daily' | 'weekly' | 'monthly';
    clusters: Array<{
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
    }>;
  }> {
    const p = new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());
    return this._api.get('analytics/fallback-clusters', p).pipe(
      map((res: any) => res),
      catchError(this.handleError('Fetch fallback clusters'))
    );
  }

  runFallbackClustering(payload: any = { period: 'manual' }): Observable<{
    ok: boolean;
    success: boolean;
    message: string;
    clustersCount: number;
    queriesProcessed: number;
  }> {
    const body = typeof payload === 'string' ? { period: payload } : payload;
    return this._api.post('analytics/run-clustering', body).pipe(
      map((res: any) => res),
      catchError(this.handleError('Run fallback clustering'))
    );
  }

  getFallbackQueryCount(filterOpts: { startDate?: string; endDate?: string; unclusteredOnly?: boolean } = {}): Observable<{
    ok: boolean;
    count: number;
  }> {
    return this._api.post('analytics/fallback-query-count', filterOpts).pipe(
      map((res: any) => res),
      catchError(this.handleError('Get fallback query count'))
    );
  }

  updateFallbackSchedule(schedule: 'daily' | 'weekly' | 'monthly'): Observable<{ ok: boolean; message?: string }> {
    return this._api.post('settings', { fallback_schedule: schedule }).pipe(
      map((res: any) => res),
      catchError(this.handleError('Update fallback schedule'))
    );
  }

  getClusterQueries(clusterId: string): Observable<{
    ok: boolean;
    clusterId: string;
    total: number;
    queries: Array<{
      id: string;
      thread_id: string;
      user_id: string;
      query_text: string;
      reason: string;
      created_at: string;
    }>;
  }> {
    return this._api.get(`analytics/fallback-clusters/${encodeURIComponent(clusterId)}/queries`).pipe(
      map((res: any) => res),
      catchError(this.handleError(`Fetch queries for clusterId=${clusterId}`))
    );
  }
}
