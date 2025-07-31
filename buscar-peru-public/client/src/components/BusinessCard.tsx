import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Phone, Globe } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BusinessCardProps {
  business: {
    id: number;
    name: string;
    description?: string;
    category: string;
    subcategory?: string;
    address?: string;
    rating?: string;
    reviewCount?: number;
    coverImage?: string;
    phone?: string;
    slug?: string;
    type?: string;
  };
  onViewClick?: (slug: string) => void;
}

export default function BusinessCard({ business, onViewClick }: BusinessCardProps) {
  // Find category info from BUSINESS_CATEGORIES
  const categoryInfo = BUSINESS_CATEGORIES.find(cat => cat.id === business.category);
  const categoryName = categoryInfo?.name || business.category || "Servicio";
  const rating = parseFloat(business.rating || "0");

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 animate-fade-in">
      <div className="relative h-48">
        <img
          src={business.coverImage || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=300"}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn(
              "text-xs font-medium",
              categoryInfo?.color || "bg-gray-100 text-gray-800"
            )}>
              {categoryName}
            </Badge>
            {business.subcategory && (
              <Badge variant="outline" className="text-xs font-medium">
                {business.subcategory}
              </Badge>
            )}
          </div>

          {rating > 0 && (
            <div className="flex items-center">
              <div className="flex text-yellow-400 mr-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < rating ? "fill-current" : "text-gray-300"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {rating.toFixed(1)} ({business.reviewCount || 0})
              </span>
            </div>
          )}
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
          {business.name}
        </h3>

        {business.description && (
          <p className="text-gray-600 mb-4 line-clamp-2">
            {business.description}
          </p>
        )}

        {business.address && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="line-clamp-1">{business.address}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            {business.phone && (
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewClick?.(business.slug || `business-${business.id}`)}
            >
              Ver Detalles
            </Button>
          </div>

          {business.type === "registered" && (
            <Button
              className="bg-red-600 hover:bg-red-700"
              size="sm"
            >
              Ver Micrositio
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}