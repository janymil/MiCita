import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Star, Phone } from 'lucide-react';

interface OpenStreetMapProps {
  businesses: any[];
  onMapBoundsChange?: (bounds: any) => void;
  onBusinessClick?: (business: any) => void;
  selectedBusiness?: any;
  className?: string;
  showPriceCards?: boolean;
  isSearching?: boolean;
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
  className = '',
  showPriceCards = false,
  isSearching = false
}: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerClusterRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingMarkers, setIsUpdatingMarkers] = useState(false);

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

        // Add custom styles for Airbnb-like map
        const customStyles = document.createElement('style');
        customStyles.textContent = `
          .airbnb-popup .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
            box-shadow: 0 8px 28px rgba(0,0,0,0.12);
            border: 1px solid #e0e0e0;
          }
          .airbnb-popup .leaflet-popup-content {
            margin: 0;
            padding: 0;
          }
          .airbnb-popup .leaflet-popup-tip {
            background: white;
            border: 1px solid #e0e0e0;
            border-top: none;
            border-right: none;
          }
          .airbnb-price-marker {
            z-index: 1000;
          }
          .airbnb-price-marker:hover {
            z-index: 1001;
          }
          .custom-leaflet-marker {
            z-index: 999;
          }
          .leaflet-container {
            background: #f7f7f7;
          }
        `;
        document.head.appendChild(customStyles);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        
        script.onload = async () => {
          // Load MarkerCluster plugin
          try {
            const clusterCss = document.createElement('link');
            clusterCss.rel = 'stylesheet';
            clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
            document.head.appendChild(clusterCss);

            const clusterDefaultCss = document.createElement('link');
            clusterDefaultCss.rel = 'stylesheet';
            clusterDefaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
            document.head.appendChild(clusterDefaultCss);

            const clusterScript = document.createElement('script');
            clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
            
            clusterScript.onload = () => {
              setIsLoaded(true);
            };
            
            clusterScript.onerror = () => {
              setError('Failed to load clustering plugin');
            };
            
            document.head.appendChild(clusterScript);
          } catch (err) {
            setError('Failed to load clustering resources');
          }
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

      // Initialize marker cluster group with optimized settings for large datasets
      if (window.L.markerClusterGroup) {
        markerClusterRef.current = window.L.markerClusterGroup({
          maxClusterRadius: 60,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          disableClusteringAtZoom: 16,
          removeOutsideVisibleBounds: true,
          animate: true,
          animateAddingMarkers: false,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();
            let className = 'marker-cluster-';
            
            if (count < 10) {
              className += 'small';
            } else if (count < 100) {
              className += 'medium';
            } else {
              className += 'large';
            }
            
            return window.L.divIcon({
              html: `<div style="
                background: white;
                border: 2px solid #dd0845;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                color: #dd0845;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              ">${count}</div>`,
              className: `marker-cluster ${className}`,
              iconSize: window.L.point(40, 40)
            });
          }
        });
        
        map.addLayer(markerClusterRef.current);
      }

      // Set up bounds change listener with debounce
      if (onMapBoundsChange) {
        let debounceTimer: any;
        
        const updateBounds = () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const bounds = map.getBounds();
            const boundsData = {
              getNorthEast: () => ({ lat: () => bounds.getNorth(), lng: () => bounds.getEast() }),
              getSouthWest: () => ({ lat: () => bounds.getSouth(), lng: () => bounds.getWest() }),
              contains: (latLng: any) => bounds.contains([latLng.lat, latLng.lng])
            };
            onMapBoundsChange(boundsData);
          }, 500); // Reduced debounce for more responsive updates
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
    setIsUpdatingMarkers(true);

    // Clear existing markers
    if (markerClusterRef.current) {
      markerClusterRef.current.clearLayers();
    } else {
      markersRef.current.forEach(marker => map.removeLayer(marker));
    }
    markersRef.current = [];

    if (businesses.length === 0) {
      setIsUpdatingMarkers(false);
      return;
    }

    const bounds = window.L.latLngBounds();

    businesses.forEach((business) => {
      if (!business.location?.lat || !business.location?.lng) return;

      const isSelected = selectedBusiness?.id === business.id;
      
      // Create Airbnb-style price card or traditional marker
      let icon;
      if (showPriceCards) {
        // Airbnb-style business name card
        const businessNameText = business.name.length > 12 ? business.name.substring(0, 12) + '...' : business.name;
        icon = window.L.divIcon({
          html: `
            <div style="
              background: ${isSelected ? '#222' : 'white'};
              color: ${isSelected ? 'white' : '#222'};
              padding: 6px 12px;
              border-radius: 24px;
              border: 1px solid ${isSelected ? '#222' : '#ddd'};
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              font-size: 12px;
              font-weight: 600;
              white-space: nowrap;
              cursor: pointer;
              transition: all 0.2s ease;
              position: relative;
              max-width: 150px;
              overflow: hidden;
              text-overflow: ellipsis;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              ${businessNameText}
              <div style="
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid ${isSelected ? '#222' : 'white'};
              "></div>
            </div>
          `,
          iconSize: [Math.min(businessNameText.length * 8 + 24, 150), 32],
          iconAnchor: [Math.min(businessNameText.length * 4 + 12, 75), 38],
          popupAnchor: [0, -38],
          className: 'airbnb-price-marker'
        });
      } else {
        // Traditional marker
        icon = window.L.divIcon({
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
      }

      const marker = window.L.marker([business.location.lat, business.location.lng], { icon });

      // Create enhanced popup content
      const popupContent = `
        <div style="padding: 0; max-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${business.photoUrl || business.photos?.[0] ? `
            <div style="width: 100%; height: 160px; background-size: cover; background-position: center; background-image: url('${business.photoUrl || business.photos?.[0]}'); border-radius: 8px 8px 0 0; margin-bottom: 12px;"></div>
          ` : ''}
          <div style="padding: 0 16px 16px 16px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #222; line-height: 1.2;">${business.name}</h3>
            
            ${business.rating ? `
              <div style="display: flex; align-items: center; margin: 6px 0;">
                <span style="color: #fbbf24; font-size: 14px; margin-right: 4px;">★</span>
                <span style="font-size: 14px; font-weight: 600; margin-right: 4px;">${business.rating}</span>
                ${business.reviewCount ? `<span style="font-size: 14px; color: #717171;">(${business.reviewCount} reseñas)</span>` : ''}
              </div>
            ` : ''}
            
            <p style="margin: 6px 0; font-size: 14px; color: #717171; line-height: 1.3;">${business.address || 'Dirección no disponible'}</p>
            
            ${business.description ? `
              <p style="margin: 8px 0; font-size: 14px; color: #484848; line-height: 1.4;">${business.description.substring(0, 100)}${business.description.length > 100 ? '...' : ''}</p>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ebebeb;">
              ${business.categoryName ? `
                <div style="font-size: 14px; font-weight: 600; color: #666; background: #f0f0f0; padding: 4px 8px; border-radius: 12px;">
                  ${business.categoryName}
                </div>
              ` : ''}
              ${business.phone ? `
                <a href="tel:${business.phone}" style="color: #008489; text-decoration: none; font-size: 14px; font-weight: 600;">
                  📞 Llamar
                </a>
              ` : ''}
            </div>
            
            <button onclick="window.openBusiness && window.openBusiness('${business.id}')" style="
              width: 100%; 
              background: #dd0845; 
              color: white; 
              border: none; 
              padding: 12px; 
              border-radius: 8px; 
              font-size: 14px; 
              font-weight: 600; 
              margin-top: 12px; 
              cursor: pointer;
              transition: background 0.2s;
            " onmouseover="this.style.background='#c7073b'" onmouseout="this.style.background='#dd0845'">
              Ver detalles
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'airbnb-popup'
      });

      marker.on('click', () => {
        if (onBusinessClick) onBusinessClick(business);
      });

      // Add marker to cluster group or map
      if (markerClusterRef.current) {
        markerClusterRef.current.addLayer(marker);
      } else {
        marker.addTo(map);
      }

      markersRef.current.push(marker);
      bounds.extend([business.location.lat, business.location.lng]);
    });

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      // Use cluster bounds if available, otherwise use manual bounds
      if (markerClusterRef.current && markerClusterRef.current.getBounds) {
        try {
          map.fitBounds(markerClusterRef.current.getBounds(), { padding: [20, 20] });
        } catch (e) {
          // Fallback to manual bounds
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      } else {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
      
      // Ensure reasonable zoom level
      setTimeout(() => {
        if (map.getZoom() > 16) {
          map.setZoom(16);
        }
      }, 100);
    }
    
    // Delay to show loading indicator for better UX
    setTimeout(() => {
      setIsUpdatingMarkers(false);
    }, 200);
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
        
        {isLoaded && (isUpdatingMarkers || isSearching) && (
          <div 
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '8px 12px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            <span className="text-sm text-gray-700">
              {isSearching ? 'Buscando...' : 'Actualizando marcadores...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}