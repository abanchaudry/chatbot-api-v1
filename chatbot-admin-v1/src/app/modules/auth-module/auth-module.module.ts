import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthModuleRoutingModule } from './auth-module-routing.module';
import { LoginComponent } from './login/login.component';
import { SharedModule } from '../shared/shared.module';
import { CoreModule } from '../core/core.module';


@NgModule({
  declarations: [
    LoginComponent
  ],
  imports: [
    CommonModule,
    CoreModule,
    SharedModule,
    AuthModuleRoutingModule,
    FormsModule
  ]
})
export class AuthModuleModule { }
