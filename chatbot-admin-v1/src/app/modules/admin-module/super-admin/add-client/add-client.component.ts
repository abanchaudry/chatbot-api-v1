import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SuperAdminService } from 'src/app/modules/core/services/super-admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-client',
  templateUrl: './add-client.component.html',
  styleUrls: ['./add-client.component.css'],
})
export class AddClientComponent implements OnInit {
  isSaving: boolean = false;
  showOpenAIKey: boolean = false;
  showCfToken: boolean = false;
  showPassword: boolean = false;

  clientForm = {
    name: '',
    slug: '',
    domain: '',
    logo_url: '',
    billing_mode: 'platform' as 'platform' | 'byok',
    openai_api_key: '',
    cf_account_id: '',
    cf_api_token: '',
    admin_username: '',
    admin_password: '',
  };

  constructor(
    private superAdminService: SuperAdminService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  onNameChange(): void {
    if (this.clientForm.name) {
      const generatedSlug = this.clientForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      this.clientForm.slug = generatedSlug;
      if (!this.clientForm.admin_username || this.clientForm.admin_username === 'admin' || this.clientForm.admin_username.endsWith('_admin')) {
        this.clientForm.admin_username = `${generatedSlug.replace(/-/g, '_')}_admin`;
      }
    }
  }

  generateRandomPassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.clientForm.admin_password = pwd;
    this.showPassword = true;
  }

  onSubmit(): void {
    if (!this.clientForm.name.trim()) {
      Swal.fire('Error', 'Please enter a business name', 'error');
      return;
    }

    if (this.clientForm.billing_mode === 'byok') {
      if (!this.clientForm.openai_api_key.trim()) {
        Swal.fire('Warning', 'Please provide the client OpenAI API key for BYOK mode.', 'warning');
        return;
      }
      if (this.clientForm.cf_account_id.trim() && !this.clientForm.cf_api_token.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Cloudflare API Token Required',
          text: 'If you provide a Cloudflare Account ID, you must also provide the Cloudflare API Token to authenticate access to that account.',
        });
        return;
      }
    }

    this.isSaving = true;
    this.superAdminService.createClient(this.clientForm).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.ok) {
          const client = res.client;
          const user = res.created_user;

          Swal.fire({
            icon: 'success',
            title: 'Business Registered Successfully!',
            html: `
              <div style="text-align: left; font-size: 13.5px;">
                <p><strong>Business:</strong> ${client.name}</p>
                <p><strong>Client ID:</strong> <code>${client.id}</code></p>
                <p><strong>Public Widget Token:</strong> <br><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 4px; word-break: break-all;">${client.public_token}</code></p>
                ${user ? `<p><strong>Admin Username:</strong> <code>${user.username}</code></p>` : ''}
              </div>
            `,
            confirmButtonText: 'Go to Businesses List',
            confirmButtonColor: '#3167f3',
          }).then(() => {
            this.router.navigate(['/dashboard/super-admin/dashboard']);
          });
        }
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire('Error', err?.error?.error || 'Failed to register business', 'error');
      },
    });
  }
}
