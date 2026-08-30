// chatbot-admin-v1/src/app/modules/core/services/super-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ClientRecord {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  billing_mode: 'platform' | 'byok';
  public_token: string;
  status: 'active' | 'suspended';
  created_at?: string;
  updated_at?: string;
  total_chunks?: number;
  total_threads?: number;
  total_files?: number;
  admin_count?: number;
}

export interface PlatformStats {
  total_clients: number;
  active_clients: number;
  byok_clients: number;
  platform_clients: number;
  total_threads: number;
  total_messages: number;
  total_chunks: number;
  total_files: number;
}

@Injectable({
  providedIn: 'root',
})
export class SuperAdminService {
  private readonly baseUrl = environment.api_url;

  constructor(private http: HttpClient) {}

  getStats(): Observable<{ ok: boolean; stats: PlatformStats }> {
    return this.http.get<{ ok: boolean; stats: PlatformStats }>(`${this.baseUrl}super-admin/stats`);
  }

  getClients(): Observable<{ ok: boolean; clients: ClientRecord[] }> {
    return this.http.get<{ ok: boolean; clients: ClientRecord[] }>(`${this.baseUrl}super-admin/clients`);
  }

  getClientDetails(id: string): Observable<{ ok: boolean; client: ClientRecord; secrets: any; users: any[] }> {
    return this.http.get<{ ok: boolean; client: ClientRecord; secrets: any; users: any[] }>(`${this.baseUrl}super-admin/clients/${id}`);
  }

  createClient(payload: any): Observable<{ ok: boolean; client: ClientRecord; created_user?: any }> {
    return this.http.post<{ ok: boolean; client: ClientRecord; created_user?: any }>(`${this.baseUrl}super-admin/clients`, payload);
  }

  updateClient(id: string, payload: any): Observable<{ ok: boolean; client: ClientRecord }> {
    return this.http.put<{ ok: boolean; client: ClientRecord }>(`${this.baseUrl}super-admin/clients/${id}`, payload);
  }

  deleteClient(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}super-admin/clients/${id}`);
  }

  createClientUser(clientId: string, payload: { username: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}super-admin/clients/${clientId}/users`, payload);
  }

  listClientUsers(clientId: string): Observable<{ ok: boolean; users: any[] }> {
    return this.http.get<{ ok: boolean; users: any[] }>(`${this.baseUrl}super-admin/clients/${clientId}/users`);
  }

  resetUserPassword(userId: string | number, password: string): Observable<{ ok: boolean; message: string }> {
    return this.http.put<{ ok: boolean; message: string }>(`${this.baseUrl}super-admin/users/${userId}/password`, { password });
  }

  deleteUser(userId: string | number): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`${this.baseUrl}super-admin/users/${userId}`);
  }
}
