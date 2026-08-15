import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChuncksRoutingModule } from './chuncks-routing.module';
import { AllChunksComponent } from './all-chuncks/all-chunks.component';
import { NgxPaginationModule } from "ngx-pagination";
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/modules/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
@NgModule({
  declarations: [
    AllChunksComponent
  ],
  imports: [
    CommonModule,
    ChuncksRoutingModule,NgxPaginationModule,FormsModule,SharedModule,NgSelectModule
  ]
})
export class ChuncksModule { }
