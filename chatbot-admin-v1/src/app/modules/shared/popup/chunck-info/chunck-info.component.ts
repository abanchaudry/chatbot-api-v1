import { Component } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-chunck-info',
  templateUrl: './chunck-info.component.html',
  styleUrls: ['./chunck-info.component.css']
})
export class ChunckInfoComponent {
  constructor(    public dialogRef: MatDialogRef<ChunckInfoComponent>,){

  }
closePopup(){
      this.dialogRef.close();
}
}
