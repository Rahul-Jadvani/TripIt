import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, Calendar, DollarSign, TrendingUp, Check, Menu, X } from 'lucide-react';
import api from '../services/api';
import { RemixChatModal } from '@/components/remix/RemixChatModal';
import { RemixChatHistory } from '@/components/remix/RemixChatHistory';
import { useRemixChat } from '@/hooks/useRemixChat';

interface Itinerary {
  id: string;
  title: string;
  destination: string;
  duration_days: number;
  budget_amount: number;
  budget_currency: string;
  difficulty_level: string;
  activity_tags: string[];
  screenshots: string[];
  proof_score: number;
  upvotes: number;
  is_remixed?: boolean;
  remix_count?: number;
}

export default function RemixPage() {
  const navigate = useNavigate();
  const chat = useRemixChat();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load chat sessions on mount (only once)
  useEffect(() => {
    console.log('[RemixPage] Component mounted, loading sessions...');
    chat.loadSessions('all'); // Load all sessions (active, finalized, archived)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Debug: Log sessions when they change
  useEffect(() => {
    console.log('[RemixPage] Sessions updated:', chat.sessions.length, chat.sessions);
  }, [chat.sessions]);

  useEffect(() => {
    fetchItineraries();
  }, [page]);

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/itineraries?page=${page}&per_page=12&sort=trending`);

      // Handle different response structures
      let newItineraries = [];
      if (response.data.data?.items) {
        newItineraries = response.data.data.items;
      } else if (response.data.data) {
        newItineraries = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else if (response.data.itineraries) {
        newItineraries = response.data.itineraries;
      } else if (Array.isArray(response.data)) {
        newItineraries = response.data;
      }

      console.log('[RemixPage] Fetched itineraries:', newItineraries.length);

      if (page === 1) {
        setItineraries(newItineraries);
      } else {
        setItineraries(prev => [...prev, ...newItineraries]);
      }

      setHasMore(newItineraries.length === 12);
    } catch (error) {
      console.error('[RemixPage] Error fetching itineraries:', error);
      alert('Failed to load itineraries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else if (prev.length < 3) {
        return [...prev, id];
      } else {
        alert('Maximum 3 itineraries can be selected');
        return prev;
      }
    });
  };

  const handleContinue = () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one itinerary to remix');
      return;
    }
    // Clear active session so modal shows initial input for new chat
    chat.setActiveSession(null);
    setShowChatModal(true);
  };

  const handleResumeSession = async (sessionId: string) => {
    try {
      await chat.loadSession(sessionId);
      setShowChatModal(true);
      // Close sidebar on mobile after selecting
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Failed to load chat session');
    }
  };

  const handleNewChat = () => {
    chat.setActiveSession(null);
    setSelectedIds([]);
    setShowChatModal(false);
    // Don't reload sessions - they should persist
  };

  const handleCloseModal = () => {
    setShowChatModal(false);
    // Keep the active session and sessions list intact
  };

  const handleFinalize = async (data: any) => {
    // Reload sessions to update status
    await chat.loadSessions('all');

    // Navigate to publish form with prefill data
    navigate('/publish', {
      state: {
        prefillData: data.itinerary,
        isRemix: true,
        sourceItineraries: data.source_itineraries,
        chatSessionId: data.session_id
      }
    });
  };

  const handleBookTrip = (itineraryId: number) => {
    // Navigate to booking page with the itinerary ID
    navigate(`/booking/${itineraryId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-12 flex">
      {/* Sidebar Toggle (Mobile) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-20 left-4 z-50 md:hidden btn-primary rounded-full p-3 shadow-lg"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat History Sidebar */}
      <div
        className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-80 z-40 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <RemixChatHistory
          sessions={chat.sessions}
          activeSessionId={chat.activeSession?.id || null}
          onSelectSession={handleResumeSession}
          onNewChat={handleNewChat}
          onDeleteSession={chat.deleteSession}
          loading={chat.isLoading}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 badge-primary px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold">AI-Powered Remix</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Remix Itineraries
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select 1-3 itineraries you love, and our AI will combine them into your perfect custom trip
          </p>
        </div>

        {/* Selection Counter */}
        <div className="card-elevated p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="badge-primary rounded-full w-12 h-12 flex items-center justify-center">
                <span className="text-2xl font-bold">{selectedIds.length}</span>
              </div>
              <div>
                <p className="text-foreground font-semibold">
                  {selectedIds.length === 0 && 'No itineraries selected'}
                  {selectedIds.length === 1 && '1 itinerary selected'}
                  {selectedIds.length > 1 && `${selectedIds.length} itineraries selected`}
                </p>
                <p className="text-muted-foreground text-sm">Maximum 3 itineraries</p>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-bold"
                >
                  Clear All
                </button>
                <button
                  onClick={handleContinue}
                  className="btn-primary flex items-center gap-2"
                >
                  Continue to Remix
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Itineraries Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card-skeleton h-80 animate-pulse" />
            ))}
          </div>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">No Itineraries Found</h3>
            <p className="text-muted-foreground mb-6">There are no published itineraries yet.</p>
            <button
              onClick={() => navigate('/publish')}
              className="btn-primary"
            >
              Publish Your First Itinerary
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itineraries.map(itin => {
                const isSelected = selectedIds.includes(itin.id);
                return (
                  <div
                    key={itin.id}
                    onClick={() => toggleSelection(itin.id)}
                    className={`group relative card-interactive overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'outline-primary outline-4'
                        : ''
                    }`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 z-10 badge-primary rounded-full p-2">
                        <Check className="w-5 h-5" />
                      </div>
                    )}

                    {/* Image */}
                    <div className="h-48 gradient-primary relative overflow-hidden">
                      {itin.screenshots?.[0] ? (
                        <img
                          src={itin.screenshots[0]}
                          alt={itin.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-16 h-16 text-primary-foreground opacity-50" />
                        </div>
                      )}
                      {itin.is_remixed && (
                        <div className="absolute top-3 left-3 badge-primary px-3 py-1 rounded-full text-xs">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Remixed
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
                        {itin.title}
                      </h3>
                      <p className="text-primary text-sm mb-3 font-semibold">{itin.destination}</p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="w-4 h-4" />
                          {itin.duration_days} days
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <DollarSign className="w-4 h-4" />
                          {itin.budget_amount} {itin.budget_currency}
                        </div>
                        {itin.remix_count > 0 && (
                          <div className="flex items-center gap-1 text-primary text-sm font-semibold">
                            <Sparkles className="w-4 h-4" />
                            {itin.remix_count} remixes
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {itin.activity_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {itin.activity_tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="badge-secondary text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && !loading && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="btn-secondary"
                >
                  Load More Itineraries
                </button>
              </div>
            )}

            {loading && page > 1 && (
              <div className="text-center mt-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
              </div>
            )}
          </>
        )}
        </div>

        {/* Floating Continue Button (Mobile) */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-0 right-0 px-4 md:hidden z-50">
            <button
              onClick={handleContinue}
              className="w-full btn-primary flex items-center justify-center gap-2 shadow-2xl"
            >
              Continue with {selectedIds.length} itinerary{selectedIds.length !== 1 && 'ies'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Chat Modal */}
        <RemixChatModal
          isOpen={showChatModal}
          onClose={handleCloseModal}
          selectedItineraryIds={selectedIds}
          onFinalize={handleFinalize}
          onBookTrip={handleBookTrip}
          chat={chat}
        />
      </div>
    </div>
  );
}
