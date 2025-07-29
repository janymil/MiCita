import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Star, Trash2, MessageSquare, Calendar, Filter, Search, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';

interface Review {
  id: number;
  businessId: number;
  rating: number;
  clientName: string;
  comment: string | null;
  createdAt: string;
  source?: 'google' | 'facebook' | 'microsite';
}

interface ReviewsStats {
  total: number;
  averageRating: number;
  ratingBreakdown: { [key: number]: number };
  sourceBreakdown: { google: number; facebook: number; microsite: number };
}

export default function ReviewsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Fetch reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', businessId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/businesses/${businessId}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const response = await fetch(`/api/dashboard/businesses/${businessId}/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete review');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', businessId] });
      toast.success('Reseña eliminada exitosamente');
    },
    onError: () => {
      toast.error('Error al eliminar la reseña');
    },
  });

  // Calculate stats
  const stats: ReviewsStats = React.useMemo(() => {
    const total = reviews.length;
    const averageRating = total > 0 ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / total : 0;
    
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sourceBreakdown = { google: 0, facebook: 0, microsite: 0 };
    
    reviews.forEach((review: Review) => {
      ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++;
      if (review.source) {
        sourceBreakdown[review.source as keyof typeof sourceBreakdown]++;
      } else {
        sourceBreakdown.microsite++; // Default to microsite if no source
      }
    });

    return { total, averageRating, ratingBreakdown, sourceBreakdown };
  }, [reviews]);

  // Filter reviews
  const filteredReviews = reviews.filter((review: Review) => {
    const matchesSearch = review.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (review.comment && review.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRating = filterRating === 'all' || review.rating.toString() === filterRating;
    const reviewSource = review.source || 'microsite';
    const matchesSource = filterSource === 'all' || reviewSource === filterSource;
    
    return matchesSearch && matchesRating && matchesSource;
  });

  const handleDeleteReview = (reviewId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta reseña?')) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getSourceBadge = (source: string | undefined) => {
    const sourceType = source || 'microsite';
    const config = {
      google: { label: '🌐 Google Maps', variant: 'default' as const },
      facebook: { label: '📘 Facebook', variant: 'secondary' as const },
      microsite: { label: '💬 Micrositio', variant: 'outline' as const },
    };
    
    return (
      <Badge variant={config[sourceType as keyof typeof config].variant}>
        {config[sourceType as keyof typeof config].label}
      </Badge>
    );
  };

  if (reviewsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Reseñas</h1>
          <p className="text-gray-600">Administra las reseñas de tu negocio</p>
        </div>
        <Button asChild>
          <a href={`/microsite/${businessId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Micrositio
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Reseñas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Calificación Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              {renderStars(Math.round(stats.averageRating), 'md')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Reseñas del Micrositio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sourceBreakdown.microsite}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Reseñas Externas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.sourceBreakdown.google + stats.sourceBreakdown.facebook}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Calificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingBreakdown[rating];
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre o comentario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por calificación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las calificaciones</SelectItem>
                <SelectItem value="5">5 estrellas</SelectItem>
                <SelectItem value="4">4 estrellas</SelectItem>
                <SelectItem value="3">3 estrellas</SelectItem>
                <SelectItem value="2">2 estrellas</SelectItem>
                <SelectItem value="1">1 estrella</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                <SelectItem value="microsite">Micrositio</SelectItem>
                <SelectItem value="google">Google Maps</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterRating !== 'all' || filterSource !== 'all'
                  ? 'No se encontraron reseñas'
                  : 'Aún no hay reseñas'}
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {searchTerm || filterRating !== 'all' || filterSource !== 'all'
                  ? 'Intenta ajustar los filtros para ver más resultados.'
                  : 'Las reseñas aparecerán aquí cuando los clientes dejen comentarios en tu micrositio o cuando se importen desde Google Maps y Facebook.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review: Review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{review.clientName}</h4>
                      {renderStars(review.rating)}
                      {getSourceBadge(review.source)}
                    </div>
                    
                    {review.comment && (
                      <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(review.createdAt).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deleteReviewMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
