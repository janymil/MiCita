import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Copy, HeartHandshake, ListOrdered, Megaphone, QrCode, Save, ShieldCheck, Star, Users, Gift, Ticket, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DESK_PAYMENT_METHODS,
  METHOD_LABELS,
  deskRequest,
  type DeskPaymentMethod,
  type DeskSettings,
} from "@/lib/desk-api";

interface DeskSettingsCardProps {
  businessId: number;
}

/**
 * Self-service configuration for the owner desk. Everything here is saved on
 * `business_settings.desk_settings` and immediately changes the public queue
 * and the cash dialogs — no admin involvement.
 */
export default function DeskSettingsCard({ businessId }: DeskSettingsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DeskSettings | null>(null);

  const { data, isLoading } = useQuery<DeskSettings>({
    queryKey: [`/api/dashboard/businesses/${businessId}/desk-settings`],
    enabled: Boolean(businessId),
  });

  const { data: paymentConfig } = useQuery<{ configured: boolean; sandbox?: boolean }>({
    queryKey: ["/api/payments/config"],
    queryFn: async () => {
      const response = await fetch("/api/payments/config");
      return response.json();
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: DeskSettings) =>
      deskRequest<DeskSettings>(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", payload),
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/desk-settings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/queue`] });
      toast({ title: "Configuración guardada", description: "Los cambios ya están activos." });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo guardar",
        description: error?.message ?? "Revisa los valores e intenta de nuevo",
        variant: "destructive",
      }),
  });

  const runRemindersMutation = useMutation({
    mutationFn: () =>
      deskRequest<{ scanned: number; sent: number; skipped: number; disabled: number; errors: number }>(
        `/api/dashboard/businesses/${businessId}/reminders/run`,
        "POST",
        {},
      ),
    onSuccess: (summary) => {
      toast({
        title: "Recordatorios procesados",
        description: `${summary.scanned} revisados · ${summary.sent} enviados · ${summary.skipped} omitidos${
          summary.disabled ? ` · ${summary.disabled} con recordatorios apagados` : ""
        }`,
      });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudieron enviar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const runReviewsMutation = useMutation({
    mutationFn: () =>
      deskRequest<{ scanned: number; sent: number; skipped: number; disabled: number; errors: number }>(
        `/api/dashboard/businesses/${businessId}/reviews/run`,
        "POST",
        {},
      ),
    onSuccess: (summary) => {
      toast({
        title: "Solicitudes de reseña procesadas",
        description: `${summary.scanned} revisadas · ${summary.sent} enviadas · ${summary.skipped} omitidas${
          summary.disabled ? ` · ${summary.disabled} con reseñas apagadas` : ""
        }`,
      });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudieron enviar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  if (isLoading || !form) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
        </CardContent>
      </Card>
    );
  }

  const update = <K extends keyof DeskSettings>(key: K, value: DeskSettings[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const toggleMethod = (method: DeskPaymentMethod) => {
    const enabled = form.paymentMethods.includes(method);
    if (enabled && form.paymentMethods.length === 1) {
      toast({
        title: "Deja al menos un método de pago",
        description: "Necesitas al menos una forma de cobrar.",
        variant: "destructive",
      });
      return;
    }
    update(
      "paymentMethods",
      enabled ? form.paymentMethods.filter((item) => item !== method) : [...form.paymentMethods, method],
    );
  };

  const queueLink =
    typeof window !== "undefined" ? `${window.location.origin}/q/${businessId}` : `/q/${businessId}`;

  const copyQueueLink = async () => {
    try {
      await navigator.clipboard.writeText(queueLink);
      toast({ title: "Enlace copiado", description: queueLink });
    } catch {
      toast({ title: "Copia manualmente", description: queueLink });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListOrdered className="mr-2 h-5 w-5" />
            Cola virtual (Saca tu turno)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Usar cola virtual</Label>
              <p className="text-sm text-gray-600">
                Muestra el botón "Saca tu turno" y permite que los clientes se anoten desde el QR.
              </p>
            </div>
            <Switch
              checked={form.queueEnabled}
              onCheckedChange={(checked) => update("queueEnabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Cola abierta ahora</Label>
              <p className="text-sm text-gray-600">
                Apágala al cerrar el local o cuando estés lleno; los turnos ya tomados siguen válidos.
              </p>
            </div>
            <Switch
              checked={form.queueOpen}
              onCheckedChange={(checked) => update("queueOpen", checked)}
              disabled={!form.queueEnabled}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-queue">Máximo de personas en cola</Label>
              <Input
                id="max-queue"
                type="number"
                min={0}
                max={200}
                value={form.maxQueueLength}
                onChange={(event) => update("maxQueueLength", Number(event.target.value))}
              />
              <p className="text-xs text-gray-500">0 = sin límite.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-duration">Duración por defecto (min)</Label>
              <Input
                id="default-duration"
                type="number"
                min={5}
                max={240}
                value={form.defaultDurationMinutes}
                onChange={(event) => update("defaultDurationMinutes", Number(event.target.value))}
              />
              <p className="text-xs text-gray-500">
                Se usa cuando un servicio no tiene duración (para calcular el tiempo de espera).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Actualizaciones automáticas por WhatsApp</Label>
              <p className="text-sm text-gray-600">
                El cliente recibe su posición al entrar y un aviso cuando ya casi es su turno.
              </p>
            </div>
            <Switch
              checked={form.queueWhatsappEnabled}
              onCheckedChange={(checked) => update("queueWhatsappEnabled", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="queue-joined-template">Mensaje al tomar turno</Label>
            <Textarea
              id="queue-joined-template"
              rows={3}
              maxLength={400}
              value={form.queueJoinedTemplate}
              onChange={(event) => update("queueJoinedTemplate", event.target.value)}
              disabled={!form.queueWhatsappEnabled}
            />
            <p className="text-xs text-gray-500">
              Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>, <code>{"{posicion}"}</code>,{" "}
              <code>{"{minutos}"}</code> y <code>{"{link}"}</code>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queue-called-template">Mensaje cuando ya es su turno</Label>
            <Textarea
              id="queue-called-template"
              rows={3}
              maxLength={400}
              value={form.queueCalledTemplate}
              onChange={(event) => update("queueCalledTemplate", event.target.value)}
              disabled={!form.queueWhatsappEnabled}
            />
            <p className="text-xs text-gray-500">
              Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code> y <code>{"{link}"}</code>.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
            <img
              src={`/api/public/queue/${businessId}/qr`}
              alt="QR de la cola"
              className="h-28 w-28 self-center rounded-md border bg-white p-1 sm:self-auto"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <QrCode className="h-4 w-4" />
                Tu QR público
              </p>
              <p className="truncate text-xs text-gray-500">{queueLink}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={copyQueueLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar enlace
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="mr-2 h-5 w-5" />
            Bonos prepagados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Vender bonos de servicios</Label>
              <p className="text-sm text-gray-600">
                Paquetes de varios usos pagados por adelantado; se descuentan al terminar cada
                servicio.
              </p>
            </div>
            <Switch
              checked={form.packagesEnabled}
              onCheckedChange={(checked) => update("packagesEnabled", checked)}
            />
          </div>

          {form.packagesEnabled && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <Label className="text-base font-medium">Mostrar en el micrositio</Label>
                  <p className="text-sm text-gray-600">
                    Tus bonos activos aparecen con botón de compra en tu página pública.
                  </p>
                </div>
                <Switch
                  checked={form.showPackagesOnMicrosite}
                  onCheckedChange={(checked) => update("showPackagesOnMicrosite", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-sale-message">Mensaje al vender un bono</Label>
                <Textarea
                  id="package-sale-message"
                  rows={3}
                  maxLength={400}
                  value={form.packageSaleMessageTemplate}
                  onChange={(event) => update("packageSaleMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>,{" "}
                  <code>{"{paquete}"}</code>, <code>{"{usos}"}</code> y <code>{"{link}"}</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-use-message">Mensaje al usar un bono</Label>
                <Textarea
                  id="package-use-message"
                  rows={3}
                  maxLength={400}
                  value={form.packageUseMessageTemplate}
                  onChange={(event) => update("packageUseMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>,{" "}
                  <code>{"{paquete}"}</code>, <code>{"{restantes}"}</code> y{" "}
                  <code>{"{link}"}</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-low-message">Aviso cuando queda 1 uso</Label>
                <Textarea
                  id="package-low-message"
                  rows={2}
                  maxLength={400}
                  value={form.packageLowBalanceMessageTemplate}
                  onChange={(event) =>
                    update("packageLowBalanceMessageTemplate", event.target.value)
                  }
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{paquete}"}</code> y{" "}
                  <code>{"{link}"}</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-expiry-message">Aviso antes de vencer</Label>
                <Textarea
                  id="package-expiry-message"
                  rows={2}
                  maxLength={400}
                  value={form.packageExpiryMessageTemplate}
                  onChange={(event) => update("packageExpiryMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{paquete}"}</code>,{" "}
                  <code>{"{restantes}"}</code>, <code>{"{fecha}"}</code> y{" "}
                  <code>{"{link}"}</code>.
                </p>
              </div>

              <Button asChild type="button" variant="outline">
                <a href="/dashboard/packages">
                  <Ticket className="mr-2 h-4 w-4" /> Crear y vender bonos
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="mr-2 h-5 w-5" />
            Tarjeta de fidelidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Sellos por visita</Label>
              <p className="text-sm text-gray-600">
                Cada servicio terminado suma un sello; al completar la tarjeta el cliente gana el
                premio.
              </p>
            </div>
            <Switch
              checked={form.loyaltyEnabled}
              onCheckedChange={(checked) => update("loyaltyEnabled", checked)}
            />
          </div>

          {form.loyaltyEnabled && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <Label className="text-base font-medium">Mostrar en el micrositio</Label>
                  <p className="text-sm text-gray-600">
                    Agrega el botón “Ver mi tarjeta” a tu página pública.
                  </p>
                </div>
                <Switch
                  checked={form.showLoyaltyOnMicrosite}
                  onCheckedChange={(checked) => update("showLoyaltyOnMicrosite", checked)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loyalty-required">Sellos para el premio</Label>
                  <Input
                    id="loyalty-required"
                    type="number"
                    min={2}
                    max={20}
                    value={form.loyaltyStampsRequired}
                    onChange={(event) =>
                      update("loyaltyStampsRequired", Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loyalty-reward">Premio</Label>
                  <Input
                    id="loyalty-reward"
                    value={form.loyaltyReward}
                    onChange={(event) => update("loyaltyReward", event.target.value)}
                    maxLength={80}
                    placeholder="Un corte gratis"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loyalty-message">Mensaje al ganar un sello</Label>
                <Textarea
                  id="loyalty-message"
                  rows={3}
                  maxLength={400}
                  value={form.loyaltyMessageTemplate}
                  onChange={(event) => update("loyaltyMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>,{" "}
                  <code>{"{sellos}"}</code>, <code>{"{meta}"}</code> y <code>{"{link}"}</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loyalty-reward-message">Mensaje al completar la tarjeta</Label>
                <Textarea
                  id="loyalty-reward-message"
                  rows={3}
                  maxLength={400}
                  value={form.loyaltyRewardMessageTemplate}
                  onChange={(event) => update("loyaltyRewardMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>,{" "}
                  <code>{"{recompensa}"}</code> y <code>{"{link}"}</code>.
                </p>
              </div>

              <Button asChild type="button" variant="outline">
                <a href="/dashboard/loyalty">
                  <Gift className="mr-2 h-4 w-4" /> Ver tarjetas y canjear
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Lista de espera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Avisar cuando se libere un cupo</Label>
              <p className="text-sm text-gray-600">
                Si alguien cancela, los clientes en espera reciben un WhatsApp con un link para
                quedarse con el horario.
              </p>
            </div>
            <Switch
              checked={form.waitlistEnabled}
              onCheckedChange={(checked) => update("waitlistEnabled", checked)}
            />
          </div>

          {form.waitlistEnabled && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <Label className="text-base font-medium">Mostrar en el micrositio</Label>
                  <p className="text-sm text-gray-600">
                    Agrega el botón “Lista de espera” a tu página pública.
                  </p>
                </div>
                <Switch
                  checked={form.showWaitlistOnMicrosite}
                  onCheckedChange={(checked) => update("showWaitlistOnMicrosite", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-limit">Cuántos clientes avisar por cupo</Label>
                <Input
                  id="waitlist-limit"
                  type="number"
                  min={1}
                  max={10}
                  value={form.waitlistNotifyLimit}
                  onChange={(event) => update("waitlistNotifyLimit", Number(event.target.value))}
                />
                <p className="text-xs text-gray-500">
                  El primero que confirme se queda con el horario; el resto sigue en la lista.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-message">Mensaje de WhatsApp</Label>
                <Textarea
                  id="waitlist-message"
                  rows={3}
                  maxLength={400}
                  value={form.waitlistMessageTemplate}
                  onChange={(event) => update("waitlistMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>, <code>{"{servicio}"}</code>,{" "}
                  <code>{"{fecha}"}</code>, <code>{"{hora}"}</code> y <code>{"{link}"}</code>.
                </p>
              </div>

              <Button asChild type="button" variant="outline">
                <a href={`/lista/${businessId}`} target="_blank" rel="noopener noreferrer">
                  <Users className="mr-2 h-4 w-4" />
                  Abrir lista pública
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Cobros y propinas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-base font-medium">Métodos que aceptas</Label>
            <p className="mb-3 text-sm text-gray-600">
              Solo estos aparecen en “Terminar y cobrar” y en “Registrar ingreso”.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DESK_PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm hover:bg-gray-50"
                >
                  <Checkbox
                    checked={form.paymentMethods.includes(method)}
                    onCheckedChange={() => toggleMethod(method)}
                  />
                  {METHOD_LABELS[method]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Permitir propinas</Label>
              <p className="text-sm text-gray-600">Muestra el campo de propina al cobrar.</p>
            </div>
            <Switch
              checked={form.allowTips}
              onCheckedChange={(checked) => update("allowTips", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5" />
            Depósitos anti no-show
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Pedir depósito al reservar</Label>
              <p className="text-sm text-gray-600">
                La cita queda pendiente hasta que el cliente pague el depósito o tú lo registres.
              </p>
            </div>
            <Switch
              checked={form.depositEnabled}
              onCheckedChange={(checked) => update("depositEnabled", checked)}
            />
          </div>

          {form.depositEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deposit-type">Tipo de depósito</Label>
                  <Select
                    value={form.depositType}
                    onValueChange={(value: "percent" | "fixed") => update("depositType", value)}
                  >
                    <SelectTrigger id="deposit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Porcentaje del servicio</SelectItem>
                      <SelectItem value="fixed">Monto fijo en soles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-value">
                    {form.depositType === "percent" ? "Porcentaje (%)" : "Monto (S/)"}
                  </Label>
                  <Input
                    id="deposit-value"
                    type="number"
                    min={1}
                    max={form.depositType === "percent" ? 100 : 500}
                    value={form.depositValue}
                    onChange={(event) => update("depositValue", Number(event.target.value))}
                  />
                  <p className="text-xs text-gray-500">
                    {form.depositType === "percent"
                      ? "Ejemplo: 20% de un corte de S/ 30 = S/ 6."
                      : "Se cobra el mismo monto en todas las citas (máximo el precio del servicio)."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-hold">Minutos para pagar antes de liberar el horario</Label>
                <Input
                  id="deposit-hold"
                  type="number"
                  min={5}
                  max={120}
                  value={form.depositHoldMinutes}
                  onChange={(event) => update("depositHoldMinutes", Number(event.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-policy">Política para el cliente</Label>
                <Textarea
                  id="deposit-policy"
                  rows={2}
                  maxLength={500}
                  value={form.depositPolicy}
                  onChange={(event) => update("depositPolicy", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-message">Mensaje de WhatsApp al pedir el depósito</Label>
                <Textarea
                  id="deposit-message"
                  rows={3}
                  maxLength={400}
                  value={form.depositMessageTemplate}
                  onChange={(event) => update("depositMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>, <code>{"{fecha}"}</code>,{" "}
                  <code>{"{hora}"}</code>, <code>{"{monto}"}</code> y <code>{"{link}"}</code>.
                </p>
              </div>

              <p
                className={`rounded-lg p-3 text-sm ${
                  paymentConfig?.configured
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {paymentConfig?.configured
                  ? "MercadoPago está conectado: el cliente puede pagar el depósito con tarjeta o Yape desde su enlace de cita."
                  : "MercadoPago no está configurado. Puedes registrar depósitos en efectivo/Yape desde Hoy; el pago online se activará al conectar la pasarela."}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Megaphone className="mr-2 h-5 w-5" />
            Promociones y WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Usar promociones</Label>
              <p className="text-sm text-gray-600">
                Permite publicar horas muertas con precio especial y cupos limitados.
              </p>
            </div>
            <Switch
              checked={form.promosEnabled}
              onCheckedChange={(checked) => update("promosEnabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Mostrar cola en el micrositio</Label>
              <p className="text-sm text-gray-600">
                Tus clientes ven “Saca tu turno” y el tiempo de espera en tu página pública.
              </p>
            </div>
            <Switch
              checked={form.showQueueOnMicrosite}
              onCheckedChange={(checked) => update("showQueueOnMicrosite", checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Mostrar promos en el micrositio</Label>
              <p className="text-sm text-gray-600">
                Las promos activas aparecen como tarjetas con botón para reservar.
              </p>
            </div>
            <Switch
              checked={form.showPromosOnMicrosite}
              onCheckedChange={(checked) => update("showPromosOnMicrosite", checked)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="owner-whatsapp">Tu WhatsApp para avisos</Label>
              <Input
                id="owner-whatsapp"
                value={form.ownerWhatsApp ?? ""}
                onChange={(event) => update("ownerWhatsApp", event.target.value || null)}
                placeholder="999 999 999"
                inputMode="tel"
                maxLength={30}
              />
              <p className="text-xs text-gray-500">
                Aquí te llegan las reservas. Los clientes escriben al número oficial de MiCita,
                no al tuyo.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Avisarme de cada reserva</Label>
              <p className="text-sm text-gray-600">
                El bot central te manda un WhatsApp cuando alguien reclama una promo.
              </p>
            </div>
            <Switch
              checked={form.notifyOwnerOnClaim}
              onCheckedChange={(checked) => update("notifyOwnerOnClaim", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-message">Mensaje para compartir la promo</Label>
            <Textarea
              id="promo-message"
              rows={3}
              maxLength={300}
              value={form.promoMessageTemplate}
              onChange={(event) => update("promoMessageTemplate", event.target.value)}
            />
            <p className="text-xs text-gray-500">
              Usa <code>{"{titulo}"}</code>, <code>{"{precio}"}</code>, <code>{"{negocio}"}</code> y{" "}
              <code>{"{link}"}</code>.
            </p>
          </div>

          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            El número del bot es de <strong>MiCita</strong>. Tu WhatsApp personal queda intacto:
            solo lo usamos para avisarte a ti.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="mr-2 h-5 w-5" />
            Reseñas automáticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Pedir reseña después del servicio</Label>
              <p className="text-sm text-gray-600">
                Cuando termines una visita, el bot central envía un link para calificar el servicio.
              </p>
            </div>
            <Switch
              checked={form.reviewRequestsEnabled}
              onCheckedChange={(checked) => update("reviewRequestsEnabled", checked)}
            />
          </div>

          {form.reviewRequestsEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="review-delay">Minutos después de terminar el servicio</Label>
                <Input
                  id="review-delay"
                  type="number"
                  min={0}
                  max={1440}
                  value={form.reviewDelayMinutes}
                  onChange={(event) => update("reviewDelayMinutes", Number(event.target.value))}
                />
                <p className="text-xs text-gray-500">
                  0 = en la siguiente pasada (hasta 10 min). 120 = dos horas después.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-message">Mensaje de WhatsApp</Label>
                <Textarea
                  id="review-message"
                  rows={3}
                  maxLength={400}
                  value={form.reviewMessageTemplate}
                  onChange={(event) => update("reviewMessageTemplate", event.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>, <code>{"{servicio}"}</code>,{" "}
                  <code>{"{fecha}"}</code> y <code>{"{link}"}</code>.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => runReviewsMutation.mutate()}
                disabled={runReviewsMutation.isPending}
              >
                <Star className="mr-2 h-4 w-4" />
                {runReviewsMutation.isPending ? "Enviando…" : "Enviar solicitudes ahora"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellRing className="mr-2 h-5 w-5" />
            Recordatorios y confirmaciones por WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Enviar recordatorio antes de la cita</Label>
              <p className="text-sm text-gray-600">
                Se manda por el número oficial de MiCita con link para cancelar o reprogramar.
              </p>
            </div>
            <Switch
              checked={form.whatsappRemindersEnabled}
              onCheckedChange={(checked) => update("whatsappRemindersEnabled", checked)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reminder-hours">Horas antes</Label>
              <Input
                id="reminder-hours"
                type="number"
                min={1}
                max={72}
                value={form.reminderHoursBefore}
                onChange={(event) => update("reminderHoursBefore", Number(event.target.value))}
                disabled={!form.whatsappRemindersEnabled}
              />
              <p className="text-xs text-gray-500">Ej. 1 = una hora antes; 24 = un día antes.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-template">Mensaje del recordatorio</Label>
            <Textarea
              id="reminder-template"
              rows={3}
              maxLength={400}
              value={form.whatsappReminderTemplate}
              onChange={(event) => update("whatsappReminderTemplate", event.target.value)}
              disabled={!form.whatsappRemindersEnabled}
            />
            <p className="text-xs text-gray-500">
              Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>, <code>{"{servicio}"}</code>,{" "}
              <code>{"{fecha}"}</code>, <code>{"{hora}"}</code> y <code>{"{link}"}</code>.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <Label className="text-base font-medium">Confirmación al reservar</Label>
              <p className="text-sm text-gray-600">
                El cliente recibe la cita confirmada por WhatsApp apenas termina la reserva.
              </p>
            </div>
            <Switch
              checked={form.whatsappConfirmationsEnabled}
              onCheckedChange={(checked) => update("whatsappConfirmationsEnabled", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation-template">Mensaje de confirmación</Label>
            <Textarea
              id="confirmation-template"
              rows={3}
              maxLength={400}
              value={form.whatsappConfirmationTemplate}
              onChange={(event) => update("whatsappConfirmationTemplate", event.target.value)}
              disabled={!form.whatsappConfirmationsEnabled}
            />
            <p className="text-xs text-gray-500">
              Mismos campos que el recordatorio: <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code>,{" "}
              <code>{"{servicio}"}</code>, <code>{"{fecha}"}</code>, <code>{"{hora}"}</code>,{" "}
              <code>{"{link}"}</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-gray-500">
              Los recordatorios también se envían automáticamente cada 15 minutos.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => runRemindersMutation.mutate()}
              disabled={runRemindersMutation.isPending}
            >
              <BellRing className="mr-2 h-4 w-4" />
              Enviar recordatorios ahora
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HeartHandshake className="mr-2 h-5 w-5" />
            Recuperar clientes (“Ya te toca corte”)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="retention-days">Días sin visita para avisar</Label>
              <Input
                id="retention-days"
                type="number"
                min={7}
                max={180}
                value={form.retentionDays}
                onChange={(event) => update("retentionDays", Number(event.target.value))}
              />
              <p className="text-xs text-gray-500">
                Ej. 21 = clientes que no vienen hace 3 semanas.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retention-message">Mensaje de WhatsApp</Label>
            <Textarea
              id="retention-message"
              rows={3}
              maxLength={300}
              value={form.retentionMessage}
              onChange={(event) => update("retentionMessage", event.target.value)}
            />
            <p className="text-xs text-gray-500">
              Usa <code>{"{nombre}"}</code>, <code>{"{negocio}"}</code> y <code>{"{dias}"}</code>.
            </p>
          </div>

          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Los clientes que califican aparecen en <strong>Hoy → Clientes para recuperar</strong>,
            con un botón para escribirles por WhatsApp.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
