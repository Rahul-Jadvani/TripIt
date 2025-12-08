import { FC } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { RemixChatSession } from '@/hooks/useRemixChat';
import { formatDistanceToNow } from 'date-fns';

interface RemixChatSidebarProps {
  sessions: RemixChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const RemixChatSidebar: FC<RemixChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-4 border-black">
        <button
          onClick={onNewChat}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No chat sessions yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`group relative rounded-[15px] border-2 border-black p-3 cursor-pointer transition-all hover:bg-secondary ${
                  activeSessionId === session.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="pr-8">
                  <h3 className="font-bold text-sm line-clamp-2 mb-1">
                    {session.title}
                  </h3>
                  <p className="text-xs opacity-70">
                    {session.message_count} messages
                  </p>
                  {session.last_message_at && (
                    <p className="text-xs opacity-60 mt-1">
                      {formatDistanceToNow(new Date(session.last_message_at), {
                        addSuffix: true
                      })}
                    </p>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat session?')) {
                      onDeleteSession(session.id);
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
