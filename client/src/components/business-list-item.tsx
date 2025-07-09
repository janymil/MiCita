import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Phone, Clock, Globe, Mail, ChevronRight, Users, Bookmark } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

interface BusinessListItemProps {
  business: {
    id: number | string;
    name: string;
    description?: string;
    category: string;
    address?: string;
    rating?: string | number;
    reviewCount?: number;
    coverImage?: string;
    photoUrl?: string;
    photos?: string[];
    phone?: string;
    email?: string;
    website?: string;
    slug?: string;
    type?: string;
    openNow?: boolean;
    currentPopularity?: number;
    livePopularityStatus?: string;
    distance?: number;
  };
  onBookClick?: () => void;
  onViewClick?: () => void;
  onSaveClick?: () => void;
}

export default function BusinessListItem({ 
  business, 
  onBookClick, 
  onViewClick,
  onSaveClick 
}: BusinessListItemProps) {
  const [isSaved, setIsSaved] = useState(false);
  // Find category info from BUSINESS_CATEGORIES
  const categoryInfo = BUSINESS_CATEGORIES.find(cat => cat.id === business.category);
  const categoryName = categoryInfo?.name || business.category || "Servicio";
  const rating = parseFloat(String(business.rating || "0"));
  const primaryImage = business.photos?.[0] || business.coverImage || business.photoUrl || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=300";
  
  const handleSave = () => {
    setIsSaved(!isSaved);
    onSaveClick?.();
  };

  const getBusyStatusColor = (popularity?: number) => {
    if (!popularity) return 'text-gray-500';
    if (popularity < 30) return 'text-green-500';
    if (popularity < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 5 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="flex">
        {/* Image */}
        <div className="relative w-48 h-40 flex-shrink-0">
          <img
            src={primaryImage}
            alt={business.name}
            className="w-full h-full object-cover"
          />
          {/* Save Button */}
          <button
            onClick={handleSave}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition-all"
          >
            <Bookmark className={cn("w-4 h-4", isSaved ? "fill-red-500 text-red-500" : "text-gray-600")} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              {/* Category & Name */}
              <div className="flex items-center space-x-2 mb-1">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-medium",
                    categoryInfo?.color || "bg-gray-100 text-gray-800"
                  )}
                >
                  {categoryName}
                </Badge>
                {business.currentPopularity !== undefined && (
                  <div className="flex items-center space-x-1 text-xs">
                    <Users className={cn("w-3 h-3", getBusyStatusColor(business.currentPopularity))} />
                    <span className={getBusyStatusColor(business.currentPopularity)}>
                      {business.livePopularityStatus || `${business.currentPopularity}% ocupado`}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                {business.name}
              </h3>
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {business.description}
            </p>
          )}

          {/* Info Row */}
          <div className="space-y-2 mb-3">
            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{rating.toFixed(1)}</span>
                {business.reviewCount && (
                  <span className="text-gray-500">({business.reviewCount})</span>
                )}
              </div>
            )}

            {/* Contact Information */}
            {business.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 text-sm">{business.phone}</span>
              </div>
            )}
            
            {business.website && (
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 text-sm truncate">{business.website}</span>
              </div>
            )}
            
            {business.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 text-sm">{business.email}</span>
              </div>
            )}

            {/* Distance */}
            {business.distance && (
              <div className="flex items-center space-x-1 text-gray-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>
                  {business.distance < 1 
                    ? `${(business.distance * 1000).toFixed(0)}m` 
                    : `${business.distance.toFixed(1)}km`
                  }
                </span>
              </div>
            )}

            {/* Open Status */}
            {business.openNow !== undefined && (
              <div className="flex items-center space-x-1">
                <Clock className={cn("w-4 h-4", business.openNow ? "text-green-500" : "text-red-500")} />
                <span className={cn("font-medium text-sm", business.openNow ? "text-green-500" : "text-red-500")}>
                  {business.openNow ? "Abierto" : "Cerrado"}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewClick}
              className="flex-1"
            >
              Ver detalles
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (business.address) {
                  const query = encodeURIComponent(`${business.name}, ${business.address}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Google Maps
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}