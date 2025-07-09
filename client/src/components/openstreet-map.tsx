import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface OpenStreetMapProps {
  businesses: any[];
  onMapBoundsChange?: (bounds: any) => void;
  onBusinessClick?: (business: any) => void;
  selectedBusiness?: any;
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function OpenStreetMap({
  businesses,
  onMapBoundsChange,
  onBusinessClick,
  selectedBusiness,
  className = ''
}: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        // Check if already loaded
        if (window.L) {
          setIsLoaded(true);
          return;
        }

        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        
        script.onload = () => {
          setIsLoaded(true);
        };
        
        script.onerror = () => {
          setError('Failed to load OpenStreetMap');
        };
        
        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading map resources');
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      // Create map instance
      const map = window.L.map(mapRef.current, {
        center: [-12.0464, -77.0428], // Lima, Peru
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true
      });

      // Add tile layer (OpenStreetMap)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Set up bounds change listener
      if (onMapBoundsChange) {
        const updateBounds = () => {
          const bounds = map.getBounds();
          const boundsData = {
            getNorthEast: () => ({ lat: () => bounds.getNorth(), lng: () => bounds.getEast() }),
            getSouthWest: () => ({ lat: () => bounds.getSouth(), lng: () => bounds.getWest() }),
            contains: (latLng: any) => bounds.contains([latLng.lat, latLng.lng])
          };
          onMapBoundsChange(boundsData);
        };

        map.on('moveend', updateBounds);
        map.on('zoomend', updateBounds);
        
        // Initial bounds
        updateBounds();
      }

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [isLoaded, onMapBoundsChange]);

  // Update markers when businesses change
  useEffect(() => {
    if (!mapInstanceRef.current || !businesses || !window.L) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    if (businesses.length === 0) return;

    const bounds = window.L.latLngBounds();

    businesses.forEach((business) => {
      if (!business.location?.lat || !business.location?.lng) return;

      // Create custom icon
      const isSelected = selectedBusiness?.id === business.id;
      const icon = window.L.divIcon({
        html: `
          <div style="
            background: ${isSelected ? '#dc2626' : '#ef4444'};
            width: 24px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            position: relative;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              color: white;
              font-size: 10px;
              font-weight: bold;
            ">${business.name.charAt(0)}</div>
          </div>
        `,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32],
        className: 'custom-leaflet-marker'
      });

      const marker = window.L.marker([business.location.lat, business.location.lng], { icon })
        .addTo(map);

      // Create popup content
      const popupContent = `
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

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onBusinessClick) onBusinessClick(business);
      });

      markersRef.current.push(marker);
      bounds.extend([business.location.lat, business.location.lng]);
    });

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20] });
      
      // Ensure reasonable zoom level
      setTimeout(() => {
        if (map.getZoom() > 16) {
          map.setZoom(16);
        }
      }, 100);
    }
  }, [businesses, onBusinessClick, selectedBusiness]);

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
          touchAction: 'manipulation'
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
              zIndex: 1000
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