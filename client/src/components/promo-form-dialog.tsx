import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Megaphone } from "lucide-react";
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
import { deskRequest, formatPEN, type DeskPromo, type DeskService } from "@/lib/desk-api";

interface PromoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  services: DeskService[];
  onCreated: (promo: DeskPromo) => void;
}

const todayISO = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

/** Owner form for a dead-hour promo: service, price, window, capacity. */
export default function PromoFormDialog({
  open,
  onOpenChange,
  businessId,
  services,
  onCreated,
}: PromoFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("11:00");
  const [endTime, setEndTime] = useState("15:00");
  const [capacity, setCapacity] = useState("3");
  const [message, setMessage] = useState("");

  const activeServices = services.filter((service) => service.isActive !== false);
  const selectedService = activeServices.find((service) => String(service.id) === serviceId);

  useEffect(() => {
    if (!open) return;
    const first = activeServices[0];
    setServiceId(first ? String(first.id) : "");
    setTitle(first ? `Promo ${first.name}` : "");
    setPromoPrice(first?.price ? String(parseFloat(first.price) * 0.7).slice(0, 5) : "");
    setDate(todayISO());
    setStartTime("11:00");
    setEndTime("15:00");
    setCapacity("3");
    setMessage("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectService = (value: string) => {
    setServiceId(value);
    const service = activeServices.find((item) => String(item.id) === value);
    if (service) {
      setTitle(`Promo ${service.name}`);
      if (service.price) setPromoPrice(String(parseFloat(service.price) * 0.7).slice(0, 5));
    }
  };

  const slotCount = useMemo(() => {
    const toMinutes = (value: string) => {
      const [h, m] = value.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const duration = selectedService?.duration && selectedService.duration > 0
      ? selectedService.duration
      : 30;
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (end <= start) return 0;
    return Math.max(0, Math.floor((end - start) / duration));
  }, [selectedService, startTime, endTime]);

  const createMutation = useMutation({
    mutationFn: () =>
      deskRequest<DeskPromo>(`/api/dashboard/businesses/${businessId}/promos`, "POST", {
        serviceId: Number(serviceId),
        title: title.trim(),
        promoPrice: Number(String(promoPrice).replace(",", ".")),
        date,
        startTime,
        endTime,
        capacity: Number(capacity),
        message: message.trim() || undefined,
      }),
    onSuccess: (promo) => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/promos`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
      toast({ title: "Promo creada", description: "Compártela por WhatsApp o imprime el QR." });
      onOpenChange(false);
      onCreated(promo);
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo crear la promo",
        description: error?.message ?? "Revisa los datos",
        variant: "destructive",
      }),
  });

  const canSubmit =
    Boolean(serviceId) &&
    title.trim().length >= 3 &&
    Number(String(promoPrice).replace(",", ".")) > 0 &&
    slotCount > 0 &&
    Number(capacity) >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Nueva promo de hora muerta
          </DialogTitle>
          <DialogDescription>
            Elige el servicio, el precio especial y la ventana. Los clientes reservan su hora
            desde el link o QR.
          </DialogDescription>
        </DialogHeader>

        {activeServices.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Primero crea un servicio para poder armar una promo.
            </p>
            <Button asChild className="w-full">
              <a href="/dashboard/servicios" onClick={() => onOpenChange(false)}>
                Crear servicio
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select value={serviceId} onValueChange={selectService}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                      {service.price ? ` — normal ${formatPEN(service.price)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="promo-title">Título</Label>
                <Input
                  id="promo-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-price">Precio promo (S/)</Label>
                <Input
                  id="promo-price"
                  value={promoPrice}
                  onChange={(event) => setPromoPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-capacity">Cupos</Label>
                <Input
                  id="promo-capacity"
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-date">Fecha</Label>
              <Input
                id="promo-date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="promo-start">Desde</Label>
                <Input
                  id="promo-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-end">Hasta</Label>
                <Input
                  id="promo-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>
            </div>

            <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              {slotCount > 0
                ? `${slotCount} horarios posibles según la duración del servicio`
                : "La ventana es demasiado corta para este servicio"}
            </p>

            <div className="space-y-2">
              <Label htmlFor="promo-message">Mensaje para compartir (opcional)</Label>
              <Textarea
                id="promo-message"
                rows={2}
                maxLength={500}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Usa {titulo}, {precio}, {negocio} y {link}"
              />
            </div>
          </div>
        )}

        {activeServices.length > 0 && (
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="h-12 w-full text-base font-semibold"
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
            >
              Crear promo y ver QR
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
