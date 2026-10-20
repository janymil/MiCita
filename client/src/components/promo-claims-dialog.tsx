import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  deskRequest,
  formatPEN,
  STATUS_LABELS,
  type DeskPromo,
  type PromoClaimRecord,
} from "@/lib/desk-api";

interface PromoClaimsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  promo: DeskPromo | null;
}

export default function PromoClaimsDialog({
  open,
  onOpenChange,
  businessId,
  promo,
}: PromoClaimsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ claims: PromoClaimRecord[] }>({
    queryKey: [`/api/dashboard/businesses/${businessId}/promos/${promo?.id}/claims`],
    enabled: open && Boolean(promo?.id),
  });

  const cancelMutation = useMutation({
    mutationFn: (claimId: number) =>
      deskRequest(
        `/api/dashboard/businesses/${businessId}/promos/${promo?.id}/claims/${claimId}/cancel`,
        "POST",
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/dashboard/businesses/${businessId}/promos/${promo?.id}/claims`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/promos`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
      toast({ title: "Reserva cancelada" });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo cancelar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  if (!promo) return null;

  const claims = data?.claims ?? [];
  const reserved = claims.filter((claim) => claim.status === "reserved");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Reservas de la promo
          </DialogTitle>
          <DialogDescription>
            {promo.title} · {formatPEN(promo.price)} · {promo.date} {promo.startTime}–{promo.endTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {reserved.length} de {promo.capacity} cupos reservados
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
            </div>
          ) : claims.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía nadie reservó esta promo.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {claims.map((claim) => (
                <div key={claim.id} className="flex items-center gap-3 p-3">
                  <div className="w-12 text-sm font-semibold">{claim.time}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{claim.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {claim.phone || "Sin celular"}
                      {claim.appointmentStatus
                        ? ` · ${STATUS_LABELS[claim.appointmentStatus] ?? claim.appointmentStatus}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={claim.status === "reserved" ? "default" : "outline"}>
                    {claim.status === "reserved" ? "Reservado" : "Cancelado"}
                  </Badge>
                  {claim.status === "reserved" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground"
                      title="Cancelar reserva"
                      onClick={() => {
                        if (window.confirm(`¿Cancelar la reserva de ${claim.name}?`)) {
                          cancelMutation.mutate(claim.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
