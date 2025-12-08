import { FC, useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RemixChatSidebar } from './RemixChatSidebar';
import { RemixChatHeader } from './RemixChatHeader';
import { RemixChatMessages } from './RemixChatMessages';
import { RemixChatInput } from './RemixChatInput';
import { RemixItineraryPreview } from './RemixItineraryPreview';
import { Loader2 } from 'lucide-react';

interface RemixChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItineraryIds: string[];
  onFinalize?: (data: any) => void;
  chat: any; // Chat instance from parent
}

export const RemixChatModal: FC<RemixChatModalProps> = ({
  isOpen,
  onClose,
  selectedItineraryIds,
  onFinalize,
  chat
}) => {
  const [initialMessage, setInitialMessage] = useState('');
  const [showInput, setShowInput] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);

  // Initialize with selected itineraries when modal opens
  useEffect(() => {
    if (isOpen && selectedItineraryIds.length > 0 && !chat.activeSession) {
      setShowInput(true);
      setInitialMessage('');
    }
  }, [isOpen, selectedItineraryIds]);

  // Auto-skip to chat if we have an active session (resuming)
  useEffect(() => {
    if (isOpen && chat.activeSession) {
      setShowInput(false);
    }
  }, [isOpen, chat.activeSession]);

  // Don't load sessions here - RemixPage handles that
  // Loading sessions here was clearing the list when modal opens

  const handleStartChat = async () => {
    if (!initialMessage.trim() || initialMessage.length < 10) {
      return;
    }

    try {
      await chat.createSession(selectedItineraryIds, initialMessage);
      setShowInput(false);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const handleFinalize = async () => {
    try {
      const data = await chat.finalizeSession();
      onFinalize?.(data);
      onClose();
    } catch (error) {
      console.error('Failed to finalize:', error);
    }
  };

  const handleCloseModal = () => {
    // Reset local modal state but don't touch the sessions
    setShowInput(true);
    setInitialMessage('');
    // Don't reset activeSession - let parent handle it
    onClose();
  };

  // Initial message input screen
  if (showInput && !chat.activeSession) {
    return (
      <Dialog open={isOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Start Your Remix Chat
            </h2>
            <p className="text-muted-foreground mb-6">
              Tell our AI what kind of trip you want to create from the {selectedItineraryIds.length} itineraries you selected.
            </p>

            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Example: I want a 7-day adventure combining mountain trekking and cultural experiences. Budget around $2000, moderate difficulty. Best time would be summer."
              className="w-full h-40 px-4 py-3 bg-input border-2 border-black rounded-[15px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              maxLength={1000}
            />

            <div className="flex justify-between items-center mt-2 mb-6">
              <span className="text-sm text-muted-foreground">
                Be specific about duration, budget, and preferences
              </span>
              <span className="text-sm text-muted-foreground">
                {initialMessage.length}/1000
              </span>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCloseModal}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleStartChat}
                disabled={chat.isLoading || initialMessage.trim().length < 10}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {chat.isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Chat'
                )}
              </button>
            </div>

            {chat.error && (
              <div className="mt-4 p-3 bg-destructive/10 border-2 border-destructive rounded-[15px] text-destructive text-sm">
                {chat.error}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main chat interface
  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0">
        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-64 border-r-4 border-black bg-card flex-shrink-0 hidden lg:block">
              <RemixChatSidebar
                sessions={chat.sessions}
                activeSessionId={chat.activeSession?.id || null}
                onSelectSession={chat.loadSession}
                onNewChat={() => {
                  setShowInput(true);
                  chat.setActiveSession(null);
                }}
                onDeleteSession={chat.deleteSession}
              />
            </div>
          )}

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <RemixChatHeader
              session={chat.activeSession}
              onClose={handleCloseModal}
              onFinalize={handleFinalize}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onTogglePreview={() => setPreviewOpen(!previewOpen)}
              isLoading={chat.isLoading}
            />

            <RemixChatMessages
              messages={chat.messages}
              isLoading={chat.isSending}
            />

            <RemixChatInput
              onSend={chat.sendMessage}
              disabled={chat.isSending || !chat.activeSession}
              isLoading={chat.isSending}
            />
          </div>

          {/* Preview panel */}
          {previewOpen && chat.activeSession?.current_draft && (
            <div className="w-96 border-l-4 border-black bg-card flex-shrink-0 hidden xl:block overflow-y-auto">
              <RemixItineraryPreview
                draft={chat.activeSession.current_draft}
                sourceItineraries={chat.sourceItineraries}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
