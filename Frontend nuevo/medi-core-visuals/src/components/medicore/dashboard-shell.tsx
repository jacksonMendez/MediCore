import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Brand, MobileTopbar } from "./shared";

const nav = [
  { label: "Resumen", icon: LayoutDashboard },
  { label: "Citas", icon: CalendarDays },
  { label: "Directorio", icon: Users },
  { label: "Pagos", icon: CreditCard },
];
export function DashboardShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileTopbar />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="px-6 py-6">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ label, icon: Icon }, index) => (
            <Button
              key={label}
              variant={index === 0 ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Icon />
              {label}
            </Button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <Button variant="ghost" className="w-full justify-start">
            <Settings />
            Configuración
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" asChild>
            <Link to="/">
              <LogOut />
              Salir del portal
            </Link>
          </Button>
          <p className="px-3 pt-3 text-[10px] text-muted-foreground">
            Portal: {path.slice(1) || "inicio"}
          </p>
        </div>
      </aside>
      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
