import { NgModule } from "@angular/core";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterModule } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { APP_BASE_HREF } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { AdminLayoutComponent } from "./modules/layouts/admin/admin-layout.component";
import { ToastrModule } from "ngx-toastr";
import { AppComponent } from "./app.component";
import { AppRoutes } from "./app.routing";
import { SharedModule } from "./modules/shared/shared.module";
import { AuthLayoutComponent } from "./modules/layouts/auth/auth-layout.component";
import { interceptorProviders } from "./modules/shared/interceptors/interceptor.module";

@NgModule({
  imports: [
    CommonModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
    FormsModule,
    RouterModule.forRoot(AppRoutes, { useHash: true }),
    HttpClientModule,
    SharedModule,
  ],
  declarations: [AppComponent, AdminLayoutComponent, AuthLayoutComponent],
  providers: [interceptorProviders],
  bootstrap: [AppComponent],
})
export class AppModule {}
