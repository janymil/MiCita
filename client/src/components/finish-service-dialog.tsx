import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Wallet } from "lucide-react";
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
  formatPEN,
  type DeskAppointment,
  type DeskPaymentMethod,
} from "@/lib/desk-api";

interface FinishServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  appointment: DeskAppointment | null;
  paymentMethods?: DeskPaymentMethod[];
  allowTips?: boolean;
}

/**
 * "Terminar y cobrar": one tap logs the income (Yape/Plin/efectivo) and frees
 * the chair. The transaction is written in the same request as the completion.
 */
export default function FinishServiceDialog({
  open,
  onOpenChange,
  businessId,
  appointment,
  paymentMethods,
  allowTips = true,
}: FinishServiceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("yape");
  const [amount, setAmount] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [note, setNote] = useState("");
  const [packageId, setPackageId] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledMethods =
    paymentMethods && paymentMethods.length > 0 ? paymentMethods : [...DESK_PAYMENT_METHODS];

  const { data: packageData } = useQuery<{
    packages: Array<{
      purchase: { id: number; usesRemaining: number; usesTotal: number; status: string };
      packageName: string;
      serviceId: number | null;
    }>;
  }>({
    queryKey: [
      `/api/dashboard/businesses/${businessId}/appointments/${appointment?.id}/package`,
    ],
    enabled: Boolean(open && appointment?.id),
    queryFn: () =>
      deskRequest(
        `/api/dashboard/businesses/${businessId}/appointments/${appointment?.id}/package`,
      ),
  });

  const applicablePackages = packageData?.packages ?? [];

  useEffect(() => {
    if (!open || !appointment) return;
    setMethod(enabledMethods[0] ?? "yape");
    const price = Number(appointment.price ?? 0);
    const depositPaid =
      appointment.depositStatus === "paid" ? Number(appointment.depositAmount ?? 0) : 0;
    setAmount(price > 0 ? String(Math.max(0, Math.round((price - depositPaid) * 100) / 100)) : "");
    setTipAmount("");
    setNote("");
    setPackageId("none");
  }, [open, appointment]); // eslint-disable-line react-hooks/exhaustive-deps

  const paidDeposit =
    appointment?.depositStatus === "paid" ? Number(appointment.depositAmount ?? 0) : 0;

  const selectPackage = (value: string) => {
    setPackageId(value);
    if (!appointment) return;
    if (value !== "none") {
      setAmount("0");
      return;
    }
    const price = Number(appointment.price ?? 0);
    setAmount(price > 0 ? String(Math.max(0, Math.round((price - paidDeposit) * 100) / 100)) : "");
  };

  const invalidateDesk = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/queue`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/cashflow/summary`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/financials`] });
  };

  const finish = async (collect: boolean) => {
    if (!appointment) return;
    setIsSubmitting(true);
    try {
      const payload = collect
        ? {
            method,
            amount: amount.trim() === "" ? undefined : Number(amount),
            tipAmount: tipAmount.trim() === "" ? undefined : Number(tipAmount),
            note: note.trim() || undefined,
            packagePurchaseId: packageId !== "none" ? Number(packageId) : undefined,
          }
        : { packagePurchaseId: packageId !== "none" ? Number(packageId) : undefined };

      const result = await deskRequest<{
        packageRedemption?: { usesRemaining: number } | null;
      }>(
        `/api/dashboard/businesses/${businessId}/appointments/${appointment.id}/finish`,
        "PATCH",
        payload,
      );
      invalidateDesk();
      toast({
        title: collect ? "Cobrado y terminado" : "Servicio terminado",
        description:
          result?.packageRedemption
            ? `Bono usado · quedan ${result.packageRedemption.usesRemaining} usos`
            : collect
              ? `${formatPEN(Number(amount) || 0)} en ${METHOD_LABELS[method] ?? method}`
              : "La silla quedó libre.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo terminar el servicio",
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
            <CheckCircle2 className="h-5 w-5" />
            Terminar y cobrar
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? `${appointment.clientName} — ${appointment.serviceName}`
              : "Registra el pago del servicio."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="finish-method">Pagó con</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="finish-method" className="h-12 text-base">
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
            <div className="space-y-2">
              <Label htmlFor="finish-amount">Monto (S/)</Label>
              <Input
                id="finish-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="25"
                className="h-12 text-base"
              />
            </div>
          </div>

          {paidDeposit > 0 && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              Depósito ya pagado: {formatPEN(paidDeposit)}. El monto sugerido es solo el saldo.
            </p>
          )}

          {applicablePackages.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="finish-package">Bono prepagado</Label>
              <Select value={packageId} onValueChange={selectPackage}>
                <SelectTrigger id="finish-package" className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No usar bono</SelectItem>
                  {applicablePackages.map((item) => (
                    <SelectItem key={item.purchase.id} value={String(item.purchase.id)}>
                      {item.packageName} · quedan {item.purchase.usesRemaining}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si usas el bono, el monto sugerido es S/ 0. El servicio ya está pagado.
              </p>
            </div>
          )}

          <div className={allowTips ? "grid grid-cols-2 gap-3" : "space-y-3"}>
            {allowTips && (
              <div className="space-y-2">
                <Label htmlFor="finish-tip">Propina (opcional)</Label>
                <Input
                  id="finish-tip"
                  value={tipAmount}
                  onChange={(event) => setTipAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="finish-note">Nota (opcional)</Label>
              <Input
                id="finish-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Cliente frecuente"
                maxLength={500}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="h-12 w-full text-base font-semibold"
            onClick={() => finish(true)}
            disabled={isSubmitting}
          >
            <Wallet className="mr-2 h-5 w-5" />
            Cobrar y terminar
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => finish(false)} disabled={isSubmitting}>
            Terminar sin cobrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
