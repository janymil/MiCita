import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Search, Sparkles, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { deskRequest, type DeskLoyaltyResponse } from "@/lib/desk-api";

interface DashboardBusiness {
  id: number;
  name: string;
}

export default function LoyaltyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: businesses } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });
  const businessId = businesses?.[0]?.id;

  const { data, isLoading } = useQuery<DeskLoyaltyResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/loyalty`],
    enabled: Boolean(businessId),
  });

  const redeem = useMutation({
    mutationFn: (cardId: number) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/loyalty/${cardId}/redeem`, "POST", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/loyalty`] });
      toast({ title: "Recompensa canjeada", description: "La tarjeta se actualizó." });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo canjear",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const cards = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = data?.cards ?? [];
    if (!term) return list;
    return list.filter(
      (card) =>
        card.name.toLowerCase().includes(term) || card.phone.toLowerCase().includes(term),
    );
  }, [data?.cards, search]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Tarjetas de fidelidad</h1>
            <p className="text-sm text-muted-foreground">
              {data ? `${data.count} tarjetas · ${data.rewardsReady} premios listos` : "Cargando…"}
            </p>
          </div>
          <a className="text-sm underline" href="/dashboard/settings">
            Configurar premio
          </a>
        </div>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-amber-900">
            <Sparkles className="h-5 w-5" />
            <span>
              {data?.required ?? 5} sellos = <strong>{data?.reward ?? "un premio"}</strong>. Cada
              servicio terminado suma un sello automáticamente.
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Clientes con tarjeta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o celular"
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
              </div>
            ) : cards.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aún no hay tarjetas. Termina un servicio con el celular del cliente para crear la
                primera.
              </p>
            ) : (
              <div className="divide-y">
                {cards.map((card) => (
                  <div key={card.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.phone} · {card.progress}/{card.required} sellos ·{" "}
                        {card.totalStamps} visitas
                      </p>
                    </div>
                    <Badge variant={card.availableRewards > 0 ? "default" : "secondary"}>
                      {card.availableRewards > 0
                        ? `${card.availableRewards} premio${card.availableRewards === 1 ? "" : "s"}`
                        : `${card.required - card.progress} para premio`}
                    </Badge>
                    {card.availableRewards > 0 && (
                      <Button
                        size="sm"
                        onClick={() => redeem.mutate(card.id)}
                        disabled={redeem.isPending}
                      >
                        <Gift className="mr-1 h-4 w-4" /> Canjear
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
