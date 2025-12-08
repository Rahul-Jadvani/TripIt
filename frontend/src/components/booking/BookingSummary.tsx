import React from 'react';
import { Plane, Hotel, Sparkles, DollarSign, Calendar, Users, Printer } from 'lucide-react';

interface BookingSession {
  departure_city: string;
  departure_date: string;
  return_date: string | null;
  num_travelers: number;
  budget_preference: string;
  cities?: string[];
  selected_flights: any[];
  selected_hotels: any[];
  selected_activities: any[];
}

interface Props {
  session: BookingSession;
}

const BookingSummary: React.FC<Props> = ({ session }) => {
  const calculateTotalCost = () => {
    let total = 0;

    session.selected_flights.forEach(flight => {
      if (!flight.skipped) {
        total += flight.price * session.num_travelers;
      }
    });

    session.selected_hotels.forEach(hotel => {
      if (!hotel.skipped) {
        total += hotel.total_price;
      }
    });

    session.selected_activities.forEach(activity => {
      total += activity.price * session.num_travelers;
    });

    return total;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalCost = calculateTotalCost();

  return (
    <div className="card-elevated p-6 print:shadow-none print:border-0">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .card-elevated, .card-elevated * {
              visibility: visible;
            }
            .card-elevated {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }
            .btn-primary, .btn-secondary {
              display: none !important;
            }
            .text-primary, .text-foreground {
              color: black !important;
            }
            .text-muted-foreground {
              color: #666 !important;
            }
            .bg-secondary, .bg-primary {
              background: #f5f5f5 !important;
              border: 1px solid #ddd !important;
            }
            .border-black {
              border-color: #333 !important;
            }
          }
        `}
      </style>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Your Trip is Ready!
        </h2>
        <p className="text-muted-foreground">
          Review your selections and book when ready
        </p>
      </div>

      {/* Trip Overview */}
      <div className="bg-secondary border-4 border-black rounded-[15px] p-4 mb-6">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Trip Overview
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Route:</span>
            <span className="ml-2 font-bold text-foreground">
              {session.cities && session.cities.length > 0
                ? session.cities.join(' → ')
                : session.departure_city}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Travelers:</span>
            <span className="ml-2 font-bold text-foreground flex items-center gap-1">
              <Users className="w-4 h-4" />
              {session.num_travelers}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Departure:</span>
            <span className="ml-2 font-bold text-foreground">
              {formatDate(session.departure_date)}
            </span>
          </div>
          {session.return_date && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Return:</span>
              <span className="ml-2 font-bold text-foreground">
                {formatDate(session.return_date)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Flights */}
      {session.selected_flights.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            Flights
          </h3>
          {session.selected_flights.map((flight, index) => (
            <div
              key={index}
              className={`bg-card border-2 rounded-[15px] p-4 mb-2 ${
                flight.skipped ? 'border-muted opacity-60' : 'border-black'
              }`}
            >
              {flight.segment && (
                <div className="text-xs font-bold text-primary mb-2">
                  Segment {flight.segment.index + 1}: {flight.segment.from} → {flight.segment.to}
                  {flight.segment.type === 'return' && (
                    <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                      RETURN
                    </span>
                  )}
                  {flight.skipped && (
                    <span className="ml-2 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                      SKIPPED
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  {flight.skipped ? (
                    <>
                      <div className="font-bold text-muted-foreground">
                        Flight Skipped
                      </div>
                      <div className="text-sm text-muted-foreground">
                        No flight selected for this segment
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-foreground">
                        {flight.airline} - {flight.flight_number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {flight.departure_time} → {flight.arrival_time} ({flight.duration})
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop(s)`}
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  {!flight.skipped && (
                    <>
                      <div className="font-bold text-primary text-xl">
                        ₹{(flight.price * session.num_travelers).toLocaleString('en-IN')}
                      </div>
                      <a
                        href={flight.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Book Now →
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hotels */}
      {session.selected_hotels.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Hotel className="w-5 h-5 text-primary" />
            Hotels
          </h3>
          {session.selected_hotels.map((hotel, index) => (
            <div
              key={index}
              className={`bg-card border-2 rounded-[15px] p-4 mb-2 ${
                hotel.skipped ? 'border-muted opacity-60' : 'border-black'
              }`}
            >
              {session.cities && session.cities.length > 1 && session.cities[index] && (
                <div className="text-xs font-bold text-primary mb-2">
                  {session.cities[index]}
                  {hotel.skipped && (
                    <span className="ml-2 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                      SKIPPED
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  {hotel.skipped ? (
                    <>
                      <div className="font-bold text-muted-foreground">
                        Hotel Skipped
                      </div>
                      <div className="text-sm text-muted-foreground">
                        No hotel selected for this location
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-foreground">{hotel.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {hotel.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-primary font-bold">
                          {hotel.star_rating} Star Hotel
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • Rating: {hotel.rating} ({hotel.review_count} reviews)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ₹{hotel.price_per_night.toLocaleString('en-IN')}/night
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  {!hotel.skipped && (
                    <>
                      <div className="font-bold text-primary text-xl">
                        ₹{hotel.total_price.toLocaleString('en-IN')}
                      </div>
                      <a
                        href={hotel.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Book Now →
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activities */}
      {session.selected_activities.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Activities
          </h3>
          {session.selected_activities.map((activity, index) => (
            <div key={index} className="bg-card border-2 border-black rounded-[15px] p-4 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-foreground">
                    {activity.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activity.duration} • Rating: {activity.rating}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary text-xl">
                    ₹{(activity.price * session.num_travelers).toLocaleString('en-IN')}
                  </div>
                  <a
                    href={activity.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Book Now →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total Cost */}
      <div className="border-t-4 border-black pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Total Cost
          </span>
          <span className="text-4xl font-bold text-primary">
            ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Prices are approximate and may vary. Click "Book Now" on each item to confirm current pricing.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        <button
          onClick={() => {
            const bookableFlights = session.selected_flights.filter(f => !f.skipped);
            const bookableHotels = session.selected_hotels.filter(h => !h.skipped);
            [...bookableFlights, ...bookableHotels, ...session.selected_activities]
              .forEach(item => window.open(item.booking_url, '_blank'));
          }}
          className="btn-primary w-full"
        >
          Book All Items
        </button>
        <button
          onClick={() => window.print()}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print Summary
        </button>
      </div>
    </div>
  );
};

export default BookingSummary;
