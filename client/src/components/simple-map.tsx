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
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

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
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        clickableIcons: true,
        disableDoubleClickZoom: false,
        draggable: true,
        keyboardShortcuts: true,
        scrollwheel: true,
        // Remove restrictions that might cause resistance
      });

      mapInstanceRef.current = map;

      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow();

      // Add bounds change listener with debouncing
      if (onMapBoundsChange) {
        let boundsTimeout: NodeJS.Timeout;
        map.addListener("bounds_changed", () => {
          clearTimeout(boundsTimeout);
          boundsTimeout = setTimeout(() => {
            const bounds = map.getBounds();
            if (bounds) onMapBoundsChange(bounds);
          }, 300);
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
    if (!map) return;
    const bounds = new window.google.maps.LatLngBounds();

    businesses.forEach((business) => {
      if (!business.location?.lat || !business.location?.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: business.location.lat, lng: business.location.lng },
        map,
        title: business.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.372 0 0 5.372 0 12c0 9 12 20 12 20s12-11 12-20c0-6.628-5.372-12-12-12z" fill="#DC2626"/>
              <circle cx="12" cy="12" r="6" fill="white"/>
              <circle cx="12" cy="12" r="3" fill="#DC2626"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 32),
          anchor: new window.google.maps.Point(12, 32)
        }
      });

      marker.addListener("click", () => {
        // Create info window content
        const content = `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 4px 0; font-weight: bold; font-size: 14px;">${business.name}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.address || 'Dirección no disponible'}</p>
            ${business.rating ? `
              <div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="color: #fbbf24; font-size: 12px;">★</span>
                <span style="font-size: 12px; margin-left: 2px;">${business.rating}</span>
                ${business.reviewCount ? `<span style="font-size: 12px; color: #666; margin-left: 2px;">(${business.reviewCount})</span>` : ''}
              </div>
            ` : ''}
            ${business.phone ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #2563eb;">${business.phone}</p>` : ''}
          </div>
        `;
        
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        }
        
        if (onBusinessClick) onBusinessClick(business);
      });

      markersRef.current.push(marker);
      bounds.extend(marker.getPosition()!);
    });

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds);
      
      // Ensure reasonable zoom level after fitting bounds
      const mapInstance: google.maps.Map = map;
      const listener = window.google.maps.event.addListener(mapInstance, "idle", () => {
        const zoom = mapInstance.getZoom();
        if (zoom !== undefined && zoom > 16) {
          mapInstance.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
      });
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
    <div 
      className={`w-full ${className} rounded-lg border border-gray-300`}
      style={{ 
        overflow: 'hidden',
        height: '100%'
      }}
    >
      <div 
        ref={mapRef} 
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          position: 'relative',
          touchAction: 'manipulation' // Better touch handling
        }}
      >
        {!isLoaded && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f3f4f6',
              zIndex: 10
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Cargando mapa...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}