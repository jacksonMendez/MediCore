import { ArrowUp, Bot, Clock3, FileText, Paperclip } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";

type Message = { id: number; from: "assistant" | "user"; text: string };

export function extractAvailableTimeSlots(text: string): string[] {
  if (!text) return [];

  const lower = text.toLowerCase();

  // Exclude messages that are confirmations, cancellations, or info messages
  if (
    lower.includes("cita agendada") ||
    lower.includes("cita confirmada") ||
    lower.includes("cita cancelada") ||
    lower.includes("ha sido cancelada") ||
    lower.includes("pqr registrada") ||
    lower.includes("pqr radicada") ||
    lower.includes("solicitud de pqr") ||
    lower.includes("horario de atención")
  ) {
    return [];
  }

  // Must be in a context suggesting availability or booking
  const isAvailabilityContext =
    lower.includes("disponib") ||
    lower.includes("horario") ||
    lower.includes("turno") ||
    lower.includes("agenda") ||
    lower.includes("agendar") ||
    lower.includes("elegir") ||
    lower.includes("prefieres") ||
    lower.includes("opciones") ||
    lower.includes("cupo");

  if (!isAvailabilityContext) return [];

  const slots: string[] = [];
  const seen = new Set<string>();

  // 1. Match 12-hour times: e.g. 8:00 a. m., 9:30 a.m., 2:00 p. m., 11:00 am, 4:30 PM
  const regex12 = /(?:^|[^\d])([0-1]?[0-9]):([0-5][0-9])\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm|AM|PM)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex12.exec(text)) !== null) {
    const hour = parseInt(match[1], 10);
    const minute = match[2];
    const period = match[3].toLowerCase();

    if (hour >= 1 && hour <= 12) {
      const isPm = period.includes("p");
      const formattedPeriod = isPm ? "p. m." : "a. m.";
      const formatted = `${hour}:${minute} ${formattedPeriod}`;
      if (!seen.has(formatted)) {
        seen.add(formatted);
        slots.push(formatted);
      }
    }
  }

  // 2. If no 12-hour matches, look for 24-hour times: e.g. 08:00, 09:30, 14:00
  if (slots.length === 0) {
    const regex24 = /(?:^|[^\d])([0-2]?[0-9]):([0-5][0-9])(?!\s*(?:a|p|A|P))/g;
    while ((match = regex24.exec(text)) !== null) {
      const rawHour = parseInt(match[1], 10);
      const minute = match[2];
      if (rawHour >= 6 && rawHour <= 21) {
        const isPm = rawHour >= 12;
        let hour12 = rawHour % 12;
        if (hour12 === 0) hour12 = 12;
        const formattedPeriod = isPm ? "p. m." : "a. m.";
        const formatted = `${hour12}:${minute} ${formattedPeriod}`;
        if (!seen.has(formatted)) {
          seen.add(formatted);
          slots.push(formatted);
        }
      }
    }
  }

  return slots;
}

const suggestions = ["Ver mi próxima cita", "¿Cómo prepararme?", "Consultar un pago"];

export function PatientChat({ compact = false, className, mode = "patient" }: { compact?: boolean; className?: string; mode?: "patient" | "doctor" }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (mode === "doctor") {
      return [{ id: 1, from: "assistant", text: "Buenos días, doctor. Puedo ayudarle a preparar consultas, resumir notas y organizar seguimientos. ¿Qué necesita revisar?" }];
    }
    const user = getUser();
    const nombre = user?.nombre_completo ? user.nombre_completo.split(" ")[0] : "estimado paciente";
    return [{ id: 1, from: "assistant", text: `Hola, ${nombre}. Puedo orientarte sobre tus citas, pagos o síntomas generales. ¿En qué te ayudo hoy?` }];
  });
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const userMsgId = Date.now();
    setMessages((current) => [
      ...current,
      { id: userMsgId, from: "user", text: clean },
    ]);
    setDraft("");
    setLoading(true);

    try {
      const res = await apiFetch<{
        respuesta: string;
        sesion_id?: string;
        herramientas_usadas?: any[];
      }>("/chat/mensaje", {
        method: "POST",
        body: JSON.stringify({
          mensaje: clean,
          sesion_id: sessionId || undefined,
        }),
      });

      if (res.sesion_id) {
        setSessionId(res.sesion_id);
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          from: "assistant",
          text: res.respuesta || "No recibí respuesta del asistente.",
        },
      ]);
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          from: "assistant",
          text: err.message || "Lo sentimos, ocurrió un error al consultar al asistente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card",
        compact ? "min-h-[380px]" : "min-h-[480px]",
        className,
      )}
    >
      <div className="shrink-0 flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <Bot className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold">{mode === "doctor" ? "Copiloto clínico" : "Asistente MediCore"}</h2>
          <p className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success" />
             {mode === "doctor" ? "Apoyo a la consulta" : "Orientación clínica"}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
        {messages.map((message) => {
          const slots = message.from === "assistant" ? extractAvailableTimeSlots(message.text) : [];
          return (
            <div key={message.id} className={cn("flex flex-col", message.from === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[84%] text-sm leading-6 whitespace-pre-wrap",
                  message.from === "user"
                    ? "rounded-md bg-primary px-4 py-2.5 text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {message.text}
              </div>
              {slots.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2 max-w-[84%]">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-medium border-border/80 bg-background/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer group"
                      disabled={loading}
                      onClick={() => send(`Quiero agendar a las ${slot}`)}
                    >
                      <Clock3 className="size-3 mr-1 text-primary group-hover:text-primary-foreground transition-colors" />
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="flex">
            <div className="max-w-[84%] text-sm leading-6 text-muted-foreground animate-pulse">
              Consultando asistente...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="shrink-0 space-y-3 border-t border-border p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => send(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </Button>
          ))}
        </div>
        <form onSubmit={submit} className="relative">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe tu consulta…"
            className="min-h-20 resize-none pb-11 pr-12"
            disabled={loading}
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button type="button" size="icon" variant="ghost" aria-label="Adjuntar archivo" disabled={loading} className="size-8">
                <Paperclip className="size-4" />
              </Button>
              {mode === "patient" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs font-normal border-border/80 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => send("Quiero solicitar una PQR o reembolso para una cita médica")}
                  disabled={loading}
                >
                  <FileText className="size-3.5 mr-1.5 opacity-70" />
                  Solicitar PQR / Reembolso
                </Button>
              )}
            </div>
            <Button type="submit" size="icon" aria-label="Enviar consulta" disabled={!draft.trim() || loading} className="size-8">
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
        <p className="text-center text-[11px] text-muted-foreground">
          Este asistente no reemplaza una consulta médica.
        </p>
      </div>
    </section>
  );
}
