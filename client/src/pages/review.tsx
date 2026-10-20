import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { CheckCircle2, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PublicPageShell } from "@/components/public-page-header";
import { publicJson } from "@/lib/public-api";

interface ReviewPayload {
  appointment: { id: number; date: string; time: string; status: string };
  client: { name: string } | null;
  service: { id: number; name: string } | null;
  business: { id: number; name: string } | null;
  review: { id: number; rating: number; comment: string | null; status: string } | null;
  canReview: boolean;
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ReviewPayload>({
    queryKey: [`/api/public/reviews/${token}`],
    enabled: Boolean(token),
  });

  const submit = async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      await publicJson(`/api/public/reviews/${token}`, "POST", { rating, comment });
      setSubmitted(true);
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo enviar la reseña");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PublicPageShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
        </div>
      </PublicPageShell>
    );
  }

  if (error || !data) {
    return (
      <PublicPageShell>
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold">Enlace no válido</h1>
            <p className="text-sm text-muted-foreground">
              No encontramos esta visita. El enlace puede haber expirado.
            </p>
            <Button className="w-full" onClick={() => (window.location.href = "/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  const alreadyReviewed = Boolean(data.review) || submitted;
  const existingRating = data.review?.rating ?? rating;

  return (
    <PublicPageShell businessName={data.business?.name}>
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
              {data.business?.name ?? "Tu visita"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servicio</span>
              <span className="font-medium">{data.service?.name ?? "Servicio"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium">
                {data.appointment.date} · {data.appointment.time}
              </span>
            </div>
            {data.client?.name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">A nombre de</span>
                <span className="font-medium">{data.client.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {alreadyReviewed ? (
          <Card className="border-emerald-200 bg-emerald-50/70">
            <CardContent className="space-y-3 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-bold">¡Gracias por tu reseña!</h2>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= existingRating ? "fill-amber-400 text-amber-500" : "text-neutral-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-emerald-800">
                Tu opinión ayuda a {data.business?.name ?? "el negocio"} a mejorar.
              </p>
            </CardContent>
          </Card>
        ) : data.canReview ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">¿Cómo estuvo tu servicio?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} estrellas`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(null)}
                    className="rounded-full p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hovered ?? rating)
                          ? "fill-amber-400 text-amber-500"
                          : "text-neutral-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="Cuéntanos qué tal estuvo el corte, la atención, el local… (opcional)"
              />

              {message && <p className="text-sm text-red-600">{message}</p>}

              <Button className="w-full" onClick={submit} disabled={isSubmitting}>
                {isSubmitting ? "Enviando…" : "Enviar reseña"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Tu reseña se publica después de la revisión del negocio.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Esta visita todavía no está lista para reseñar.
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">Gestionado con MiCita</p>
    </PublicPageShell>
  );
}
