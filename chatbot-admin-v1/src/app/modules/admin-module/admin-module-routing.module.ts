import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { FileUploadComponent } from "./file-upload/file-upload.component";
import { AssistantComponent } from "./assistant/assistant.component";
import { FallbackAnalyticsComponent } from "./chat-analytics/fallback-analytics/fallback-analytics.component";
import { SuperAdminDashboardComponent } from "./super-admin/super-admin-dashboard/super-admin-dashboard.component";
import { AddClientComponent } from "./super-admin/add-client/add-client.component";
import { ClientDetailsComponent } from "./super-admin/client-details/client-details.component";
import { SuperAdminGuard } from "../shared/guards/super-admin.guard";

const routes: Routes = [
  { path: "", component: DashboardComponent },
  { path: "manage-data", component: FileUploadComponent },
  { path: "assistant-information", component: AssistantComponent },
  { path: "fallback-analytics", component: FallbackAnalyticsComponent },
  // 🏢 Super Admin Routes
  {
    path: "super-admin/dashboard",
    component: SuperAdminDashboardComponent,
    canActivate: [SuperAdminGuard],
  },
  {
    path: "super-admin/add-client",
    component: AddClientComponent,
    canActivate: [SuperAdminGuard],
  },
  {
    path: "super-admin/clients/:id",
    component: ClientDetailsComponent,
    canActivate: [SuperAdminGuard],
  },
  {
    path: "threads",
    loadChildren: () =>
      import("./threads-module/threads-module.module").then(
        (m) => m.ThreadsModuleModule
      ),
  },
  {
    path: "ai-knowledge",
    loadChildren: () =>
      import("./ai-knowledge-module/ai-knowledge-module.module").then(
        (m) => m.AiKnowledgeModuleModule
      ),
  },
  {
    path: "chunks",
    loadChildren: () =>
      import("../admin-module/chuncks/chuncks.module").then(
        (m) => m.ChuncksModule
      ),
  },
  {
    path: "chat-analytics",
    loadChildren: () =>
      import("../admin-module/chat-analytics/chat-analytics.module").then(
        (m) => m.ChatAnalyticsModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminModuleRoutingModule {}
export const routedComponents = [
  DashboardComponent,
  FileUploadComponent,
  AssistantComponent,
  FallbackAnalyticsComponent,
  SuperAdminDashboardComponent,
  AddClientComponent,
  ClientDetailsComponent,
];
