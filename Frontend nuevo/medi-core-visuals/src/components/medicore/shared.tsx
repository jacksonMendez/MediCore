import { Bell, CalendarDays, ChevronDown, HeartPulse, Search, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <HeartPulse className="size-5" />
      </span>
      {!compact && (
        <div>
          <div className="font-display text-base font-semibold text-foreground">MediCore</div>
          <div className="text-[10px] font-medium text-muted-foreground">Clinical OS</div>
        </div>
      )}
    </div>
  );
}

export function AppHeader({
  title,
  subtitle,
  name,
  initials,
}: {
  title: string;
  subtitle: string;
  name: string;
  initials: string;
}) {
  return (
    <header className="shrink-0 flex min-h-20 items-center justify-between gap-4 border-b border-border px-5 lg:px-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificaciones">
          <Bell />
        </Button>
        <div className="hidden h-9 items-center gap-2 border-l border-border pl-3 sm:flex">
          <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials}
          </span>
          <div className="text-sm">
            <p className="font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">En línea</p>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}

export function MobileTopbar() {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3 lg:hidden">
      <Brand />
      <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Sesión segura</span>
    </div>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-base font-semibold text-foreground lg:text-lg">{title}</h2>
      {action}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-md bg-card/70 p-5">
      <div className="mb-5 flex items-start justify-between">
        <span className="grid size-9 place-items-center rounded-md bg-secondary text-primary">
          {icon}
        </span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export type AppointmentStatus = "Confirmada" | "Pendiente" | "Cancelada";
export function StatusLine({
  status,
  children,
  className,
}: {
  status: AppointmentStatus;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-l-2 py-3 pl-4",
        status === "Confirmada" && "border-success",
        status === "Pendiente" && "border-warning",
        status === "Cancelada" && "border-destructive",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SearchBox({
  placeholder = "Buscar...",
  value,
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}

export function DatePill() {
  return (
    <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
      <CalendarDays className="size-4 text-primary" /> Viernes, 18 de septiembre
    </div>
  );
}
