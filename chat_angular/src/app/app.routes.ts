import { Routes } from '@angular/router';
import { authGuard } from './guard/auth-guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo:'/auth',
        pathMatch:'full'
    },
    {
        path:'auth',
        loadComponent:()=>import('./components/auth/auth').then(m=>m.Auth),
        title:"inicio de sesion"
    },
    {
        path:'chat',
        loadComponent:()=>import('./components/chat/chat').then(m=>m.Chat),
        title:"chat",
        canActivate:[authGuard]
    },
    {
        path:"**",
        redirectTo:"/auth"
    }
];
