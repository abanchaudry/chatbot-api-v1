import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { ThreadsModuleRoutingModule } from "./threads-module-routing.module";
import { AllThreadsComponent } from "./all-threads/all-threads.component";
import { ThreadsDetailComponent } from "./threads-detail/threads-detail.component";
import { NgxPaginationModule } from "ngx-pagination";
import { FormsModule } from "@angular/forms";
import { SharedModule } from "../../shared/shared.module";
import { ThreadsDetailDevComponent } from "./thread-detail-dev/threads-detail-dev.component";
import { ThreadsDetailPageComponent } from "./thread-detail-page/threads-detail-page.component";

@NgModule({
  declarations: [AllThreadsComponent, ThreadsDetailComponent, ThreadsDetailDevComponent,ThreadsDetailPageComponent],
  imports: [
    CommonModule,
    ThreadsModuleRoutingModule,
    NgxPaginationModule,
    FormsModule,
    SharedModule,
  ],
})
export class ThreadsModuleModule {}
