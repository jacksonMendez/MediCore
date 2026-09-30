import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isAvailable: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-chat-calendar-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-3 p-4 rounded-xl bg-card border border-primary/30 shadow-lg text-foreground max-w-sm">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-display text-sm font-semibold flex items-center gap-2">
          <svg class="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="capitalize">{{ currentMonthName }} {{ currentYear }}</span>
        </h4>

        <div class="flex items-center gap-1">
          <button (click)="prevMonth()" class="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer" title="Mes anterior">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button (click)="nextMonth()" class="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer" title="Mes siguiente">
            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <!-- Day headers -->
      <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground mb-1">
        <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs">
        <div *ngFor="let day of daysGrid" class="h-8 flex items-center justify-center">
          <button *ngIf="day.isAvailable"
            (click)="selectDate(day.dateStr)"
            class="size-7 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary-hover hover:scale-110 active:scale-95 transition-all shadow-md shadow-primary/30 flex items-center justify-center cursor-pointer">
            {{ day.dayNumber }}
          </button>

          <span *ngIf="!day.isAvailable && day.isCurrentMonth"
            class="size-7 rounded-full flex items-center justify-center text-muted-foreground/60 select-none"
            [class.border]="day.isToday" [class.border-border]="day.isToday">
            {{ day.dayNumber }}
          </span>

          <span *ngIf="!day.isAvailable && !day.isCurrentMonth" class="size-7 select-none"></span>
        </div>
      </div>

      <div class="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-primary"></span>
          <span>Día con cupos</span>
        </span>
        <span>Selecciona para ver horas</span>
      </div>
    </div>
  `
})
export class ChatCalendarPickerComponent implements OnInit {
  @Input() diasDisponibles: string[] = [];
  @Input() mesInicial?: string;
  @Output() diaSeleccionado = new EventEmitter<string>();

  viewDate: Date = new Date();
  daysGrid: CalendarDay[] = [];

  ngOnInit() {
    if (this.mesInicial) {
      const parsed = new Date(this.mesInicial);
      if (!isNaN(parsed.getTime())) {
        this.viewDate = parsed;
      }
    } else if (this.diasDisponibles.length > 0) {
      const first = new Date(this.diasDisponibles[0]);
      if (!isNaN(first.getTime())) {
        this.viewDate = first;
      }
    }
    this.buildGrid();
  }

  get currentMonthName(): string {
    return this.viewDate.toLocaleDateString('es-CO', { month: 'long' });
  }

  get currentYear(): number {
    return this.viewDate.getFullYear();
  }

  prevMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.buildGrid();
  }

  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.buildGrid();
  }

  selectDate(dateStr: string) {
    this.diaSeleccionado.emit(dateStr);
  }

  private buildGrid() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as 0, Sunday as 6
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const grid: CalendarDay[] = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const availableSet = new Set(this.diasDisponibles);

    // Prev month padding
    for (let i = 0; i < startingDay; i++) {
      grid.push({
        date: new Date(year, month, -i),
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
        isAvailable: false,
        isToday: false
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dd}`;

      grid.push({
        date: d,
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isAvailable: availableSet.has(dateStr),
        isToday: dateStr === todayStr
      });
    }

    this.daysGrid = grid;
  }
}
