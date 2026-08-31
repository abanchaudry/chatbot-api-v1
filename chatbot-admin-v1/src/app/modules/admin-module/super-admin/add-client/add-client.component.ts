import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SuperAdminService } from 'src/app/modules/core/services/super-admin.service';
import Swal from 'sweetalert2';

export interface StepDef {
  number: number;
  title: string;
  subtitle: string;
  icon: string;
}

@Component({
  selector: 'app-add-client',
  templateUrl: './add-client.component.html',
  styleUrls: ['./add-client.component.css'],
})
export class AddClientComponent implements OnInit {
  currentStep: number = 1;
  isSaving: boolean = false;
  showOpenAIKey: boolean = false;
  showPassword: boolean = false;

  steps: StepDef[] = [
    { number: 1, title: 'Business Info', subtitle: 'Profile & branding', icon: 'ri-building-4-line' },
    { number: 2, title: 'Cloud Resources', subtitle: 'Dedicated infra', icon: 'ri-server-line' },
    { number: 3, title: 'AI Billing', subtitle: 'OpenAI API key', icon: 'ri-cpu-line' },
    { number: 4, title: 'Admin Account', subtitle: 'Login credentials', icon: 'ri-shield-user-line' },
    { number: 5, title: 'Review & Confirm', subtitle: 'Final verification', icon: 'ri-checkbox-circle-line' },
  ];

  clientForm = {
    name: '',
    slug: '',
    domain: '',
    contact_email: '',
    logo_url: '',
    billing_mode: 'platform' as 'platform' | 'byok',
    openai_api_key: '',
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
      if (
        !this.clientForm.admin_username ||
        this.clientForm.admin_username === 'admin' ||
        this.clientForm.admin_username.endsWith('_admin')
      ) {
        this.clientForm.admin_username = `${generatedSlug.replace(/-/g, '_')}_admin`;
      }
    }
  }

  // Live resource names based on current slug
  get resourceNames() {
    const s = this.clientForm.slug || 'business';
    return {
      d1: `chatbot-${s}-db`,
      kv: `chatbot-${s}-cache`,
      vecAdmin: `chatbot-${s}-admin`,
      vecPdf: `chatbot-${s}-pdf`,
      vecWeb: `chatbot-${s}-web`,
      vecQCache: `chatbot-${s}-qcache`,
      r2: `chatbot-${s}-storage`,
    };
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

  goToStep(stepNumber: number): void {
    if (stepNumber < this.currentStep) {
      this.currentStep = stepNumber;
      return;
    }
    if (this.validateCurrentStep()) {
      this.currentStep = stepNumber;
    }
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < 5) {
        this.currentStep++;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  validateCurrentStep(): boolean {
    if (this.currentStep === 1) {
      if (!this.clientForm.name.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Business Name Required',
          text: 'Please enter a name for the business before continuing.',
          confirmButtonColor: '#3167f3',
        });
        return false;
      }
      if (!this.clientForm.slug.trim()) {
        this.onNameChange();
      }
    } else if (this.currentStep === 3) {
      if (this.clientForm.billing_mode === 'byok') {
        if (!this.clientForm.openai_api_key.trim()) {
          Swal.fire({
            icon: 'warning',
            title: 'OpenAI API Key Required',
            text: 'You selected Bring Your Own Key mode. Please enter an OpenAI API key or select Platform Managed AI.',
            confirmButtonColor: '#3167f3',
          });
          return false;
        }
        if (!this.clientForm.openai_api_key.trim().startsWith('sk-')) {
          Swal.fire({
            icon: 'warning',
            title: 'Invalid Key Format',
            text: 'OpenAI API keys typically start with "sk-". Please verify your key.',
            confirmButtonColor: '#3167f3',
          });
          return false;
        }
      }
    } else if (this.currentStep === 4) {
      if (!this.clientForm.admin_username.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Admin Username Required',
          text: 'Please enter an administrative username for the business owner.',
          confirmButtonColor: '#3167f3',
        });
        return false;
      }
      if (!this.clientForm.admin_password.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Admin Password Required',
          text: 'Please enter a password or click "Generate Password".',
          confirmButtonColor: '#3167f3',
        });
        return false;
      }
    }
    return true;
  }

  onSubmit(): void {
    if (!this.validateCurrentStep()) return;

    this.isSaving = true;
    this.superAdminService.createClient(this.clientForm).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.ok) {
          const client = res.client;
          const user = res.created_user;

          Swal.fire({
            icon: 'success',
            title: '🎉 Business Registered & Provisioned!',
            html: `
              <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
                <div style="background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
                  <strong style="color: #1e40af;">Dedicated Cloudflare Infrastructure:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 12.5px; color: #1e3a8a;">
                    <li>D1 Database: <code>${this.resourceNames.d1}</code></li>
                    <li>KV Cache: <code>${this.resourceNames.kv}</code></li>
                    <li>Vectorize: <code>${this.resourceNames.vecAdmin}</code> + 3 more</li>
                    <li>R2 Bucket: <code>${this.resourceNames.r2}</code></li>
                  </ul>
                </div>
                <p><strong>Business:</strong> ${client.name}</p>
                <p><strong>Client ID:</strong> <code>${client.id}</code></p>
                <p><strong>Public Widget Token:</strong> <br><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 4px; word-break: break-all; font-size: 11.5px;">${client.public_token}</code></p>
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
        Swal.fire('Error', err?.error?.error || 'Failed to register business and provision resources', 'error');
      },
    });
  }
}
