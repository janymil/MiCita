import { Copy, Download, MessageCircle, QrCode, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatPEN, type DeskPromo } from "@/lib/desk-api";

interface PromoShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promo: DeskPromo | null;
}

/** Share kit for a promo: QR, WhatsApp status text and the central-bot link. */
export default function PromoShareDialog({ open, onOpenChange, promo }: PromoShareDialogProps) {
  const { toast } = useToast();

  if (!promo) return null;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado`, description: value });
    } catch {
      toast({ title: "Copia manualmente", description: value });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Compartir promo
          </DialogTitle>
          <DialogDescription>
            {promo.title} · {formatPEN(promo.price)} · {promo.date} {promo.startTime}–{promo.endTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border bg-white p-4">
            <img src={promo.qrPath} alt={`QR de ${promo.title}`} className="mx-auto h-52 w-52" />
          </div>

          <p className="break-all rounded-lg bg-muted p-2 text-xs text-muted-foreground">
            {promo.publicUrl}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => copy(promo.publicUrl, "Enlace")}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
            <Button asChild variant="outline">
              <a href={promo.whatsappShareUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>

          {promo.botUrl && (
            <Button asChild className="w-full">
              <a href={promo.botUrl} target="_blank" rel="noreferrer">
                <Send className="mr-2 h-4 w-4" />
                Abrir en el bot de MiCita
              </a>
            </Button>
          )}

          <Button asChild variant="ghost" className="w-full">
            <a href={promo.qrPath} download={`promo-${promo.code}.png`}>
              <Download className="mr-2 h-4 w-4" />
              Descargar QR
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
