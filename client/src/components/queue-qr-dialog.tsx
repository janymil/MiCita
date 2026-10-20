import { Copy, Download, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface QueueQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  qrPath: string;
  sharePath: string;
}

/**
 * The "Saca tu turno" poster: QR for the counter/outside the shop plus a
 * share link for Instagram / WhatsApp status.
 */
export default function QueueQrDialog({
  open,
  onOpenChange,
  businessName,
  qrPath,
  sharePath,
}: QueueQrDialogProps) {
  const { toast } = useToast();
  const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;
  const shareText = `Pide tu turno en ${businessName} sin esperar: ${absoluteUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast({ title: "Enlace copiado", description: "Pégalo en tu Instagram o WhatsApp." });
    } catch {
      toast({ title: "No se pudo copiar", description: absoluteUrl, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Tu QR para la cola
          </DialogTitle>
          <DialogDescription>
            Imprímelo y pégalo en la puerta. Tus clientes escanean y ven su turno en vivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-center">
          <div className="rounded-xl border bg-white p-4">
            <img
              src={qrPath}
              alt={`QR para pedir turno en ${businessName}`}
              className="mx-auto h-56 w-56 object-contain"
            />
          </div>

          <p className="break-all rounded-lg bg-muted p-2 text-xs text-muted-foreground">{absoluteUrl}</p>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar enlace
            </Button>
            <Button asChild variant="outline">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </a>
            </Button>
          </div>

          <Button asChild variant="ghost" className="w-full">
            <a href={qrPath} download="micita-cola.png">
              <Download className="mr-2 h-4 w-4" />
              Descargar imagen
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
