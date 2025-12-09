import { FC, useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, MapPin, Loader2, Navigation } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { parseAndGeocodeRoute, RouteWaypoint, getRouteBounds } from '@/utils/routeParser';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hyYXZhbjQ1IiwiYSI6ImNtaXgxZ3gwajAxeG4zZnF1ZWJpODRpOGQifQ.YT9XlUwsK8dLRAF-BjC54A';
mapboxgl.accessToken = MAPBOX_TOKEN;

interface RouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayByDayPlan: string;
  destination: string;
  title?: string;
}

export const RouteMapModal: FC<RouteMapModalProps> = ({
  isOpen,
  onClose,
  dayByDayPlan,
  destination,
  title = 'Route Map'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse and geocode locations when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadRoute = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[RouteMap] Parsing route from:', { destination, dayByDayPlan: dayByDayPlan?.substring(0, 100) });

        const parsedWaypoints = await parseAndGeocodeRoute(dayByDayPlan, destination);

        console.log('[RouteMap] Parsed waypoints:', parsedWaypoints);

        if (parsedWaypoints.length === 0) {
          setError('Could not extract locations from itinerary');
        } else {
          setWaypoints(parsedWaypoints);
        }
      } catch (err) {
        console.error('[RouteMap] Error loading route:', err);
        setError('Failed to load route map');
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, [isOpen, dayByDayPlan, destination]);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainer.current || waypoints.length === 0 || map.current) return;

    try {
      // Initialize map
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [waypoints[0].lng, waypoints[0].lat],
        zoom: 10
      });

      // Add navigation controls
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current = newMap;

      newMap.on('load', () => {
        // Add markers for each waypoint
        waypoints.forEach((waypoint, index) => {
          // Create custom marker element with offset to prevent overlap
          const el = document.createElement('div');
          el.className = 'route-marker';
          el.style.zIndex = String(100 + index); // Higher z-index for later days
          el.innerHTML = `
            <div style="
              background: #7C3AED;
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              cursor: pointer;
              position: relative;
            ">${waypoint.day}</div>
          `;

          // Create popup
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <h4 style="font-weight: bold; margin-bottom: 4px;">Day ${waypoint.day}</h4>
              <p style="font-weight: 600; color: #7C3AED; margin-bottom: 4px;">${waypoint.location}</p>
              ${waypoint.description ? `<p style="font-size: 13px; color: #666;">${waypoint.description}</p>` : ''}
            </div>
          `);

          // Add marker
          const marker = new mapboxgl.Marker(el)
            .setLngLat([waypoint.lng, waypoint.lat])
            .setPopup(popup)
            .addTo(newMap);

          markers.current.push(marker);
        });

        // Draw route line if multiple waypoints
        if (waypoints.length > 1) {
          const coordinates = waypoints.map(w => [w.lng, w.lat]);

          newMap.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates
              }
            }
          });

          newMap.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#7C3AED',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });

          // Add arrows to show direction
          newMap.addLayer({
            id: 'route-arrows',
            type: 'symbol',
            source: 'route',
            layout: {
              'symbol-placement': 'line',
              'symbol-spacing': 50,
              'icon-image': 'arrow',
              'icon-size': 0.5,
              'icon-rotate': 90,
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            }
          });
        }

        // Fit map to show all waypoints with appropriate zoom
        const bounds = getRouteBounds(waypoints);
        if (bounds) {
          newMap.fitBounds(bounds, {
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
            maxZoom: 10,  // Don't zoom in too much
            minZoom: 4    // Don't zoom out too much
          });
        }
      });
    } catch (err) {
      console.error('[RouteMap] Error initializing map:', err);
      setError('Failed to initialize map');
    }

    // Cleanup
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, waypoints]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] aspect-square max-h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-black bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="badge-primary rounded-full p-2">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {waypoints.length > 0 ? `${waypoints.length} waypoint${waypoints.length !== 1 ? 's' : ''}` : 'Loading route...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-[10px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Loading route map...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
              <div className="text-center max-w-md px-4">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2">Unable to Load Map</h3>
                <p className="text-muted-foreground">{error}</p>
                <button onClick={onClose} className="btn-secondary mt-4">
                  Close
                </button>
              </div>
            </div>
          )}

          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Waypoints List */}
        {waypoints.length > 0 && !loading && (
          <div className="border-t-2 border-black bg-card p-4 max-h-48 overflow-y-auto">
            <h3 className="text-sm font-bold text-muted-foreground mb-3">ROUTE WAYPOINTS</h3>
            <div className="space-y-2">
              {waypoints.map((waypoint, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 hover:bg-secondary rounded-[10px] transition-colors cursor-pointer"
                  onClick={() => {
                    if (map.current) {
                      map.current.flyTo({
                        center: [waypoint.lng, waypoint.lat],
                        zoom: 13,
                        duration: 1500
                      });
                      markers.current[index]?.togglePopup();
                    }
                  }}
                >
                  <div className="badge-primary rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {waypoint.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">Day {waypoint.day}</h4>
                    <p className="text-sm text-primary font-semibold">{waypoint.location}</p>
                    {waypoint.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{waypoint.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
