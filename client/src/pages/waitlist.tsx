import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { CalendarClock, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicJson } from "@/lib/public-api";

interface WaitlistSnapshot {
  business: { id: number; name: string; phone: string | null };
  enabled: boolean;
  date: string;
  services: Array<{ id: number; name: string; duration: number | null; price: string | null }>;
}

interface JoinResult {
  entry: { token: string; date: string; status: string };
  alreadyJoined: boolean;
  position: number;
  message: string;
}

const todayLima = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

export default function WaitlistPage() {
  const { businessId: rawBusinessId } = useParams<{ businessId: string }>();
  const businessId = Number(rawBusinessId);
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [serviceId, setServiceId] = useState(params?.get("serviceId") ?? "");
  const [date, setDate] = useState(params?.get("date") ?? todayLima());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<JoinResult | null>(null);

  const { data, isLoading, error } = useQuery<WaitlistSnapshot>({
    queryKey: [`/api/public/waitlist/${businessId}`],
    enabled: Number.isInteger(businessId) && businessId > 0,
  });

  const submit = async () => {
    if (!serviceId || !date || !name.trim() || !phone.trim()) {
      setMessage("Completa el servicio, la fecha y tus datos.");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const joined = await publicJson<JoinResult>(`/api/public/waitlist/${businessId}`, "POST", {
        serviceId: Number(serviceId),
        date,
        name: name.trim(),
        phone: phone.trim(),
      });
      setResult(joined);
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo entrar a la lista");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
      </div>
    );
  }

  if (error || !data || !data.enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-neutral-400" />
            <h1 className="text-xl font-bold">Lista de espera no disponible</h1>
            <p className="text-sm text-muted-foreground">
              Este negocio no está usando la lista de espera ahora.
            </p>
            <Button className="w-full" onClick={() => (window.location.href = "/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-red-600" />
              Lista de espera · {data.business.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h2 className="text-xl font-bold">
                  {result.alreadyJoined ? "Ya estabas en la lista" : "¡Quedaste en la lista!"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Puesto #{result.position} para {result.entry.date}. Te avisaremos por WhatsApp
                  si se libera un cupo.
                </p>
                <Button asChild className="w-full">
                  <a href={`/lista/t/${result.entry.token}`}>Ver mi lugar</a>
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
                  Agregar otra fecha
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Si no encuentras horario, déjanos tus datos y te avisamos cuando alguien cancele.
                </p>

                <div className="space-y-2">
                  <Label>Servicio</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.services.map((service) => (
                        <SelectItem key={service.id} value={String(service.id)}>
                          {service.name}
                          {service.price ? ` · S/ ${service.price}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waitlist-date">Fecha que te interesa</Label>
                  <Input
                    id="waitlist-date"
                    type="date"
                    min={todayLima()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-name">Tu nombre</Label>
                    <Input
                      id="waitlist-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-phone">Celular / WhatsApp</Label>
                    <Input
                      id="waitlist-phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      inputMode="tel"
                      maxLength={30}
                      placeholder="999 999 999"
                    />
                  </div>
                </div>

                {message && <p className="text-sm text-red-600">{message}</p>}

                <Button className="w-full" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? "Guardando…" : "Avísame si se libera"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Solo te escribimos si se libera un cupo para el servicio y día elegidos.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
