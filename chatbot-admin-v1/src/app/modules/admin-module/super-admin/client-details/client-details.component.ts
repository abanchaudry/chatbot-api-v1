import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SuperAdminService, ClientRecord } from 'src/app/modules/core/services/super-admin.service';
import { utilityService } from 'src/app/modules/shared/services/utility.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-client-details',
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.css'],
})
export class ClientDetailsComponent implements OnInit {
  clientId: string = '';
  isLoading: boolean = true;
  isSaving: boolean = false;
  client: ClientRecord | null = null;
  secrets: any = {};
  users: any[] = [];

  editForm: any = {
    name: '',
    slug: '',
    domain: '',
    billing_mode: 'platform',
    status: 'active',
    openai_api_key: '',
    cf_account_id: '',
    cf_api_token: '',
  };

  newUserForm = {
    username: '',
    password: '',
  };

  showOpenAIKey: boolean = false;
  showCfToken: boolean = false;
  showNewUserPwd: boolean = false;
  copiedToken: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private superAdminService: SuperAdminService,
    private utility: utilityService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.clientId = params['id'];
      if (this.clientId) {
        this.loadDetails();
      }
    });
  }

  loadDetails(): void {
    this.isLoading = true;
    this.superAdminService.getClientDetails(this.clientId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.ok) {
          this.client = res.client;
          this.secrets = res.secrets || {};
          this.users = res.users || [];

          this.editForm = {
            name: this.client.name,
            slug: this.client.slug,
            domain: this.client.domain || '',
            billing_mode: this.client.billing_mode,
            status: this.client.status,
            openai_api_key: '',
            cf_account_id: this.secrets.cf_account_id || '',
            cf_api_token: '',
          };
        }
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'Failed to load client details', 'error');
      },
    });
  }

  onSaveProfile(): void {
    this.isSaving = true;
    this.superAdminService.updateClient(this.clientId, this.editForm).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.ok) {
          this.client = res.client;
          Swal.fire('Success', 'Business details updated successfully!', 'success');
          this.loadDetails();
        }
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire('Error', err?.error?.error || 'Failed to update details', 'error');
      },
    });
  }

  onCreateUser(): void {
    if (!this.newUserForm.username.trim() || !this.newUserForm.password.trim()) {
      Swal.fire('Warning', 'Username and password are required', 'warning');
      return;
    }

    this.superAdminService.createClientUser(this.clientId, this.newUserForm).subscribe({
      next: (res) => {
        if (res.ok) {
          Swal.fire('Success', 'New client login created successfully!', 'success');
          this.newUserForm = { username: '', password: '' };
          this.loadDetails();
        }
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.error || 'Failed to create user', 'error');
      },
    });
  }

  async onResetUserPassword(user: any): Promise<void> {
    const { value: newPassword } = await Swal.fire({
      title: `Reset Password for ${user.username}`,
      input: 'password',
      inputLabel: 'Enter new password',
      inputPlaceholder: 'New secure password',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Password cannot be empty!';
        }
        return null;
      },
    });

    if (newPassword) {
      this.superAdminService.resetUserPassword(user.id, newPassword).subscribe({
        next: () => {
          Swal.fire('Updated!', `Password for ${user.username} has been updated.`, 'success');
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.error || 'Failed to reset password', 'error');
        },
      });
    }
  }

  onDeleteUser(user: any): void {
    Swal.fire({
      title: `Delete User "${user.username}"?`,
      text: 'This user will no longer be able to log in.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete user',
    }).then((result) => {
      if (result.isConfirmed) {
        this.superAdminService.deleteUser(user.id).subscribe({
          next: () => {
            Swal.fire('Deleted', 'User account removed.', 'success');
            this.loadDetails();
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'Failed to delete user', 'error');
          },
        });
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedToken = true;
      setTimeout(() => (this.copiedToken = false), 2500);
    });
  }

  managePlayground(): void {
    if (this.client) {
      this.utility.setActiveClient(this.client.id, this.client.name);
      this.router.navigate(['/dashboard/assistant-information']);
    }
  }

  onDeleteClient(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Deleting "${this.client?.name}" will remove all associated credentials. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete business',
    }).then((result) => {
      if (result.isConfirmed) {
        this.superAdminService.deleteClient(this.clientId).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Business has been deleted.', 'success');
            this.router.navigate(['/dashboard/super-admin/dashboard']);
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'Failed to delete client', 'error');
          },
        });
      }
    });
  }
}
