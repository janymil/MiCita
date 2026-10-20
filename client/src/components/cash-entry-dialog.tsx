import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  DESK_PAYMENT_METHODS,
  METHOD_LABELS,
  deskRequest,
  type DeskPaymentMethod,
  type DeskService,
} from "@/lib/desk-api";

interface CashEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  services: DeskService[];
  paymentMethods?: DeskPaymentMethod[];
}

/** Quick income log for money that never went through online checkout. */
export default function CashEntryDialog({
  open,
  onOpenChange,
  businessId,
  services,
  paymentMethods,
}: CashEntryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState("none");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("yape");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledMethods =
    paymentMethods && paymentMethods.length > 0 ? paymentMethods : [...DESK_PAYMENT_METHODS];

  useEffect(() => {
    if (!open) return;
    setServiceId("none");
    setAmount("");
    setMethod(enabledMethods[0] ?? "yape");
    setNote("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const numericAmount = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ title: "Escribe un monto mayor a 0", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await deskRequest(`/api/dashboard/businesses/${businessId}/cashflow/transactions`, "POST", {
        serviceId: serviceId === "none" ? undefined : Number(serviceId),
        amount: numericAmount.toFixed(2),
        method,
        note: note.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/cashflow/summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/financials`] });
      toast({ title: "Ingreso registrado", description: `${METHOD_LABELS[method] ?? method}` });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo registrar el ingreso",
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
            <Plus className="h-5 w-5" />
            Registrar ingreso
          </DialogTitle>
          <DialogDescription>
            Para clientes sin cita o pagos que no pasaron por la app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cash-amount">Monto (S/)</Label>
              <Input
                id="cash-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="25"
                className="h-12 text-base"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-method">Pagó con</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="cash-method" className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledMethods.map((option) => (
                    <SelectItem key={option} value={option}>
                      {METHOD_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-service">Servicio (opcional)</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="cash-service">
                <SelectValue placeholder="Sin servicio específico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin servicio específico</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={String(service.id)}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-note">Nota (opcional)</Label>
            <Input
              id="cash-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Corte a domicilio"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="h-12 w-full text-base" onClick={submit} disabled={isSubmitting}>
            Guardar ingreso
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
