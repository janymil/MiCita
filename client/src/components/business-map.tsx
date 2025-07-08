import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

// Extend window object for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

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
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      return new Promise<void>((resolve, reject) => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          reject(new Error("Google Maps API key not configured"));
          return;
        }

        // Check if Google Maps is already loaded
        if (window.google?.maps) {
          resolve();
          return;
        }

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&v=weekly`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log("Google Maps script loaded successfully");
          resolve();
        };
        
        script.onerror = () => {
          console.error("Failed to load Google Maps script");
          reject(new Error("Failed to load Google Maps script"));
        };

        document.head.appendChild(script);
      });
    };

    const initMap = async () => {
      try {
        setIsLoading(true);
        setMapError(null);
        
        console.log("Loading Google Maps...");
        await loadGoogleMaps();
        console.log("Google Maps loaded successfully");

        if (!mapRef.current) {
          console.error("Map container ref not found");
          setMapError("Map container not found");
          setIsLoading(false);
          return;
        }

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

        console.log("Map instance created successfully");
        setMap(mapInstance);
        setIsLoading(false);

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
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
        setMapError(`Error loading map: ${error.message}`);
        setIsLoading(false);
      }
    };

    initMap();
  }, []); // Remove onMapBoundsChange dependency to prevent re-initialization

  // Clean up markers when component unmounts or markers change
  useEffect(() => {
    return () => {
      if (markers && markers.length > 0) {
        markers.forEach(marker => {
          try {
            if (marker && typeof marker.setMap === 'function') {
              marker.setMap(null);
            }
          } catch (e) {
            // Ignore errors during cleanup
            console.warn('Error cleaning up marker:', e);
          }
        });
      }
    };
  }, [markers]);

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up info window
      if (infoWindow) {
        try {
          infoWindow.close();
        } catch (e) {
          console.warn('Error closing info window:', e);
        }
      }
      
      // Clean up any remaining markers
      if (markers && markers.length > 0) {
        markers.forEach(marker => {
          try {
            if (marker && typeof marker.setMap === 'function') {
              marker.setMap(null);
            }
          } catch (e) {
            console.warn('Error in final cleanup:', e);
          }
        });
      }
    };
  }, []);

  // Update markers when businesses change
  useEffect(() => {
    if (!map || !businesses) return;

    // Clear existing markers safely with better error handling
    if (markers && markers.length > 0) {
      markers.forEach(marker => {
        try {
          if (marker && typeof marker.setMap === 'function') {
            marker.setMap(null);
          }
        } catch (e) {
          console.warn('Error removing marker:', e);
        }
      });
    }
    
    // Use timeout to ensure DOM is ready for new markers
    const timeoutId = setTimeout(() => {
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
        try {
          map.fitBounds(bounds);
          
          // Ensure minimum zoom level
          const listener = google.maps.event.addListener(map, "idle", () => {
            try {
              if (map.getZoom() && map.getZoom()! > 16) {
                map.setZoom(16);
              }
              google.maps.event.removeListener(listener);
            } catch (e) {
              console.warn('Error setting zoom:', e);
            }
          });
        } catch (e) {
          console.warn('Error fitting bounds:', e);
        }
      }
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup timeout on component unmount or dependencies change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

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

  if (mapError) {
    return (
      <div className={`w-full ${className} rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center`}>
        <div className="text-center p-8">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Mapa no disponible</h3>
          <p className="text-sm text-gray-600">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${className} rounded-lg overflow-hidden border border-gray-300`}
      key={`map-container-${businesses.length}`} // Add key to help React track changes
    >
      <div ref={mapRef} className="w-full h-full">
        {isLoading && (
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