import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star, Trash2, MessageSquare, Calendar, Search, ExternalLink, Check, X,
  Inbox, Mail, Phone, Reply, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/dashboard-layout";
import type { BusinessSummary } from "@/lib/api-types";

interface Review {
  id: number;
  businessId: number;
  rating: number;
  clientName: string;
  comment: string | null;
  createdAt: string;
  source?: string | null;
  status?: string | null;
  ownerReply?: string | null;
  appointmentId?: number | null;
}

interface ReviewsResponse {
  reviews: Review[];
  stats: { total: number; approved: number; pending: number; averageRating: number; replyRate: number };
}

interface ContactMessage {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
}

interface MessagesResponse {
  messages: ContactMessage[];
  unread: number;
}

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  microsite: { label: "💬 Micrositio", className: "bg-blue-50 text-blue-700 border-blue-200" },
  google: { label: "🌐 Google", className: "bg-red-50 text-red-700 border-red-200" },
  facebook: { label: "📘 Facebook", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  manual: { label: "✍️ Manual", className: "bg-gray-50 text-gray-700 border-gray-200" },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Por moderar", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Publicada", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazada", className: "bg-red-100 text-red-800" },
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});

  const { data: businesses, isLoading: businessesLoading } = useQuery<BusinessSummary[]>({
    queryKey: ["/api/dashboard/businesses"],
  });

  const currentBusiness = businesses?.[0];
  const businessId = currentBusiness?.id;

  const { data: businessSettings } = useQuery<{ customUrl?: string | null }>({
    queryKey: [`/api/dashboard/businesses/${businessId}/settings`],
    enabled: Boolean(businessId),
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<ReviewsResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/reviews`],
    enabled: Boolean(businessId),
  });

  const { data: messagesData } = useQuery<MessagesResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/messages`],
    enabled: Boolean(businessId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/reviews`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/messages`] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/businesses"] });
  };

  const moderateMutation = useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: number; status: "approved" | "rejected" | "pending" }) => {
      await apiRequest("PATCH", `/api/dashboard/businesses/${businessId}/reviews/${reviewId}`, { status });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Reseña actualizada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo actualizar la reseña", variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, ownerReply }: { reviewId: number; ownerReply: string }) => {
      await apiRequest("PATCH", `/api/dashboard/businesses/${businessId}/reviews/${reviewId}`, { ownerReply });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Respuesta publicada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo guardar la respuesta", variant: "destructive" }),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("DELETE", `/api/dashboard/businesses/${businessId}/reviews/${reviewId}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Reseña eliminada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo eliminar la reseña", variant: "destructive" }),
  });

  const messageStatusMutation = useMutation({
    mutationFn: async ({ messageId, status }: { messageId: number; status: string }) => {
      await apiRequest("PATCH", `/api/dashboard/businesses/${businessId}/messages/${messageId}`, { status });
    },
    onSuccess: () => invalidateAll(),
  });

  const reviews = reviewsData?.reviews ?? [];
  const stats = reviewsData?.stats;

  const statsComputed = useMemo(() => {
    const total = stats?.total ?? reviews.length;
    const approved = stats?.approved ?? reviews.filter((review) => (review.status ?? "approved") === "approved").length;
    const average = stats?.averageRating ?? 0;
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      if ((review.status ?? "approved") === "approved") breakdown[review.rating] = (breakdown[review.rating] ?? 0) + 1;
    });
    const bySource = reviews.reduce<Record<string, number>>((acc, review) => {
      const source = review.source || "microsite";
      acc[source] = (acc[source] ?? 0) + 1;
      return acc;
    }, {});
    return { total, approved, average, breakdown, bySource, pending: stats?.pending ?? 0 };
  }, [reviews, stats]);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchTerm ||
      review.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.comment ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = filterRating === "all" || review.rating === Number(filterRating);
    const matchesSource = filterSource === "all" || (review.source || "microsite") === filterSource;
    const matchesStatus = filterStatus === "all" || (review.status || "approved") === filterStatus;
    return matchesSearch && matchesRating && matchesSource && matchesStatus;
  });

  if (businessesLoading || reviewsLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reseñas y mensajes</h1>
            <p className="text-gray-600">Modera opiniones, responde y atiende a quien te escribe.</p>
          </div>
          {businessSettings?.customUrl ? (
            <Button asChild>
              <a href={`/${businessSettings.customUrl}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver micrositio
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <a href="/dashboard/micrositio">
                <ExternalLink className="w-4 h-4 mr-2" />
                Publicar micrositio
              </a>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{statsComputed.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Calificación promedio</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{statsComputed.average.toFixed(1)}</div>
                <Stars rating={Math.round(statsComputed.average)} size="md" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Por moderar</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statsComputed.pending > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {statsComputed.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Mensajes sin leer</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(messagesData?.unread ?? 0) > 0 ? "text-blue-600" : "text-gray-900"}`}>
                {messagesData?.unread ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" /> Reseñas ({statsComputed.total})
            </TabsTrigger>
            <TabsTrigger value="messages">
              <Inbox className="w-4 h-4 mr-2" /> Mensajes ({messagesData?.messages.length ?? 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle>Distribución de calificaciones</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = statsComputed.breakdown[rating] ?? 0;
                    const percentage = statsComputed.approved > 0 ? (count / statsComputed.approved) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 w-16">
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-400 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre o comentario..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterRating} onValueChange={setFilterRating}>
                    <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Calificación" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <SelectItem key={rating} value={String(rating)}>{rating} estrellas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Fuente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las fuentes</SelectItem>
                      <SelectItem value="microsite">Micrositio</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Por moderar</SelectItem>
                      <SelectItem value="approved">Publicadas</SelectItem>
                      <SelectItem value="rejected">Rechazadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>


            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay reseñas que coincidan</h3>
                    <p className="text-gray-500 text-center max-w-md">
                      Comparte tu micrositio para empezar a recibir opiniones. Las reseñas nuevas quedan
                      "por moderar" hasta que las apruebes.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReviews.map((review) => {
                  const source = SOURCE_LABELS[review.source || "microsite"] ?? SOURCE_LABELS.microsite;
                  const status = STATUS_LABELS[review.status || "approved"] ?? STATUS_LABELS.approved;
                  return (
                    <Card key={review.id}>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">{review.clientName}</h4>
                              <Stars rating={review.rating} />
                              <Badge variant="outline" className={source.className}>{source.label}</Badge>
                              <Badge className={status.className}>{status.label}</Badge>
                            </div>
                            {review.comment && <p className="text-gray-700 leading-relaxed">{review.comment}</p>}
                            <div className="flex items-center text-xs text-gray-500 mt-2">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(review.createdAt).toLocaleDateString("es-PE", {
                                year: "numeric", month: "long", day: "numeric",
                              })}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {(review.status || "approved") !== "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moderateMutation.mutate({ reviewId: review.id, status: "approved" })}
                              >
                                <Check className="w-4 h-4 mr-1" /> Publicar
                              </Button>
                            )}
                            {(review.status || "approved") !== "rejected" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moderateMutation.mutate({ reviewId: review.id, status: "rejected" })}
                              >
                                <X className="w-4 h-4 mr-1" /> Rechazar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => {
                                if (window.confirm("¿Eliminar esta reseña definitivamente?")) {
                                  deleteReviewMutation.mutate(review.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {review.ownerReply ? (
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Tu respuesta</p>
                            <p className="text-sm">{review.ownerReply}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Responde públicamente (opcional)…"
                              value={replyDraft[review.id] ?? ""}
                              onChange={(event) => setReplyDraft((prev) => ({ ...prev, [review.id]: event.target.value }))}
                              rows={2}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!(replyDraft[review.id] ?? "").trim()}
                              onClick={() =>
                                replyMutation.mutate({ reviewId: review.id, ownerReply: (replyDraft[review.id] ?? "").trim() })
                              }
                            >
                              <Reply className="w-4 h-4 mr-1" /> Publicar respuesta
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>


          <TabsContent value="messages" className="space-y-4 mt-6">
            {(messagesData?.messages ?? []).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Inbox className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sin mensajes todavía</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    Los mensajes enviados desde el formulario de tu micrositio aparecen aquí y te llegan por correo.
                  </p>
                </CardContent>
              </Card>
            ) : (
              (messagesData?.messages ?? []).map((message) => (
                <Card key={message.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-medium">{message.name}</h4>
                          <Badge variant={message.status === "new" ? "default" : "secondary"}>{message.status}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleString("es-PE")}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-line">{message.message}</p>
                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                          {message.email && (
                            <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${message.email}`}>
                              <Mail className="w-4 h-4" /> {message.email}
                            </a>
                          )}
                          {message.phone && (
                            <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${message.phone}`}>
                              <Phone className="w-4 h-4" /> {message.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {message.status !== "read" && (
                          <Button size="sm" variant="outline" onClick={() => messageStatusMutation.mutate({ messageId: message.id, status: "read" })}>
                            <Eye className="w-4 h-4 mr-1" /> Leído
                          </Button>
                        )}
                        {message.status !== "replied" && (
                          <Button size="sm" variant="ghost" onClick={() => messageStatusMutation.mutate({ messageId: message.id, status: "replied" })}>
                            <Reply className="w-4 h-4 mr-1" /> Respondido
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
