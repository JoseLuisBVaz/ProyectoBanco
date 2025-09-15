import { Routes, RouterModule } from '@angular/router';

import { LogIn } from './login/login';
import { LoginCliente } from './login-cliente/login-cliente';
import { LoginGerente } from './login-gerente/login-gerente';
import { Formulario } from './formulario/formulario';   


export const routes: Routes = [
    {path: '', component: LogIn},
    {path: 'login-cliente', component: LoginCliente},
    {path: 'login-gerente', component: LoginGerente},
    {path: 'formulario', component: Formulario},
]