import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { PacienteComponent } from './pages/paciente/paciente.component';
import { CitasComponent } from './pages/citas/citas.component';
import { PagosComponent } from './pages/pagos/pagos.component';
import { MedicoComponent } from './pages/medico/medico.component';
import { MedicoCopilotoComponent } from './pages/medico/medico-copiloto.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminCopilotoComponent } from './pages/admin/admin-copiloto.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'paciente', component: PacienteComponent, canActivate: [authGuard], data: { role: 'paciente' } },
  { path: 'copiloto', component: PacienteComponent, canActivate: [authGuard], data: { role: 'paciente' } },
  { path: 'citas', component: CitasComponent, canActivate: [authGuard], data: { role: 'paciente' } },
  { path: 'pagos', component: PagosComponent, canActivate: [authGuard], data: { role: 'paciente' } },
  { path: 'medico', component: MedicoComponent, canActivate: [authGuard], data: { role: 'medico' } },
  { path: 'medico/copiloto', component: MedicoCopilotoComponent, canActivate: [authGuard], data: { role: 'medico' } },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard], data: { role: 'admin' } },
  { path: 'admin/copiloto', component: AdminCopilotoComponent, canActivate: [authGuard], data: { role: 'admin' } },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
