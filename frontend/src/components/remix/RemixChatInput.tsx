import { FC, useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface RemixChatInputProps {
  onSend: (message: string) => Promise<any>;
  disabled?: boolean;
  isLoading?: boolean;
}

export const RemixChatInput: FC<RemixChatInputProps> = ({
  onSend,
  disabled,
  isLoading
}) => {
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim() || disabled || isLoading) return;

    const message = input.trim();
    setInput('');

    try {
      await onSend(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setInput(message);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t-4 border-black p-4 bg-card">
      <div className="flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Chat not active...' : 'Describe changes you\'d like... (Shift+Enter for new line)'}
          disabled={disabled}
          className="flex-1 resize-none rounded-[15px] border-2 border-black p-3 bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          rows={3}
          maxLength={1000}
        />

        <button
          onClick={handleSend}
          disabled={disabled || isLoading || !input.trim()}
          className="btn-primary self-end px-4 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>
      </div>

      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span>{input.length}/1000</span>
      </div>
    </div>
  );
};
