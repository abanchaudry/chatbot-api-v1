import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './modules/layouts/admin/admin-layout.component';
import { AuthLayoutComponent } from './modules/layouts/auth/auth-layout.component';
import { AuthGuard } from './modules/shared/auth/auth-gurad';

export const AppRoutes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: "login",
    loadChildren: () => import('./modules/auth-module/auth-module.module').then(m => m.AuthModuleModule)
  },
  {
    path: '',
    component: AdminLayoutComponent,
    children: [

      {
        path: 'dashboard',
        loadChildren: () => import('./modules/admin-module/admin-module.module').then(m => m.AdminModuleModule),
        canActivate:[AuthGuard]
      },

     

    ],
  
  },

];
