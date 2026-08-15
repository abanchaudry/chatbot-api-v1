import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatAnalyticsRoutingModule } from './chat-analytics-routing.module';
import { AnalyticsComponent } from './analytics/analytics.component';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from '../../shared/shared.module';

import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
@NgModule({
  declarations: [
    AnalyticsComponent
  ],
  imports: [
    CommonModule,
    ChatAnalyticsRoutingModule,
    FormsModule,
    NgxPaginationModule,
    SharedModule   ,
     NgxDaterangepickerMd.forRoot()
     
  ]
})
export class ChatAnalyticsModule { }
