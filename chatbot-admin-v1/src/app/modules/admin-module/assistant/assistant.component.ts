import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Assistant } from './Model/assistant';
import { NgForm } from '@angular/forms';
import { AssistantService } from '../../shared/services/assistant.service';
import { SuperAdminService } from '../../core/services/super-admin.service';
import Swal from 'sweetalert2';
import { alert } from '../../shared/services/alert.service';

@Component({
  selector: 'app-assistant',
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.css']
})
export class AssistantComponent implements OnInit {

  allAssistants = [];
  selectedAssistantId: string = '';

  selectedStoreId: string;
  assistant = new Assistant();
  vectorStore: any;
  files: any;
  selectedAssistant: boolean = false;
  models = [];

  settings: any = {
    company_name: '',
    assistant_name: '',
    domain_hint: '',
    brand_tone: 'professional, calm, and customer-friendly',
    primary_language: 'english'
  };
  isLoadingSettings: boolean = true;
  isSavingSettings: boolean = false;

  // AI Key & Billing Management
  apiKeyStatus: any = {
    billing_mode: 'platform',
    has_openai_key: false,
    openai_api_key_masked: '',
    has_pending_request: false,
    pending_request: null
  };
  isLoadingApiKey: boolean = false;
  isSavingApiKey: boolean = false;
  newOpenAIKey: string = '';
  showNewKey: boolean = false;

  constructor(
    private assistantService: AssistantService,
    private superAdminService: SuperAdminService,
    private cdr: ChangeDetectorRef,
    private alert: alert
  ) {}

  ngOnInit(): void {
    this.getAllModels();
    this.loadBusinessSettings();
    this.loadApiKeyStatus();
  }

  loadBusinessSettings() {
    this.isLoadingSettings = true;
    this.assistantService.getSettings().subscribe({
      next: (res: any) => {
        this.isLoadingSettings = false;
        if (res && res.ok && res.settings) {
          this.settings = res.settings;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.isLoadingSettings = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadApiKeyStatus() {
    this.isLoadingApiKey = true;
    this.superAdminService.getApiKeyStatus().subscribe({
      next: (res: any) => {
        this.isLoadingApiKey = false;
        if (res && res.ok) {
          this.apiKeyStatus = res;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.isLoadingApiKey = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSaveBusinessSettings() {
    this.isSavingSettings = true;
    this.assistantService.saveSettings(this.settings).subscribe((res: any) => {
      this.isSavingSettings = false;
      if (res && res.ok) {
        this.alert.responseAlert('Business profile & system settings saved successfully!', 'success');
      } else {
        this.alert.responseAlert(res?.error || 'Failed to save settings', 'error');
      }
    }, (err) => {
      this.isSavingSettings = false;
      this.alert.responseAlert('Failed to save settings', 'error');
    });
  }

  onUpdateOpenAIKey() {
    if (!this.newOpenAIKey.trim()) {
      Swal.fire('Warning', 'Please enter a valid OpenAI API key', 'warning');
      return;
    }

    if (!this.newOpenAIKey.trim().startsWith('sk-')) {
      Swal.fire('Warning', 'OpenAI API keys typically start with "sk-". Please check your key.', 'warning');
      return;
    }

    this.isSavingApiKey = true;
    this.superAdminService.updateOpenAIKey(this.newOpenAIKey.trim()).subscribe({
      next: (res: any) => {
        this.isSavingApiKey = false;
        this.newOpenAIKey = '';
        Swal.fire('Success', 'OpenAI API key saved! Your business is now using its own API key for AI generation.', 'success');
        this.loadApiKeyStatus();
      },
      error: (err) => {
        this.isSavingApiKey = false;
        Swal.fire('Error', err?.error?.error || 'Failed to update API key', 'error');
      }
    });
  }

  onRequestPlatformSwitch() {
    Swal.fire({
      title: 'Request Switch to Platform Billing?',
      text: 'Your request will be submitted to the Super Admin for approval. Once approved, your business will use the platform AI quota and your private OpenAI key will be removed.',
      input: 'textarea',
      inputPlaceholder: 'Optional note / reason for switching...',
      showCancelButton: true,
      confirmButtonColor: '#3167f3',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Submit Switch Request',
    }).then((result) => {
      if (result.isConfirmed) {
        const notes = result.value || '';
        this.superAdminService.requestPlatformSwitch(notes).subscribe({
          next: () => {
            Swal.fire('Request Submitted!', 'Your request has been sent to the Super Admin. You will be notified once approved.', 'success');
            this.loadApiKeyStatus();
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'Failed to submit switch request', 'error');
          }
        });
      }
    });
  }

  getAllAssistants() {
    // Legacy assistant loader
  }

  getAllModels() {
    this.models = [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }, { id: 'text-embedding-3-small' }];
  }

  onAssistantSelect() {
    if (this.selectedAssistantId) {
      this.assistantService.getAssistant(this.selectedAssistantId).subscribe((res) => {
        this.assistant = {
          ...this.assistant,
          assistantId: res.assistant.id,
          description: res.assistant.description,
          instantsDescription: res.assistant.instructions,
          model: res.assistant.model,
          storeId: res.assistant.tool_resources?.file_search?.vector_store_ids?.[0] || ''
        };

        this.selectedStoreId = res.assistant.tool_resources?.file_search?.vector_store_ids?.[0] || '';

        this.files = res.assistant.tools?.find(tool => tool.type === 'file_search')?.file_search?.ranking_options || [];
        if (this.selectedStoreId) {
          this.getVectorStoreFiles(this.selectedStoreId);
        }
        
        this.cdr.detectChanges();
      });
    }
  }

  getVectorStoreFiles(vectorStoreId: string) {
    this.assistantService.getVectorStoreAndFiles(vectorStoreId).subscribe(res => {
      this.vectorStore = res?.vectorStore || null;
      this.files = res?.files || [];
    });
  }

  onSubmit(f: NgForm) {
    if (f.valid && this.selectedAssistantId) {
      const updateData = {
        description: this.assistant.description,
        instructions: this.assistant.instantsDescription,
        model: this.assistant.model
      };
      this.assistantService.updateAssistant(this.selectedAssistantId, updateData).subscribe((res) => {
        this.alert.responseAlert(res.message, 'success');
      });
    } else {
      console.error('Form is invalid or no assistant selected!');
    }
  }

  onCancel(): void {
    this.assistant = new Assistant();
    this.selectedAssistantId = '';
    this.files = [];
  }
}