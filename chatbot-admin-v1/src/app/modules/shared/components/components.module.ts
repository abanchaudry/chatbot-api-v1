import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { SidebarComponent } from "./sidebar/sidebar.component";
import { NavbarComponent } from "./navbar/navbar.component";


import { RouterModule } from "@angular/router";
import { FooterComponent } from "./footer/footer.component";


const sharedComponents = [
  SidebarComponent,
  NavbarComponent,
  FooterComponent
]

@NgModule({
  imports: [
    CommonModule,
    RouterModule,FormsModule
  ],
  declarations: [
    sharedComponents
  ],
  exports: [
    sharedComponents
  ],
  providers: [
  ]
})
export class ComponentsModule {}
