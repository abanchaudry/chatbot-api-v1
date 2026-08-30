import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SuperAdminService, PlatformStats, ClientRecord } from 'src/app/modules/core/services/super-admin.service';
import { utilityService } from 'src/app/modules/shared/services/utility.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css'],
})
export class SuperAdminDashboardComponent implements OnInit {
  isLoading: boolean = true;
  searchText: string = '';
  page: number = 1;
  entries: number = 10;
  itemPerPage: number = 10;

  stats: PlatformStats = {
    total_clients: 0,
    active_clients: 0,
    byok_clients: 0,
    platform_clients: 0,
    total_threads: 0,
    total_messages: 0,
    total_chunks: 0,
    total_files: 0,
  };
  clients: ClientRecord[] = [];

  get filteredClients(): ClientRecord[] {
    if (!this.searchText || !this.searchText.trim()) {
      return this.clients;
    }
    const q = this.searchText.toLowerCase().trim();
    return this.clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        c.domain?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.billing_mode?.toLowerCase().includes(q)
    );
  }

  get statCards() {
    return [
      {
        title: 'Total Businesses',
        value: this.stats.total_clients || 0,
        icon: 'ri-building-4-line',
        colorClass: 'text-primary',
        borderClass: 'border-primary',
      },
      {
        title: 'Active Tenants',
        value: this.stats.active_clients || 0,
        icon: 'ri-checkbox-circle-line',
        colorClass: 'text-success',
        borderClass: 'border-success',
      },
      {
        title: 'BYOK Tenants',
        value: this.stats.byok_clients || 0,
        icon: 'ri-key-2-line',
        colorClass: 'text-warning',
        borderClass: 'border-warning',
      },
      {
        title: 'Total Chunks',
        value: this.stats.total_chunks || 0,
        icon: 'ri-database-2-line',
        colorClass: 'text-danger',
        borderClass: 'border-danger',
      },
    ];
  }

  constructor(
    private superAdminService: SuperAdminService,
    private utility: utilityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.superAdminService.getStats().subscribe({
      next: (res) => {
        if (res.ok) {
          this.stats = res.stats;
        }
      },
    });

    this.superAdminService.getClients().subscribe({
      next: (res) => {
        if (res.ok) {
          this.clients = res.clients || [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  manageClientWorkspace(client: ClientRecord): void {
    this.utility.setActiveClient(client.id, client.name);
    this.router.navigate(['/dashboard/assistant-information']);
  }

  onDeleteClient(client: ClientRecord): void {
    if (client.id === 'default') {
      Swal.fire('Notice', 'The default business cannot be deleted.', 'info');
      return;
    }

    Swal.fire({
      title: `Delete "${client.name}"?`,
      text: 'This will permanently remove the business, its encrypted API keys, admin logins, and uploaded documents. This cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, permanently delete',
    }).then((result) => {
      if (result.isConfirmed) {
        this.superAdminService.deleteClient(client.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', `Business "${client.name}" has been deleted.`, 'success');
            this.loadData();
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'Failed to delete business', 'error');
          },
        });
      }
    });
  }
}
