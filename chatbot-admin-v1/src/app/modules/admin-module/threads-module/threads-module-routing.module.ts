import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AllThreadsComponent } from './all-threads/all-threads.component';
import { ThreadsDetailComponent } from './threads-detail/threads-detail.component';
import { ThreadsDetailDevComponent } from './thread-detail-dev/threads-detail-dev.component';
import { ThreadsDetailPageComponent } from './thread-detail-page/threads-detail-page.component';

const routes: Routes = [
  { path: 'all-threads', component: AllThreadsComponent }, 
  { path: 'detail/:id', component: ThreadsDetailComponent },
  { path: 'detail-dev/:id', component: ThreadsDetailDevComponent },
  { path: 'detail-page/:id', component: ThreadsDetailPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ThreadsModuleRoutingModule { }
