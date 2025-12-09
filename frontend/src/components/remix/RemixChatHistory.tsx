import { FC } from 'react';
import { RemixChatSession } from '@/hooks/useRemixChat';
import { MessageSquare, Plus, Trash2, Clock, CheckCircle, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RemixChatHistoryProps {
  sessions: RemixChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  loading?: boolean;
}

export const RemixChatHistory: FC<RemixChatHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  loading = false
}) => {
  return (
    <div className="h-full flex flex-col bg-card border-r-4 border-black">
      {/* Header */}
      {/* <div className="p-4 border-b-2 border-black bg-secondary/50">
        <button
          onClick={onNewChat}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Remix Chat
        </button>
      </div> */}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-secondary/30 rounded-[15px] animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No chat sessions yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new remix to begin
            </p>
          </div>
        ) : (
          sessions.map(session => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`group relative rounded-[15px] border-2 p-3 cursor-pointer transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-black hover:border-primary bg-card'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                {/* Title */}
                <h4 className="text-sm font-bold text-foreground line-clamp-2 mb-1 pr-6">
                  {session.title}
                </h4>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-2">
                  {session.status === 'finalized' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 border border-blue-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </span>
                  )}
                  {session.status === 'archived' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-600 border border-gray-600 flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      Archived
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  <span>
                    {session.last_message_at
                      ? formatDistanceToNow(new Date(session.last_message_at), {
                          addSuffix: true
                        })
                      : formatDistanceToNow(new Date(session.created_at), {
                          addSuffix: true
                        })}
                  </span>
                </div>

                {/* Message count */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {session.message_count} messages
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {session.source_itinerary_ids.length} sources
                  </span>
                </div>

                {/* Latest message preview */}
                {session.latest_message_preview && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {session.latest_message_preview}
                  </p>
                )}

                {/* Delete button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat session? This action cannot be undone.')) {
                      try {
                        await onDeleteSession(session.id);
                      } catch (error) {
                        console.error('Failed to delete session:', error);
                      }
                    }
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  title="Delete session"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-[15px]" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2 border-black bg-secondary/50">
        <p className="text-xs text-muted-foreground text-center">
          {sessions.length} chat session{sessions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};
