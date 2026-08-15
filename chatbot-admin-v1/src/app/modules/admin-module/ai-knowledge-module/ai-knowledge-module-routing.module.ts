import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AddNewKnowledgeComponent } from "./add-new/add-new.component";
import { AiDetailsComponent } from "./ai-details/ai-details.component";
import { AllAIKnowledgeComponent } from "./all-knowledge/all-knowledge.component";

const routes: Routes = [
  {
    path: "add-new-knowledge",
    component: AddNewKnowledgeComponent,
  },
  {
    path: "all-ai-knowledge",
    component: AllAIKnowledgeComponent
  },
  {
    path: "detail/:id",
    component: AiDetailsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiKnowledgeModuleRoutingModule {}
