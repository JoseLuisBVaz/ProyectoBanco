import { Routes, RouterModule } from '@angular/router';

import { LogIn } from './login/login';
import { LoginCliente } from './login-cliente/login-cliente';


export const routes: Routes = [
    {path: '', component: LogIn},
    {path: 'login-cliente', component: LoginCliente}
];
