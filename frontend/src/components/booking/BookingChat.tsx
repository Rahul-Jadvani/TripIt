import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface ChatMessage {
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
}

interface CurrentMessage {
  type: 'question' | 'choice' | 'loading' | 'summary';
  step: string;
  message: string;
  input_type?: string;
  placeholder?: string;
  min_date?: string;
  min?: number;
  max?: number;
  default?: number;
  choices?: Array<{
    value: string;
    label: string;
    description: string;
  }>;
}

interface Props {
  chatHistory: ChatMessage[];
  currentMessage: CurrentMessage | null;
  onSendMessage: (message: string | any) => void;
  session: any;
  onCustomize?: () => void;
}

const BookingChat: React.FC<Props> = ({
  chatHistory,
  currentMessage,
  onSendMessage,
  session,
  onCustomize
}) => {
  const [inputValue, setInputValue] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureDate) return;

    const dates = {
      departure: departureDate,
      return: returnDate || null
    };

    onSendMessage(dates);
    setDepartureDate('');
    setReturnDate('');
  };

  const handleChoiceSelect = (value: string) => {
    onSendMessage(value);
  };

  const handleNumberSubmit = (value: number) => {
    onSendMessage(value.toString());
  };

  return (
    <div className="card-elevated h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-t-[15px] border-b-4 border-black">
        <h3 className="text-lg font-bold">Booking Assistant</h3>
        <p className="text-sm opacity-90">
          {session?.current_step && `Step: ${session.current_step}`}
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-[15px] p-3 border-2 border-black ${
                msg.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap font-medium">{msg.message}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {currentMessage?.type === 'loading' && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-[15px] p-3 border-2 border-black">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-secondary-foreground font-medium">Searching...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t-4 border-black p-4 bg-card rounded-b-[15px]">
        {/* Text Input */}
        {currentMessage?.input_type === 'text' && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentMessage.placeholder || 'Type your message...'}
              className="flex-1 border-2 border-black rounded-[15px] px-4 py-2 bg-input text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary"
            >
              Send
            </button>
          </form>
        )}

        {/* Date Range Input */}
        {currentMessage?.input_type === 'date_range' && (
          <form onSubmit={handleDateSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">
                Departure Date
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={currentMessage.min_date}
                className="w-full border-2 border-black rounded-[15px] px-4 py-2 bg-input text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">
                Return Date (Optional)
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={departureDate || currentMessage.min_date}
                className="w-full border-2 border-black rounded-[15px] px-4 py-2 bg-input text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Continue
            </button>
          </form>
        )}

        {/* Number Input */}
        {currentMessage?.input_type === 'number' && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={currentMessage.min}
              max={currentMessage.max}
              defaultValue={currentMessage.default}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt((e.target as HTMLInputElement).value);
                  handleNumberSubmit(value);
                }
              }}
              className="flex-1 border-2 border-black rounded-[15px] px-4 py-2 bg-input text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousSibling as HTMLInputElement;
                handleNumberSubmit(parseInt(input.value));
              }}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        )}

        {/* Choice Buttons */}
        {currentMessage?.input_type === 'choice' && currentMessage.choices && (
          <div className="space-y-3">
            {currentMessage.choices.map((choice) => (
              <button
                key={choice.value}
                onClick={() => handleChoiceSelect(choice.value)}
                className="w-full bg-secondary border-4 border-black rounded-[15px] p-4 hover:bg-primary hover:text-primary-foreground transition-all text-left font-bold"
              >
                <div className="font-bold text-foreground">{choice.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{choice.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Loading or Summary State */}
        {(currentMessage?.type === 'loading' || currentMessage?.type === 'summary') && (
          <div className="text-center text-muted-foreground font-medium">
            {currentMessage.type === 'loading' ? 'Searching...' : 'Review your booking below'}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingChat;
