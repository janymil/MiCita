import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface SimpleMapProps {
  businesses: any[];
  onMapBoundsChange?: (bounds: google.maps.LatLngBounds) => void;
  onBusinessClick?: (business: any) => void;
  selectedBusiness?: any;
  className?: string;
}

export default function SimpleMap({ 
  businesses, 
  onMapBoundsChange, 
  onBusinessClick, 
  selectedBusiness,
  className = "h-96"
}: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Load Google Maps once
  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google?.maps) {
        setIsLoaded(true);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError("Google Maps API key not configured");
        return;
      }

      try {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => setError("Failed to load Google Maps");
        document.head.appendChild(script);
      } catch (err) {
        setError("Error loading Google Maps");
      }
    };

    loadGoogleMaps();
  }, []);

  // Initialize map once loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: -12.0464, lng: -77.0428 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
      });

      mapInstanceRef.current = map;

      // Add bounds change listener
      if (onMapBoundsChange) {
        map.addListener("bounds_changed", () => {
          const bounds = map.getBounds();
          if (bounds) onMapBoundsChange(bounds);
        });
      }
    } catch (err) {
      setError("Failed to initialize map");
    }
  }, [isLoaded, onMapBoundsChange]);

  // Update markers when businesses change
  useEffect(() => {
    if (!mapInstanceRef.current || !businesses) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const bounds = new window.google.maps.LatLngBounds();

    businesses.forEach((business) => {
      if (!business.location?.lat || !business.location?.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: business.location.lat, lng: business.location.lng },
        map,
        title: business.name,
      });

      marker.addListener("click", () => {
        if (onBusinessClick) onBusinessClick(business);
      });

      markersRef.current.push(marker);
      bounds.extend(marker.getPosition()!);
    });

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds);
    }
  }, [businesses, onBusinessClick]);

  if (error) {
    return (
      <div className={`w-full ${className} rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center`}>
        <div className="text-center p-8">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Mapa no disponible</h3>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className} rounded-lg border border-gray-300 overflow-hidden`}>
      <div ref={mapRef} className="w-full h-full">
        {!isLoaded && (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Cargando mapa...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}