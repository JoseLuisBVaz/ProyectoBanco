import { Routes, RouterModule } from '@angular/router';

import { LogIn } from './login/login';
import { Formulario } from './formulario/formulario';   
import { Prestamo } from './prestamos/prestamos';
import { Novedades } from './novedades/novedades';
import { Cancelacion } from './cancelacion/cancelacion';
import { DetallesCuenta } from './user/user';
import { Main } from './main/main';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
    {path: '', component: Main},
    {path: 'login', component: LogIn},
    {path: 'formulario', component: Formulario, canActivate: [AuthGuard, RoleGuard], data: { roles: ['g','e','m'] }},
    {path: 'prestamo', component: Prestamo},
    {path: 'novedades', component: Novedades, canActivate: [AuthGuard, RoleGuard], data: { roles: ['g','e','m'] }},
    {path: 'cancelacion', component: Cancelacion, canActivate: [AuthGuard, RoleGuard], data: { roles: ['g','e','m'] }},
    {path: 'cuenta', component: DetallesCuenta, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] }}
]