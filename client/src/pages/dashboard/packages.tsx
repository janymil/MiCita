import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Plus, Ticket, Wallet } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  formatPEN,
  type DeskPackagesResponse,
  type DeskService,
} from "@/lib/desk-api";

interface DashboardBusiness {
  id: number;
  name: string;
}

export default function PackagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    serviceId: "",
    name: "Bono 5 cortes",
    description: "",
    uses: "5",
    price: "100",
    validityDays: "90",
  });
  const [sale, setSale] = useState({
    packageId: "",
    name: "",
    phone: "",
    method: "yape",
  });

  const { data: businesses } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });
  const businessId = businesses?.[0]?.id;

  const { data, isLoading } = useQuery<DeskPackagesResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/packages`],
    enabled: Boolean(businessId),
  });

  const { data: services } = useQuery<DeskService[]>({
    queryKey: [`/api/dashboard/businesses/${businessId}/services`],
    enabled: Boolean(businessId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/packages`] });

  const createPackage = useMutation({
    mutationFn: () =>
      deskRequest(`/api/dashboard/businesses/${businessId}/packages`, "POST", {
        serviceId: Number(form.serviceId),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        uses: Number(form.uses),
        price: Number(form.price),
        validityDays: Number(form.validityDays),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Bono creado", description: "Ya puedes venderlo desde esta página." });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo crear",
        description: error?.message ?? "Revisa los datos",
        variant: "destructive",
      }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ packageId, status }: { packageId: number; status: string }) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/packages/${packageId}`, "PATCH", {
        status,
      }),
    onSuccess: () => invalidate(),
    onError: (error: any) =>
      toast({
        title: "No se pudo actualizar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const sell = useMutation({
    mutationFn: () =>
      deskRequest(
        `/api/dashboard/businesses/${businessId}/packages/${Number(sale.packageId)}/sell`,
        "POST",
        {
          name: sale.name.trim(),
          phone: sale.phone.trim(),
          method: sale.method,
        },
      ),
    onSuccess: () => {
      invalidate();
      setSale({ packageId: "", name: "", phone: "", method: "yape" });
      toast({ title: "Bono vendido", description: "El cliente recibirá su enlace por WhatsApp." });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo vender",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const packages = data?.packages ?? [];
  const purchases = data?.purchases ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Bonos prepagados</h1>
            <p className="text-sm text-muted-foreground">
              Vende varios servicios por adelantado y controla los usos.
            </p>
          </div>
          <a className="text-sm underline" href="/dashboard/settings">
            Configurar mensajes
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Bonos activos</p>
              <p className="text-2xl font-bold">{data?.stats.activePurchases ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Usos pendientes</p>
              <p className="text-2xl font-bold">{data?.stats.outstandingUses ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vendido</p>
              <p className="text-2xl font-bold">{formatPEN(data?.stats.soldAmount ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" /> Crear bono
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Servicio incluido</Label>
                <Select
                  value={form.serviceId}
                  onValueChange={(value) => setForm((current) => ({ ...current, serviceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {(services ?? []).map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pkg-name">Nombre</Label>
                  <Input
                    id="pkg-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-uses">Usos</Label>
                  <Input
                    id="pkg-uses"
                    type="number"
                    min={1}
                    max={50}
                    value={form.uses}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, uses: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-price">Precio (S/)</Label>
                  <Input
                    id="pkg-price"
                    type="number"
                    min={1}
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, price: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-validity">Vigencia (días)</Label>
                  <Input
                    id="pkg-validity"
                    type="number"
                    min={1}
                    max={730}
                    value={form.validityDays}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, validityDays: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pkg-description">Descripción (opcional)</Label>
                <Textarea
                  id="pkg-description"
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>

              <Button
                className="w-full"
                onClick={() => createPackage.mutate()}
                disabled={createPackage.isPending || !form.serviceId}
              >
                Crear bono
              </Button>
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" /> Vender en el local
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={sale.packageId}
                onValueChange={(value) => setSale((current) => ({ ...current, packageId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige el bono" />
                </SelectTrigger>
                <SelectContent>
                  {packages
                    .filter((pkg) => pkg.status === "active")
                    .map((pkg) => (
                      <SelectItem key={pkg.id} value={String(pkg.id)}>
                        {pkg.name} · {formatPEN(Number(pkg.price))}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nombre del cliente"
                value={sale.name}
                onChange={(event) => setSale((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                placeholder="Celular / WhatsApp"
                inputMode="tel"
                value={sale.phone}
                onChange={(event) =>
                  setSale((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <Select
                value={sale.method}
                onValueChange={(value) => setSale((current) => ({ ...current, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESK_PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                onClick={() => sell.mutate()}
                disabled={sell.isPending || !sale.packageId || !sale.name.trim() || !sale.phone.trim()}
              >
                Registrar venta
              </Button>
            </CardContent>
          </Card>
        </div>


        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" /> Bonos disponibles
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
              </div>
            ) : packages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay bonos. Crea el primero arriba.
              </p>
            ) : (
              packages.map((pkg) => (
                <div key={pkg.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pkg.uses} usos · {formatPEN(Number(pkg.price))} · {pkg.validityDays} días
                    </p>
                  </div>
                  <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                    {pkg.status === "active" ? "Activo" : "En pausa"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleStatus.mutate({
                        packageId: pkg.id,
                        status: pkg.status === "active" ? "paused" : "active",
                      })
                    }
                    disabled={toggleStatus.isPending}
                  >
                    {pkg.status === "active" ? (
                      <Pause className="mr-1 h-4 w-4" />
                    ) : (
                      <Play className="mr-1 h-4 w-4" />
                    )}
                    {pkg.status === "active" ? "Pausar" : "Activar"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Ventas y saldos
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {purchases.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Todavía no hay ventas de bonos.
              </p>
            ) : (
              purchases.map((purchase) => (
                <div key={purchase.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{purchase.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {purchase.packageName} · {purchase.phone} ·{" "}
                      {purchase.expiresAt
                        ? `vence ${new Date(purchase.expiresAt).toLocaleDateString("es-PE")}`
                        : "sin fecha"}
                    </p>
                  </div>
                  <Badge variant={purchase.status === "active" ? "default" : "secondary"}>
                    {purchase.status === "active"
                      ? `${purchase.usesRemaining}/${purchase.usesTotal} usos`
                      : purchase.status}
                  </Badge>
                  <span className="text-sm font-semibold">
                    {formatPEN(Number(purchase.amountPaid))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
