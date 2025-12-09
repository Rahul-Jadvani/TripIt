import { FC, useEffect, useRef } from 'react';
import { RemixChatMessage } from '@/hooks/useRemixChat';
import { Bot, User, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RemixChatMessagesProps {
  messages: RemixChatMessage[];
  isLoading?: boolean;
}

export const RemixChatMessages: FC<RemixChatMessagesProps> = ({
  messages,
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-4 ${
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 border-black ${
              msg.role === 'user' ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            {msg.role === 'user' ? (
              <User className="w-5 h-5" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>

          {/* Message bubble */}
          <div
            className={`flex-1 max-w-[80%] ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`rounded-[15px] border-2 border-black p-4 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-1 px-2">
              {formatDistanceToNow(new Date(msg.created_at), {
                addSuffix: true
              })}
            </p>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 border-black bg-secondary">
            <Bot className="w-5 h-5" />
          </div>

          <div className="flex-1 max-w-[80%]">
            <div className="rounded-[15px] border-2 border-black p-4 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Crafting your journey...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
