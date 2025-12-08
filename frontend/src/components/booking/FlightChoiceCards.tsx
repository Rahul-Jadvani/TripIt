import React, { useState } from 'react';
import { RefreshCw, Plane, Clock, DollarSign } from 'lucide-react';

interface Flight {
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  price: number;
  booking_url: string;
}

interface Props {
  flights: Flight[];
  onSelect: (flight: Flight) => void;
  onCustomize?: () => void;
}

const FlightChoiceCards: React.FC<Props> = ({ flights, onSelect, onCustomize }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (flight: Flight, index: number) => {
    setSelectedIndex(index);
    setTimeout(() => {
      onSelect(flight);
    }, 300);
  };

  if (flights.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <div className="text-6xl mb-4">✈️</div>
        <p className="text-muted-foreground font-medium mb-4">No flights found. Let's try different dates.</p>
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
          <Plane className="w-6 h-6 inline mr-2" />
          Choose Your Flight
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

      {flights.map((flight, index) => (
        <div
          key={index}
          onClick={() => handleSelect(flight, index)}
          className={`card-elevated p-6 cursor-pointer transition-all hover:shadow-button-hover ${
            selectedIndex === index
              ? 'ring-4 ring-primary'
              : ''
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-xl font-bold text-foreground">
                {flight.airline}
              </h4>
              <p className="text-sm text-muted-foreground">{flight.flight_number}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                ₹{flight.price.toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-muted-foreground">per person</p>
            </div>
          </div>

          {/* Flight Details */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {flight.departure_time}
              </div>
              <div className="text-sm text-muted-foreground">Departure</div>
            </div>

            <div className="flex-1 mx-4">
              <div className="relative">
                <div className="h-2 bg-muted rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-card px-2 text-xs text-muted-foreground whitespace-nowrap border-2 border-black rounded-full">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {flight.duration}
                  </div>
                </div>
              </div>
              <div className="text-center mt-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {flight.arrival_time}
              </div>
              <div className="text-sm text-muted-foreground">Arrival</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <a
              href={flight.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 btn-secondary text-center"
            >
              View Details
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(flight, index);
              }}
              className={`flex-1 ${selectedIndex === index ? 'btn-primary' : 'btn-primary'}`}
            >
              {selectedIndex === index ? '✓ Selected' : 'Select Flight'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FlightChoiceCards;
