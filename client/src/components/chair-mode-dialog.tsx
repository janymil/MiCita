import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  DeskApiError,
  deskRequest,
  formatPEN,
  type DeskChairState,
  type DeskService,
} from "@/lib/desk-api";

interface ChairModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  services: DeskService[];
  chair: DeskChairState;
}

/**
 * "Sentar cliente ahora" — two taps: pick a service, (optionally) a name.
 * Everything else (time, duration, price, source) is derived server-side.
 */
export default function ChairModeDialog({
  open,
  onOpenChange,
  businessId,
  services,
  chair,
}: ChairModeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chairConflict, setChairConflict] = useState<{ until: string | null } | null>(null);

  const activeServices = services.filter((service) => service.isActive !== false);

  useEffect(() => {
    if (!open) return;
    setServiceId(activeServices[0] ? String(activeServices[0].id) : "");
    setName("");
    setPhone("");
    setNotes("");
    setChairConflict(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidateDesk = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/clients`] });
  };

  const submit = async (force: boolean) => {
    if (!serviceId) {
      toast({ title: "Elige un servicio", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await deskRequest(`/api/dashboard/businesses/${businessId}/walk-ins`, "POST", {
        serviceId: Number(serviceId),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        force,
      });
      invalidateDesk();
      toast({
        title: "Cliente sentado",
        description: `${name.trim() || "Cliente"} ya está en la silla.`,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof DeskApiError && error.status === 409) {
        setChairConflict({ until: error.payload?.chair?.until ?? chair.until ?? null });
        return;
      }
      toast({
        title: "No se pudo sentar al cliente",
        description: error instanceof Error ? error.message : "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Sentar cliente ahora
          </DialogTitle>
          <DialogDescription>
            Sin cita previa. La silla queda ocupada automáticamente por la duración del servicio.
          </DialogDescription>
        </DialogHeader>

        {activeServices.length === 0 ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Todavía no tienes servicios activos. Crea uno para poder registrar clientes del día.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/servicios" onClick={() => onOpenChange(false)}>
                Crear mi primer servicio
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="chair-service">Servicio</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="chair-service" className="h-12 text-base">
                  <SelectValue placeholder="Elige el servicio" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                      {service.price ? ` — ${formatPEN(service.price)}` : ""}
                      {service.duration ? ` (${service.duration} min)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chair-name">Nombre (opcional)</Label>
                <Input
                  id="chair-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Carlos"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chair-phone">Celular (opcional)</Label>
                <Input
                  id="chair-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="999 999 999"
                  inputMode="tel"
                  maxLength={30}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chair-notes">Nota (opcional)</Label>
              <Textarea
                id="chair-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Degradado, sin máquina…"
                rows={2}
                maxLength={500}
              />
            </div>

            {chairConflict && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  La silla sigue ocupada
                </p>
                <p className="mt-1">
                  {chairConflict.until
                    ? `Libre aproximadamente a las ${chairConflict.until}.`
                    : "Termina el servicio actual o siéntalo igual (doble turno)."}
                </p>
              </div>
            )}
          </div>
        )}

        {activeServices.length > 0 && (
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="h-12 w-full text-base font-semibold"
              onClick={() => submit(Boolean(chairConflict))}
              disabled={isSubmitting}
            >
              {chairConflict ? "Sentar igual" : "Sentar cliente"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
