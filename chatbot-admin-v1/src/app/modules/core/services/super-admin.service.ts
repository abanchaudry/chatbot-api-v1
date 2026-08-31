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
  contact_email?: string;
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

export interface ClientResources {
  client_id: string;
  d1_database_id?: string;
  d1_database_name?: string;
  kv_namespace_id?: string;
  kv_namespace_name?: string;
  vectorize_admin_index?: string;
  vectorize_pdf_index?: string;
  vectorize_web_index?: string;
  vectorize_cache_index?: string;
  r2_bucket_name?: string;
  provisioning_status?: string;
  provisioning_error?: string;
  provisioned_at?: string;
}

export interface ApiKeyRequest {
  id: string;
  client_id: string;
  client_name?: string;
  client_slug?: string;
  request_type: 'switch_to_own' | 'switch_to_platform';
  status: 'pending' | 'approved' | 'rejected';
  requested_by?: number;
  reviewed_by?: number;
  notes?: string;
  created_at?: string;
  reviewed_at?: string;
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

  getClientDetails(id: string): Observable<{ ok: boolean; client: ClientRecord; secrets: any; resources?: ClientResources; users: any[] }> {
    return this.http.get<{ ok: boolean; client: ClientRecord; secrets: any; resources?: ClientResources; users: any[] }>(`${this.baseUrl}super-admin/clients/${id}`);
  }

  getClientResources(id: string): Observable<{ ok: boolean; resources: ClientResources }> {
    return this.http.get<{ ok: boolean; resources: ClientResources }>(`${this.baseUrl}super-admin/clients/${id}/resources`);
  }

  createClient(payload: any): Observable<{ ok: boolean; client: ClientRecord; created_user?: any; resources?: any }> {
    return this.http.post<{ ok: boolean; client: ClientRecord; created_user?: any; resources?: any }>(`${this.baseUrl}super-admin/clients`, payload);
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

  // API Key Requests
  getApiKeyRequests(status?: string): Observable<{ ok: boolean; requests: ApiKeyRequest[] }> {
    const url = status ? `${this.baseUrl}super-admin/api-key-requests?status=${status}` : `${this.baseUrl}super-admin/api-key-requests`;
    return this.http.get<{ ok: boolean; requests: ApiKeyRequest[] }>(url);
  }

  reviewApiKeyRequest(id: string, status: 'approved' | 'rejected', notes?: string): Observable<{ ok: boolean; message: string }> {
    return this.http.put<{ ok: boolean; message: string }>(`${this.baseUrl}super-admin/api-key-requests/${id}/review`, { status, notes });
  }

  // Client Settings API Key Management
  getApiKeyStatus(): Observable<{ ok: boolean; billing_mode: string; has_openai_key: boolean; openai_api_key_masked?: string; has_pending_request: boolean; pending_request?: any }> {
    return this.http.get<any>(`${this.baseUrl}settings/api-key-status`);
  }

  updateOpenAIKey(openai_api_key: string): Observable<{ ok: boolean; message: string; billing_mode: string }> {
    return this.http.post<any>(`${this.baseUrl}settings/openai-key`, { openai_api_key });
  }

  requestPlatformSwitch(notes?: string): Observable<{ ok: boolean; message: string; request: any }> {
    return this.http.post<any>(`${this.baseUrl}settings/request-platform-switch`, { notes });
  }
}
