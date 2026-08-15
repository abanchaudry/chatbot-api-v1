import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadProgressComponent } from './upload-progress/upload-progress.component';
import { MatDialogModule } from '@angular/material/dialog';
import { ChunckInfoComponent } from './chunck-info/chunck-info.component';
import { ChatModelComponent } from './chat-model/chat-model.component';
const shareComponents :any= [
  UploadProgressComponent,
  ChunckInfoComponent,
  ChatModelComponent
]

@NgModule({
  declarations: [
    shareComponents,


  ],
  imports: [
    CommonModule,MatDialogModule
  ],
    exports: shareComponents
})
export class PopupModule { }
