import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Assistant } from './Model/assistant';
import { NgForm } from '@angular/forms';
import { AssistantService } from '../../shared/services/assistant.service';
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

  selectedStoreId:string;
  assistant = new Assistant();
  vectorStore:any;
  files:any;
  selectedAssistant:boolean=false
  models = [];

  settings: any = {
    company_name: '',
    assistant_name: '',
    domain_hint: '',
    brand_tone: 'professional, calm, and customer-friendly',
    primary_language: 'english'
  };
  isLoadingSettings: boolean = true;

  rawBusinessDescription: string = '';
  isGeneratingDomain: boolean = false;
  isSavingSettings: boolean = false;

  constructor(private assistantService: AssistantService, private cdr: ChangeDetectorRef, private alert: alert) {}

  ngOnInit(): void {
    this.getAllModels();
    this.loadBusinessSettings();
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

  onGenerateDomainPrompt() {
    if (!this.rawBusinessDescription.trim()) {
      this.alert.responseAlert('Please enter a brief business summary first.', 'warning');
      return;
    }
    this.isGeneratingDomain = true;
    this.assistantService.generateDomainPrompt({
      companyName: this.settings.company_name,
      rawDescription: this.rawBusinessDescription
    }).subscribe((res: any) => {
      this.isGeneratingDomain = false;
      if (res && res.ok && res.generatedDomainHint) {
        this.settings.domain_hint = res.generatedDomainHint;
        this.alert.responseAlert('AI Domain System Instructions generated successfully!', 'success');
        this.cdr.detectChanges();
      } else {
        this.alert.responseAlert(res?.error || 'Failed to generate AI prompt', 'error');
      }
    }, (err) => {
      this.isGeneratingDomain = false;
      this.alert.responseAlert('Failed to connect to AI generator', 'error');
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

        // Assuming files need to be fetched or simulated for the assistant
        this.files = res.assistant.tools?.find(tool => tool.type === 'file_search')?.file_search?.ranking_options || [];
        if(this.selectedStoreId){
          this.getVectorStoreFiles(this.selectedStoreId);
        }
        
        this.cdr.detectChanges();
      });
    }
  }

  getVectorStoreFiles(vectorStoreId:string){
    this.assistantService.getVectorStoreAndFiles(vectorStoreId).subscribe(res => {
     this.vectorStore = res?.vectorStore || null;
     this.files = res?.files || []

    })
  }

  onSubmit(f: NgForm) {
    if (f.valid && this.selectedAssistantId) {
      const updateData = {
        description: this.assistant.description,
        instructions: this.assistant.instantsDescription,
        model: this.assistant.model
      };
      this.assistantService.updateAssistant(this.selectedAssistantId, updateData).subscribe((res) => {
        console.log('Assistant updated successfully:', res);
        this.alert.responseAlert(res.message,'success')
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
  confirmDeleteFile(index: number): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteFile(index); 
        Swal.fire('Deleted!', 'The file has been deleted.', 'success');
      }
    });
  }
  
  deleteFile(index: number) {
   
  }

  useDefaultInstructions() {
    this.assistant.description = 
      'Responds only to questions answerable from uploaded files';
    this.assistant.instantsDescription = 
      'This assistant responds strictly based on information found in the uploaded files. It will only provide answers when ' +
      'the information inquired about is present within the provided file search. The assistant will not speculate or use outside knowledge. ' +
      'If a question is outside the scope of the uploaded content or unrelated to NAC or NRS, it will respond with: "Please call support. ' +
      'I can only answer NAC or NRS inquiries." The assistant will adhere to this behavior without deviation. Responses should be concise, ' +
      'friendly, and to the point, avoiding lengthy explanations.';
  }
  
  useRecommendedInstructions() {
    this.assistant.description = 
      'This assistant is designed to respond to inquiries based only on the information available in the uploaded files. ' +
      'It specializes in NAC and NRS inquiries. If a user asks a question that falls outside the scope of the uploaded content ' +
      'or is unrelated to NAC or NRS, the assistant will reply with: "Please call support. I can only answer NAC or NRS inquiries."';
  
    this.assistant.instantsDescription = 
      '1. **Data Dependency:** Only use the data available in the uploaded files to generate responses. Do not make assumptions ' +
      'or provide information not explicitly contained in the files.\n' +
      '2. **Scope Limitation:** Restrict answers to NAC and NRS-related queries as outlined in the uploaded files.\n' +
      '3. **Unsupported Queries:** If a query falls outside the scope of the uploaded content or pertains to topics unrelated to NAC or NRS, ' +
      'respond with: "Please call support. I can only answer NAC or NRS inquiries."\n' +
      '4. **Error Handling:** Avoid generic or unrelated answers. Always prioritize accuracy and the user\'s intent based on the available data.\n' +
      '5. **Tone:** Maintain a professional, concise, and helpful tone in all responses.\n' +
      '6. **Fallback Mechanism:** For vague or unclear queries, guide the user to rephrase the question or confirm its relevance to NAC or NRS.';
  }
  
}