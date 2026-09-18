import React, { useState, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface ChatCalendarPickerProps {
  initialAvailableDates?: string[] | undefined;
  specialtyName?: string | undefined;
  initialMonth?: string | undefined; // YYYY-MM
  onSelectDate: (dateStr: string, formattedLabel: string) => void;
  disabled?: boolean | undefined;
}

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export function ChatCalendarPicker({
  initialAvailableDates = [],
  specialtyName = "Medicina General",
  initialMonth,
  onSelectDate,
  disabled = false,
}: ChatCalendarPickerProps) {
  // Determine starting month from initialMonth or today (2026-09-18)
  const now = new Date();
  const initialYear = initialMonth ? parseInt(initialMonth.slice(0, 4), 10) : (now.getFullYear() || 2026);
  const initialM = initialMonth ? parseInt(initialMonth.slice(5, 7), 10) : (now.getMonth() + 1 || 9);

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialM); // 1-indexed (1 = Jan, 12 = Dec)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set(initialAvailableDates));
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Sync initialAvailableDates if prop updates
  useEffect(() => {
    if (initialAvailableDates && initialAvailableDates.length > 0) {
      setAvailableDates((prev) => {
        const next = new Set(prev);
        initialAvailableDates.forEach((d) => next.add(d));
        return next;
      });
    }
  }, [initialAvailableDates]);

  // If user navigates to a month that might not be in the initial payload, query the backend
  useEffect(() => {
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const hasSomeDates = Array.from(availableDates).some((d) => d.startsWith(monthKey));

    if (!hasSomeDates && specialtyName) {
      const firstDayStr = `${monthKey}-01`;
      const lastDayNum = new Date(currentYear, currentMonth, 0).getDate();
      const lastDayStr = `${monthKey}-${String(lastDayNum).padStart(2, "0")}`;

      setLoading(true);
      apiFetch<{ fechas_activas?: string[] }>(
        `citas/dias-disponibles?especialidad_nombre=${encodeURIComponent(specialtyName)}&fecha_inicio=${firstDayStr}&fecha_fin=${lastDayStr}`
      )
        .then((res) => {
          if (res?.fechas_activas) {
            setAvailableDates((prev) => {
              const updated = new Set(prev);
              res.fechas_activas?.forEach((d) => updated.add(d));
              return updated;
            });
          }
        })
        .catch(() => {
          // Keep current dates on error
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [currentYear, currentMonth, specialtyName]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calendar math for grid
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sunday, 1 = Monday...
  const leadingBlanks = (firstDayWeekday + 6) % 7; // Monday = 0, Sunday = 6

  // Today reference
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const handleDayClick = (dateStr: string, dayNum: number) => {
    if (disabled || selectedDate) return;
    setSelectedDate(dateStr);
    const monthName = (MONTH_NAMES_ES[currentMonth - 1] ?? "mes").toLowerCase();
    const formatted = `${dayNum} de ${monthName} de ${currentYear}`;
    onSelectDate(dateStr, formatted);
  };

  return (
    <div className="mt-3 w-full max-w-sm rounded-xl border border-border/70 bg-card/85 p-3.5 shadow-lg backdrop-blur-xs animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CalendarDays className="size-4 text-primary" />
          <span>{MONTH_NAMES_ES[currentMonth - 1] ?? ""} {currentYear}</span>
          {loading && <Loader2 className="size-3 animate-spin text-muted-foreground ml-1" />}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handlePrevMonth}
            disabled={disabled}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleNextMonth}
            disabled={disabled}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mt-2.5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wider text-muted-foreground">
        {WEEKDAYS_ES.map((wd) => (
          <div key={wd} className="py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isAvailable = availableDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;

          if (isAvailable) {
            return (
              <button
                key={dateStr}
                type="button"
                disabled={disabled || !!selectedDate}
                onClick={() => handleDayClick(dateStr, dayNum)}
                className={cn(
                  "relative flex h-8 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm scale-95"
                    : "border-primary/40 bg-primary/10 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-2xs"
                )}
                title={`Disponible: ${dayNum} de ${MONTH_NAMES_ES[currentMonth - 1]}`}
              >
                <span>{dayNum}</span>
                <span
                  className={cn(
                    "size-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary group-hover:bg-primary-foreground"
                  )}
                />
              </button>
            );
          }

          return (
            <div
              key={dateStr}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-xs select-none",
                isToday && "border border-border/80 font-medium text-foreground",
                isPast || !isAvailable ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground/60"
              )}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Footer / Legend */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary ring-2 ring-primary/20" />
          <span>Días con citas disponibles</span>
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          {selectedDate ? "Fecha enviada" : "Haz clic en un día"}
        </span>
      </div>
    </div>
  );
}
