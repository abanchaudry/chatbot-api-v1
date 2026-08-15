import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AllChunksComponent } from './all-chuncks/all-chunks.component';

const routes: Routes = [
  {
    path:'view-all',
    component:AllChunksComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChuncksRoutingModule { }
