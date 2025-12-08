import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RefreshCw, Hotel, Star, MapPin } from 'lucide-react';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hyYXZhbjQ1IiwiYSI6ImNtaXgxZ3gwajAxeG4zZnF1ZWJpODRpOGQifQ.YT9XlUwsK8dLRAF-BjC54A';

interface Hotel {
  name: string;
  star_rating: number;
  address: string;
  amenities: string[];
  price_per_night: number;
  total_price: number;
  rating: number;
  review_count: number;
  booking_url: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Props {
  hotels: Hotel[];
  onSelect: (hotel: Hotel) => void;
  onCustomize?: () => void;
}

const HotelMapView: React.FC<Props> = ({ hotels, onSelect, onCustomize }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current || hotels.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const firstHotel = hotels[0];
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [firstHotel.coordinates.lng, firstHotel.coordinates.lat],
      zoom: 12
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    hotels.forEach((hotel, index) => {
      const el = document.createElement('div');
      el.className = 'hotel-marker';
      el.style.cssText = `
        background: linear-gradient(135deg, #f66926 0%, #ff8c52 100%);
        color: black;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0,0,0,0.8);
        border: 3px solid black;
        font-size: 14px;
      `;
      el.textContent = hotel.rating.toFixed(1);

      el.addEventListener('click', () => {
        setSelectedHotel(hotel);
        setSelectedIndex(index);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([hotel.coordinates.lng, hotel.coordinates.lat])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    const bounds = new mapboxgl.LngLatBounds();
    hotels.forEach(hotel => {
      bounds.extend([hotel.coordinates.lng, hotel.coordinates.lat]);
    });
    map.current.fitBounds(bounds, { padding: 50 });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [hotels]);

  const handleSelect = (hotel: Hotel, index: number) => {
    setSelectedIndex(index);
    setTimeout(() => {
      onSelect(hotel);
    }, 300);
  };

  const handleCardClick = (hotel: Hotel, index: number) => {
    setSelectedHotel(hotel);
    setSelectedIndex(index);

    if (map.current) {
      map.current.flyTo({
        center: [hotel.coordinates.lng, hotel.coordinates.lat],
        zoom: 15,
        duration: 1000
      });
    }
  };

  if (hotels.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <div className="text-6xl mb-4">🏨</div>
        <p className="text-muted-foreground font-medium mb-4">No hotels found. Let's try different criteria.</p>
        {onCustomize && (
          <button onClick={onCustomize} className="btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Try Different Options
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-foreground">
          <Hotel className="w-6 h-6 inline mr-2" />
          Choose Your Hotel
        </h3>
        {onCustomize && (
          <button
            onClick={onCustomize}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Different Options
          </button>
        )}
      </div>

      {/* Map */}
      <div className="card-elevated overflow-hidden">
        <div ref={mapContainer} className="h-[400px]"></div>
      </div>

      {/* Hotel Cards */}
      <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
        {hotels.map((hotel, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(hotel, index)}
            className={`card-elevated p-4 cursor-pointer transition-all hover:shadow-button-hover ${
              selectedIndex === index ? 'ring-4 ring-primary' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-foreground mb-1">
                  {hotel.name}
                </h4>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {Array.from({ length: Math.floor(hotel.star_rating) }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {hotel.rating} ({hotel.review_count.toLocaleString()})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {hotel.address}
                </p>
              </div>
              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-primary">
                  ₹{hotel.price_per_night.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">per night</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  ₹{hotel.total_price.toLocaleString('en-IN')} total
                </p>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 mb-3">
              {hotel.amenities.slice(0, 4).map((amenity, i) => (
                <span
                  key={i}
                  className="bg-secondary text-foreground text-xs px-2 py-1 rounded border border-black font-medium"
                >
                  {amenity}
                </span>
              ))}
              {hotel.amenities.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{hotel.amenities.length - 4} more
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={hotel.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 btn-secondary text-center text-sm"
              >
                View Details
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(hotel, index);
                }}
                className="flex-1 btn-primary text-sm"
              >
                {selectedIndex === index ? '✓ Selected' : 'Select Hotel'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelMapView;
