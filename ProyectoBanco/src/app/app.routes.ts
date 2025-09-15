import { Routes, RouterModule } from '@angular/router';

import { LogIn } from './login/login';
import { LoginCliente } from './login-cliente/login-cliente';
import { LoginGerente } from './login-gerente/login-gerente';
import { Formulario } from './formulario/formulario';   
import { Prestamo } from './prestamos/prestamos';
import { Novedades } from './novedades/novedades';
import { Cancelacion } from './cancelacion/cancelacion';
import { DetallesCuenta } from './user/user';

export const routes: Routes = [
    {path: '', component: LogIn},
    {path: 'login-cliente', component: LoginCliente},
    {path: 'login-gerente', component: LoginGerente},
    {path: 'formulario', component: Formulario},
    {path: 'prestamo', component: Prestamo},
    {path: 'novedades', component: Novedades},
    {path: 'cancelacion', component: Cancelacion},
    {path: 'cuenta', component: DetallesCuenta}
]