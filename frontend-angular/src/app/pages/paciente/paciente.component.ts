import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar.component';
import { HeaderComponent } from '../../components/layout/header.component';
import { ChatComponent } from '../../components/chat/chat.component';
import { ProximaCitaWidgetComponent } from '../../components/widgets/proxima-cita-widget.component';
import { EspecialidadesWidgetComponent } from '../../components/widgets/especialidades-widget.component';
import { CitasRecientesWidgetComponent } from '../../components/widgets/citas-recientes-widget.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-paciente',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    HeaderComponent,
    ChatComponent,
    ProximaCitaWidgetComponent,
    EspecialidadesWidgetComponent,
    CitasRecientesWidgetComponent
  ],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">
      <!-- Sidebar -->
      <app-sidebar></app-sidebar>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header
          [title]="'Hola, ' + firstName"
          subtitle="Panel Clínico y Copiloto IA">
        </app-header>

        <main class="flex-1 min-h-0 grid gap-6 p-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] lg:p-6 overflow-hidden">
          <!-- Left Main Area: Chat Component -->
          <div class="h-full min-h-0 flex flex-col overflow-hidden">
            <app-chat class="flex-1 h-full min-h-0 flex flex-col overflow-hidden"></app-chat>
          </div>

          <!-- Right Column: Interactive Widgets -->
          <div class="h-full min-h-0 overflow-y-auto space-y-5 pr-1">
            <app-proxima-cita-widget></app-proxima-cita-widget>
            <app-especialidades-widget></app-especialidades-widget>
            <app-citas-recientes-widget></app-citas-recientes-widget>
          </div>
        </main>
      </div>
    </div>
  `
})
export class PacienteComponent {
  private auth = inject(AuthService);

  get firstName(): string {
    const full = this.auth.currentUser()?.nombre_completo || 'Paciente';
    return full.split(' ')[0];
  }
}
