import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import BookingChat from '../components/booking/BookingChat';
import FlightChoiceCards from '../components/booking/FlightChoiceCards';
import HotelMapView from '../components/booking/HotelMapView';
import ActivityCards from '../components/booking/ActivityCards';
import BookingSummary from '../components/booking/BookingSummary';
import CityConfirmation from '../components/booking/CityConfirmation';
import api from '@/services/api';

interface BookingSession {
  id: number;
  session_token: string;
  current_step: string;
  departure_city: string | null;
  departure_date: string | null;
  return_date: string | null;
  num_travelers: number | null;
  budget_preference: string | null;
  cities: string[];
  current_destination_index: number;
  selected_flights: any[];
  selected_hotels: any[];
  selected_activities: any[];
  flight_options: any[];
  hotel_options: any[];
  activity_options: any[];
  completed: boolean;
}

interface ChatMessage {
  type: 'question' | 'choice' | 'loading' | 'summary';
  step: string;
  message: string;
  input_type?: string;
  options?: any[];
  choices?: any[];
  placeholder?: string;
  min_date?: string;
  multi_select?: boolean;
  detected_cities?: string[];
  allow_edit?: boolean;
  segment_info?: {
    from: string;
    to: string;
    type: string;
    index: number;
    total: number;
  };
}

const BookingPage: React.FC = () => {
  const { itineraryId } = useParams<{ itineraryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<BookingSession | null>(null);
  const [currentMessage, setCurrentMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isRegeneratingFlights, setIsRegeneratingFlights] = useState(false);
  const [isRegeneratingHotels, setIsRegeneratingHotels] = useState(false);
  const [isRegeneratingActivities, setIsRegeneratingActivities] = useState(false);

  useEffect(() => {
    startBookingSession();
  }, [itineraryId]);

  const startBookingSession = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        '/booking/start',
        { itinerary_id: itineraryId }
      );

      setSession(response.data.session);
      setCurrentMessage(response.data.message);
      setChatHistory([
        {
          type: 'bot',
          message: response.data.message.message,
          timestamp: new Date()
        }
      ]);
      setLoading(false);
    } catch (err: any) {
      console.error('Error starting booking:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to start booking';
      console.error('Full error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      setError(errorMsg);
      setLoading(false);
    }
  };

  const formatUserMessage = (userInput: string | any): string => {
    if (typeof userInput === 'string') return userInput;

    // Format date range
    if (userInput.departure && !userInput.airline && !userInput.name) {
      const departure = new Date(userInput.departure).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (userInput.return) {
        const returnDate = new Date(userInput.return).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `Travel dates: ${departure} - ${returnDate}`;
      }
      return `Travel date: ${departure}`;
    }

    // Format flight skip
    if (userInput.skip === true) {
      return 'Skipped this flight segment';
    }

    // Format flight selection
    if (userInput.airline && userInput.flight_number) {
      return `Selected flight: ${userInput.airline} ${userInput.flight_number} (${userInput.departure_time} - ${userInput.arrival_time})`;
    }

    // Format hotel selection
    if (userInput.name && userInput.star_rating && userInput.name !== 'Hotel Skipped') {
      return `Selected hotel: ${userInput.name} (${userInput.star_rating} stars)`;
    }

    // Format hotel skip
    if (userInput.name === 'Hotel Skipped' || (userInput.skip && userInput.star_rating !== undefined)) {
      return 'Skipped this hotel';
    }

    // Format activities selection
    if (Array.isArray(userInput) && userInput.length > 0 && userInput[0].name) {
      const activityNames = userInput.map(a => a.name).join(', ');
      return `Selected activities: ${activityNames}`;
    }

    // Format cities confirmation
    if (userInput.cities && Array.isArray(userInput.cities)) {
      return `Confirmed route: ${userInput.cities.join(' → ')}`;
    }

    // Format simple objects (like numbers converted to objects)
    if (typeof userInput === 'object' && Object.keys(userInput).length === 0) {
      return '[Empty]';
    }

    // If it's a simple value wrapped in an object, extract it
    const values = Object.values(userInput);
    if (values.length === 1 && typeof values[0] === 'string') {
      return values[0];
    }

    // Default: hide complex objects
    return 'Selection confirmed';
  };

  const handleSendMessage = async (userInput: string | any) => {
    if (!session) return;

    // Add user message to chat history
    const userMessage = {
      type: 'user',
      message: formatUserMessage(userInput),
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      // Send message to backend
      const response = await api.post(
        '/booking/message',
        {
          session_token: session.session_token,
          message: typeof userInput === 'string' ? userInput : JSON.stringify(userInput)
        }
      );

      setSession(response.data.session);
      setCurrentMessage(response.data.message);

      // Add bot response to chat history
      setChatHistory(prev => [
        ...prev,
        {
          type: 'bot',
          message: response.data.message.message,
          timestamp: new Date()
        }
      ]);

      // Handle trigger_search flag
      if (response.data.trigger_search) {
        await handleSearch(response.data.message.step);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.error || 'Failed to send message');
    }
  };

  const handleSearch = async (step: string) => {
    if (!session) return;

    let endpoint = '';
    if (step === 'searching_flights') {
      endpoint = '/search-flights';
    } else if (step === 'searching_hotels') {
      endpoint = '/search-hotels';
    } else if (step === 'searching_activities') {
      endpoint = '/search-activities';
    }

    if (!endpoint) return;

    try {
      const response = await api.post(
        `/booking${endpoint}`,
        { session_token: session.session_token }
      );

      setSession(response.data.session);
      setCurrentMessage(response.data.message);

      // Add bot response to chat history
      setChatHistory(prev => [
        ...prev,
        {
          type: 'bot',
          message: response.data.message.message,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error('Error searching:', err);
      setError(err.response?.data?.error || 'Failed to search');
    }
  };

  const handleSelectFlight = async (flight: any) => {
    await handleSendMessage(flight);
  };

  const handleSelectHotel = async (hotel: any) => {
    await handleSendMessage(hotel);
  };

  const handleSelectActivities = async (activities: any[]) => {
    await handleSendMessage(activities);
  };

  const handleCustomizeFlights = async () => {
    if (!session) return;
    try {
      setIsRegeneratingFlights(true);
      const response = await api.post(
        '/booking/search-flights',
        { session_token: session.session_token, regenerate: true }
      );
      setSession(response.data.session);
      setCurrentMessage(response.data.message);
    } catch (err: any) {
      console.error('Error regenerating flights:', err);
    } finally {
      setIsRegeneratingFlights(false);
    }
  };

  const handleCustomizeHotels = async () => {
    if (!session) return;
    try {
      setIsRegeneratingHotels(true);
      const response = await api.post(
        '/booking/search-hotels',
        { session_token: session.session_token, regenerate: true }
      );
      setSession(response.data.session);
      setCurrentMessage(response.data.message);
    } catch (err: any) {
      console.error('Error regenerating hotels:', err);
    } finally {
      setIsRegeneratingHotels(false);
    }
  };

  const handleCustomizeActivities = async () => {
    if (!session) return;
    try {
      setIsRegeneratingActivities(true);
      const response = await api.post(
        '/booking/search-activities',
        { session_token: session.session_token, regenerate: true }
      );
      setSession(response.data.session);
      setCurrentMessage(response.data.message);
    } catch (err: any) {
      console.error('Error regenerating activities:', err);
    } finally {
      setIsRegeneratingActivities(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-bold">Starting your booking journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="card-elevated p-8 max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-primary hover:text-primary/80 mb-4 flex items-center gap-2 font-bold transition-all"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Book Your Trip
          </h1>
          <p className="text-muted-foreground">
            Let's find the best options for your journey
          </p>

          {/* Multi-city Progress Indicator */}
          {session && session.cities && session.cities.length > 1 && (
            <div className="mt-4 card-elevated p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-muted-foreground">MULTI-CITY TRIP</span>
              </div>
              <div className="flex items-center gap-2">
                {session.cities.map((city: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
                        index === session.current_destination_index
                          ? 'bg-primary text-primary-foreground'
                          : index < session.current_destination_index
                          ? 'bg-secondary text-foreground border-2 border-black'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {city}
                    </div>
                    {index < session.cities.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Interface */}
          <div>
            <BookingChat
              chatHistory={chatHistory}
              currentMessage={currentMessage}
              onSendMessage={handleSendMessage}
              session={session}
            />
          </div>

          {/* Dynamic Content Area */}
          <div>
            {currentMessage?.input_type === 'city_confirmation' && (
              <CityConfirmation
                detectedCities={currentMessage.detected_cities || []}
                onConfirm={(cities) => {
                  handleSendMessage(JSON.stringify({ cities }));
                }}
              />
            )}

            {currentMessage?.input_type === 'flight_cards' && (
              <FlightChoiceCards
                flights={currentMessage.options || []}
                onSelect={handleSelectFlight}
                onCustomize={handleCustomizeFlights}
                isLoading={isRegeneratingFlights}
                segmentInfo={currentMessage.segment_info}
              />
            )}

            {currentMessage?.input_type === 'hotel_map' && (
              <HotelMapView
                hotels={currentMessage.options || []}
                onSelect={handleSelectHotel}
                onCustomize={handleCustomizeHotels}
                isLoading={isRegeneratingHotels}
              />
            )}

            {currentMessage?.input_type === 'activity_cards' && (
              <ActivityCards
                activities={currentMessage.options || []}
                onSelect={handleSelectActivities}
                multiSelect={currentMessage.multi_select || false}
                onCustomize={handleCustomizeActivities}
                isLoading={isRegeneratingActivities}
              />
            )}

            {currentMessage?.type === 'summary' && session && (
              <BookingSummary session={session} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
