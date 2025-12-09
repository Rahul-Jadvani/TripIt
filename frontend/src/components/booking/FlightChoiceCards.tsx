import React, { useState } from 'react';
import { RefreshCw, Plane, Clock, DollarSign, Loader2, ExternalLink, Info } from 'lucide-react';

interface Flight {
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  price: number;
  booking_url: string;
  sources?: string[];
  segment?: {
    from: string;
    to: string;
    type: string;
    index: number;
  };
}

interface SegmentInfo {
  from: string;
  to: string;
  type: string;
  index: number;
  total: number;
}

interface Props {
  flights: Flight[];
  onSelect: (flight: Flight) => void;
  onCustomize?: () => void;
  isLoading?: boolean;
  segmentInfo?: SegmentInfo;
}

const FlightChoiceCards: React.FC<Props> = ({ flights, onSelect, onCustomize, isLoading = false, segmentInfo }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showSources, setShowSources] = useState<number | null>(null);

  const handleSelect = (flight: Flight, index: number) => {
    setSelectedIndex(index);
    setTimeout(() => {
      onSelect(flight);
    }, 300);
  };

  if (flights.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-muted-foreground font-medium mb-4">No flights found for this route.</p>
        <div className="flex gap-3 justify-center">
          {onCustomize && (
            <button
              onClick={onCustomize}
              disabled={isLoading}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Try Different Options
                </>
              )}
            </button>
          )}
          <button
            onClick={() => onSelect({ skip: true } as any)}
            className="btn-primary"
          >
            Skip This Flight
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Segment Info Header */}
      {segmentInfo && (
        <div className="bg-primary/10 border-2 border-primary rounded-[15px] p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">
                {segmentInfo.from} → {segmentInfo.to}
              </span>
              {segmentInfo.type === 'return' && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-bold">
                  RETURN
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              Segment {segmentInfo.index + 1}/{segmentInfo.total}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-foreground">
          <Plane className="w-6 h-6 inline mr-2" />
          Choose Your Flight
        </h3>
        {onCustomize && (
          <button
            onClick={onCustomize}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isLoading ? 'Loading...' : 'Different Options'}
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

          {/* Sources */}
          {flight.sources && flight.sources.length > 0 && (
            <div className="mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSources(showSources === index ? null : index);
                }}
                className="text-xs text-primary flex items-center gap-1 hover:text-primary/80 transition-colors font-medium"
              >
                <Info className="w-3 h-3" />
                {showSources === index ? 'Hide' : 'View'} Verified Sources
              </button>
              {showSources === index && (
                <div className="mt-2 p-3 bg-secondary border-2 border-black rounded-[10px]">
                  <div className="text-xs font-bold mb-2 text-foreground">Verified Sources:</div>
                  <div className="space-y-1">
                    {flight.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Source {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
              {selectedIndex === index ? 'Selected' : 'Select Flight'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FlightChoiceCards;
