import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { AiKnowledgeModuleRoutingModule } from "./ai-knowledge-module-routing.module";
import { AiDetailsComponent } from "./ai-details/ai-details.component";
import { AddNewKnowledgeComponent } from "./add-new/add-new.component";
import { NgxPaginationModule } from "ngx-pagination";
import { MatIconModule } from "@angular/material/icon";
import { AllAIKnowledgeComponent } from "./all-knowledge/all-knowledge.component";
import { SharedModule } from "../../shared/shared.module";
@NgModule({
  declarations: [
    AiDetailsComponent,
    AddNewKnowledgeComponent,
    AllAIKnowledgeComponent,
  ],
  imports: [
    CommonModule,
    AiKnowledgeModuleRoutingModule,
    NgxPaginationModule,
    FormsModule,
    MatIconModule,
    SharedModule,
  ],
})
export class AiKnowledgeModuleModule {}
