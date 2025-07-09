import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Phone, Clock, ChevronLeft, ChevronRight, Globe, Mail, Navigation, Bookmark, TrendingUp, Users } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedBusinessCardProps {
  business: {
    id: number | string;
    name: string;
    description?: string;
    category: string;
    address?: string;
    rating?: string | number;
    reviewCount?: number;
    coverImage?: string;
    photos?: string[];
    phone?: string;
    email?: string;
    website?: string;
    slug?: string;
    type?: string;
    openNow?: boolean;
    currentPopularity?: number;
    livePopularityStatus?: string;
    popularTimes?: any;
    streetViewUrl?: string;
    distance?: number;
  };
  onBookClick?: () => void;
  onViewClick?: () => void;
  onSaveClick?: () => void;
}

export default function EnhancedBusinessCard({ 
  business, 
  onBookClick, 
  onViewClick,
  onSaveClick 
}: EnhancedBusinessCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const category = BUSINESS_CATEGORIES.find(c => c.id === business.category);
  const rating = parseFloat(String(business.rating || "0"));
  const images = business.photos?.length ? business.photos : [business.coverImage || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=300"];
  
  // Auto-rotate images on hover
  useEffect(() => {
    if (isHovered && images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isHovered, images.length]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSaveClick?.();
  };

  // Get busy status color
  const getBusyStatusColor = (popularity?: number) => {
    if (!popularity) return 'text-gray-500';
    if (popularity < 30) return 'text-green-500';
    if (popularity < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Carousel */}
      <div className="relative h-48 overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIndex}
            src={images[currentImageIndex]}
            alt={business.name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        
        {/* Street View Overlay */}
        {business.streetViewUrl && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1 backdrop-blur-sm">
            <Navigation className="w-3 h-3" />
            <span>Street View</span>
          </div>
        )}
        
        {/* Save Button */}
        <button
          onClick={handleSave}
          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition-all"
        >
          <Bookmark className={cn("w-4 h-4", isSaved ? "fill-red-500 text-red-500" : "text-gray-600")} />
        </button>
        
        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* Image Indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    index === currentImageIndex ? "bg-white w-4" : "bg-white/60"
                  )}
                />
              ))}
            </div>
          </>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {category && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs font-medium mb-2 inline-block",
                  category.color.includes("belleza") && "bg-pink-100 text-pink-800",
                  category.color.includes("salud") && "bg-green-100 text-green-800",
                  category.color.includes("fitness") && "bg-blue-100 text-blue-800",
                  category.color.includes("restaurante") && "bg-orange-100 text-orange-800"
                )}
              >
                {category.name}
              </Badge>
            )}
            <h3 className="font-semibold text-gray-900 line-clamp-1 text-lg">
              {business.name}
            </h3>
          </div>
          
          {/* Live Popularity Status */}
          {business.currentPopularity !== undefined && (
            <div className="flex items-center space-x-1 text-xs">
              <Users className={cn("w-3 h-3", getBusyStatusColor(business.currentPopularity))} />
              <span className={getBusyStatusColor(business.currentPopularity)}>
                {business.livePopularityStatus || `${business.currentPopularity}% busy`}
              </span>
            </div>
          )}
        </div>

        {/* Rating and Reviews */}
        {rating > 0 && (
          <div className="flex items-center space-x-4 mb-3">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
            </div>
            {business.reviewCount && (
              <span className="text-gray-500 text-sm">
                ({business.reviewCount} reseñas)
              </span>
            )}
            {business.distance && (
              <span className="text-gray-500 text-sm">
                • {business.distance < 1 ? `${(business.distance * 1000).toFixed(0)}m` : `${business.distance.toFixed(1)}km`}
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {business.address && (
          <div className="flex items-start space-x-2 text-gray-600 text-sm mb-3">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{business.address}</span>
          </div>
        )}

        {/* Open Status */}
        {business.openNow !== undefined && (
          <div className="flex items-center space-x-2 mb-3">
            <Clock className={cn("w-4 h-4", business.openNow ? "text-green-500" : "text-red-500")} />
            <span className={cn("text-sm font-medium", business.openNow ? "text-green-500" : "text-red-500")}>
              {business.openNow ? "Abierto ahora" : "Cerrado"}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 mb-4">
          {business.phone && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm transition-colors"
              onClick={() => window.open(`tel:${business.phone}`)}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Llamar</span>
            </motion.button>
          )}
          {business.website && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm transition-colors"
              onClick={() => window.open(business.website, '_blank')}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web</span>
            </motion.button>
          )}
          {business.email && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-sm transition-colors"
              onClick={() => window.open(`mailto:${business.email}`)}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </motion.button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onViewClick}
            className="flex-1 hover:bg-gray-50 transition-colors"
          >
            Ver detalles
          </Button>
          <Button
            onClick={onBookClick}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Reservar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}