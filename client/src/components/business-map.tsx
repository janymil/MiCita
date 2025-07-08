import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface BusinessMapProps {
  businesses: any[];
  onMapBoundsChange?: (bounds: google.maps.LatLngBounds) => void;
  onBusinessClick?: (business: any) => void;
  selectedBusiness?: any;
  className?: string;
}

export default function BusinessMap({ 
  businesses, 
  onMapBoundsChange, 
  onBusinessClick, 
  selectedBusiness,
  className = "h-96"
}: BusinessMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "geometry"]
        });

        await loader.load();

        if (!mapRef.current) return;

        // Default to Lima, Peru
        const defaultCenter = { lat: -12.0464, lng: -77.0428 };
        
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi.business",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        setMap(mapInstance);

        // Create info window
        const infoWindowInstance = new google.maps.InfoWindow();
        setInfoWindow(infoWindowInstance);

        // Listen for map bounds changes
        mapInstance.addListener("bounds_changed", () => {
          const bounds = mapInstance.getBounds();
          if (bounds && onMapBoundsChange) {
            onMapBoundsChange(bounds);
          }
        });

      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
  }, [onMapBoundsChange]);

  // Update markers when businesses change
  useEffect(() => {
    if (!map || !businesses) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    businesses.forEach((business) => {
      if (!business.location?.lat || !business.location?.lng) return;

      const position = {
        lat: business.location.lat,
        lng: business.location.lng
      };

      const marker = new google.maps.Marker({
        position,
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
          scaledSize: new google.maps.Size(24, 32),
          anchor: new google.maps.Point(12, 32)
        }
      });

      // Add click listener
      marker.addListener("click", () => {
        if (infoWindow) {
          const content = `
            <div class="p-2 max-w-xs">
              <h3 class="font-semibold text-sm">${business.name}</h3>
              <p class="text-xs text-gray-600 mt-1">${business.address || 'Dirección no disponible'}</p>
              ${business.rating ? `
                <div class="flex items-center mt-1">
                  <span class="text-yellow-500 text-xs">★</span>
                  <span class="text-xs ml-1">${business.rating}</span>
                  ${business.reviewCount ? `<span class="text-xs text-gray-500 ml-1">(${business.reviewCount})</span>` : ''}
                </div>
              ` : ''}
              ${business.phone ? `<p class="text-xs text-blue-600 mt-1">${business.phone}</p>` : ''}
              <button 
                onclick="window.handleBusinessClick && window.handleBusinessClick('${business.id}')"
                class="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Ver detalles
              </button>
            </div>
          `;
          
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        }

        if (onBusinessClick) {
          onBusinessClick(business);
        }
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() && map.getZoom()! > 16) {
          map.setZoom(16);
        }
        google.maps.event.removeListener(listener);
      });
    }

  }, [map, businesses, infoWindow, onBusinessClick]);

  // Highlight selected business
  useEffect(() => {
    if (!selectedBusiness || !markers) return;

    markers.forEach(marker => {
      const isSelected = marker.getTitle() === selectedBusiness.name;
      
      if (isSelected) {
        marker.setIcon({
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#DC2626"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#DC2626"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40)
        });

        // Pan to selected marker
        map?.panTo(marker.getPosition()!);
      } else {
        marker.setIcon({
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.372 0 0 5.372 0 12c0 9 12 20 12 20s12-11 12-20c0-6.628-5.372-12-12-12z" fill="#DC2626"/>
              <circle cx="12" cy="12" r="6" fill="white"/>
              <circle cx="12" cy="12" r="3" fill="#DC2626"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 32),
          anchor: new google.maps.Point(12, 32)
        });
      }
    });
  }, [selectedBusiness, markers, map]);

  // Expose business click handler globally
  useEffect(() => {
    (window as any).handleBusinessClick = (businessId: string) => {
      const business = businesses.find(b => b.id === businessId);
      if (business && onBusinessClick) {
        onBusinessClick(business);
      }
    };

    return () => {
      delete (window as any).handleBusinessClick;
    };
  }, [businesses, onBusinessClick]);

  return (
    <div className={`w-full ${className} rounded-lg overflow-hidden border border-gray-300`}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}