import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, ArrowLeft, Sparkles, Clock, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { useConversations, useMessagesWithUser, useSendMessage } from '@/hooks/useMessages';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
  recipient?: User;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

// Loading skeleton component
const MessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-pulse`}>
    <div className={`max-w-[75%] p-4 rounded-[15px] ${isOwn ? 'bg-primary/20' : 'bg-secondary/30'}`}>
      <div className="h-4 bg-current/20 rounded w-48 mb-2" />
      <div className="h-3 bg-current/20 rounded w-24" />
    </div>
  </div>
);

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex justify-start px-6">
    <div className="flex gap-1 p-3 bg-secondary rounded-[15px] w-fit">
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// Message status icon
const MessageStatus = ({ message, isOwn }: { message: Message; isOwn: boolean }) => {
  if (!isOwn) return null;

  // Sending (optimistic update only)
  if (message.status === 'sending') {
    return <Clock className="h-3 w-3 text-black/50" />;
  }

  // Read (blue double checkmark)
  if (message.is_read) {
    return <CheckCheck className="h-3 w-3 text-blue-500" />;
  }

  // Default: Sent but not read (single gray checkmark)
  return <Check className="h-3 w-3 text-black/50" />;
};

export default function DirectMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const otherUserTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);
  const shouldScrollRef = useRef(true);

  // Initialize Socket.IO listeners for real-time message updates
  const socket = useRealTimeUpdates();

  // Listen for typing indicators from other user
  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleUserTyping = (data: any) => {
      if (data.sender_id === selectedUser.id) {
        setOtherUserTyping(true);

        // Clear existing timeout
        if (otherUserTypingTimeoutRef.current) {
          clearTimeout(otherUserTypingTimeoutRef.current);
        }

        // Stop showing typing indicator after 3 seconds of inactivity
        otherUserTypingTimeoutRef.current = window.setTimeout(() => {
          setOtherUserTyping(false);
        }, 3000);
      }
    };

    const handleUserStoppedTyping = (data: any) => {
      if (data.sender_id === selectedUser.id) {
        setOtherUserTyping(false);
        if (otherUserTypingTimeoutRef.current) {
          clearTimeout(otherUserTypingTimeoutRef.current);
        }
      }
    };

    socket.on('user:typing', handleUserTyping);
    socket.on('user:stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stopped_typing', handleUserStoppedTyping);
      if (otherUserTypingTimeoutRef.current) {
        clearTimeout(otherUserTypingTimeoutRef.current);
      }
    };
  }, [socket, selectedUser]);

  // React Query hooks
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useMessagesWithUser(selectedUser?.id || '');
  const sendMutation = useSendMessage();

  // Auto-select user from query param (when coming from Intros page after accepting)
  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId && conversations.length > 0 && !selectedUser) {
      const foundConversation = conversations.find((conv: any) => conv.user.id === userId);
      if (foundConversation) {
        setSelectedUser(foundConversation.user);
      }
    }
  }, [searchParams, conversations, selectedUser]);

  // Auto-scroll to bottom when NEW messages arrive from other person ONLY
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    if (messages.length > 0) {
      const messageCountChanged = messages.length > lastMessageCountRef.current;

      // Only scroll if a new message arrived (not on initial load)
      if (messageCountChanged) {
        const lastMessage = messages[messages.length - 1];
        const isFromOtherPerson = lastMessage?.sender_id !== user?.id;

        // Only scroll if the message is from the other person
        if (isFromOtherPerson) {
          // Scroll to bottom smoothly
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            }
          }, 0);
        }
      }

      // Update the ref to track the current message count
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, user?.id]);

  // Handle typing indicator - emit to socket and track locally
  const handleTyping = () => {
    if (!socket || !selectedUser) return;

    if (!isTyping) {
      setIsTyping(true);
      // Emit typing event to recipient
      socket.emit('user:typing', {
        recipient_id: selectedUser.id,
        sender_id: user?.id,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      // Emit stopped typing event to recipient
      socket.emit('user:stopped_typing', {
        recipient_id: selectedUser.id,
        sender_id: user?.id,
      });
    }, 2000);
  };

  // Send message with optimistic update and spam prevention
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sendMutation.isPending) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    // Create optimistic message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      message: messageText,
      sender_id: user?.id || '',
      recipient_id: selectedUser.id,
      created_at: new Date().toISOString(),
      is_read: false,
      status: 'sending',
    };

    // Add optimistic message to cache
    queryClient.setQueryData(
      ['messages', 'conversation', selectedUser.id],
      (old: Message[] = []) => [...old, tempMessage]
    );

    // Scroll to sent message immediately (even if scrolled at top)
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, 0);

    try {
      // Send to backend
      await sendMutation.mutateAsync({
        recipientId: selectedUser.id,
        message: messageText,
      });

      // Update status to 'sent'
      queryClient.setQueryData(
        ['messages', 'conversation', selectedUser.id],
        (old: Message[] = []) =>
          old.map((msg) =>
            msg.id === tempMessage.id ? { ...msg, status: 'sent' } : msg
          )
      );
    } catch (error) {
      // Remove optimistic message on error
      queryClient.setQueryData(
        ['messages', 'conversation', selectedUser.id],
        (old: Message[] = []) => old.filter((msg) => msg.id !== tempMessage.id)
      );
      // Reset input on error
      setNewMessage(messageText);
    }
  };

  // Handle conversation selection
  const selectConversation = (conv: any) => {
    setSelectedUser(conv.user);
    // Clear the URL query param when manually selecting a conversation
    window.history.replaceState({}, document.title, '/messages');
  };

  // Only show loading if there's NO cached data
  if (conversationsLoading && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="badge-primary flex items-center justify-center h-12 w-12 flex-shrink-0 rounded-[15px]">
            <MessageSquare className="h-6 w-6 text-black font-bold" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black mb-2">Direct Messages</h1>
            <p className="text-muted-foreground text-sm">
              Real-time chat with builders and investors
            </p>
          </div>
        </div>

        <div className="card-elevated overflow-hidden flex rounded-[20px]" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Conversations List */}
          <div className={`w-full md:w-1/3 border-r-4 border-black overflow-y-auto ${selectedUser ? 'hidden md:block' : ''}`}>
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-xs mt-2">Start by requesting an intro to a project creator</p>
              </div>
            ) : (
              conversations.map((conv: any) => (
                <button
                  key={conv.user.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full p-5 flex items-start gap-3 hover:bg-secondary/70 transition-all text-left border-b-2 border-border group ${
                    selectedUser?.id === conv.user.id ? 'bg-gradient-to-r from-primary/20 to-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className={`h-14 w-14 rounded-[15px] bg-primary flex items-center justify-center flex-shrink-0 font-black text-black text-lg border-2 border-primary ${selectedUser?.id === conv.user.id ? 'scale-110' : 'group-hover:scale-105'} transition-transform`}>
                    {conv.user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="font-bold text-base truncate">{conv.user.display_name || conv.user.username}</p>
                      {conv.unread_count > 0 && (
                        <span className="px-2.5 py-1 bg-primary text-black text-xs font-black rounded-full shadow-sm animate-pulse">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate leading-relaxed">
                        {conv.last_message.sender_id === user?.id ? <span className="font-semibold">You: </span> : ''}
                        {conv.last_message.message}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Messages View */}
          <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : ''}`}>
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Select a conversation to start messaging</p>
                  <p className="text-sm mt-2">Your messages will appear here</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-5 border-b-4 border-black flex items-center gap-4 bg-gradient-to-r from-secondary/30 to-background">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden btn-secondary p-2 hover:scale-110 transition-transform"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="relative">
                    <div className="h-12 w-12 rounded-[15px] bg-primary flex items-center justify-center font-black text-black text-lg border-2 border-primary">
                      {selectedUser.username[0].toUpperCase()}
                    </div>
                    {/* Online status indicator (placeholder for now) */}
                    {/* <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" /> */}
                  </div>
                  <div>
                    <p className="font-black text-lg">{selectedUser.display_name || selectedUser.username}</p>
                    <p className="text-sm text-muted-foreground font-medium">@{selectedUser.username}</p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-background to-secondary/10"
                >
                  {messagesLoading ? (
                    // Loading skeletons
                    <div className="space-y-4">
                      <MessageSkeleton />
                      <MessageSkeleton isOwn />
                      <MessageSkeleton />
                      <MessageSkeleton isOwn />
                      <MessageSkeleton />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary/50" />
                        <p className="text-sm text-muted-foreground font-medium">
                          Start the conversation! Say hi 👋
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg: Message, idx: number) => {
                        const isOwn = msg.sender_id === user?.id;
                        const sender = isOwn ? user : selectedUser;
                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        // Check if this is the start of a message group (different sender or time gap)
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const isNewGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                        // Check if next message is from same sender (to know if we should show avatar)
                        const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                        const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;

                        const bubbleColor = isOwn ? 'bg-primary text-black' : 'bg-secondary text-foreground';

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 gap-2 group`}
                          >
                            {/* Avatar - only show for received messages and at the end of group */}
                            {!isOwn && isLastInGroup && (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-xs font-bold text-black">
                                {selectedUser?.username[0]?.toUpperCase()}
                              </div>
                            )}
                            {!isOwn && !isLastInGroup && (
                              <div className="w-8 h-8 flex-shrink-0" />
                            )}

                            {/* Message bubble */}
                            <div className={`max-w-[70%] ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                              <div
                                className={`px-4 py-2.5 rounded-[18px] break-words leading-relaxed ${bubbleColor} shadow-sm transition-all`}
                              >
                                <p className="text-sm">{msg.message}</p>
                              </div>

                              {/* Time and status - only show at end of group */}
                              {isLastInGroup && (
                                <div className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                                  <span>{time}</span>
                                  {isOwn && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span>
                                        {msg.status === 'sending' ? 'Sending...' : msg.is_read ? 'Seen' : 'Delivered'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Avatar for own messages - placeholder for alignment */}
                            {isOwn && isLastInGroup && (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-xs font-bold text-black opacity-0">
                                {user?.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                            {isOwn && !isLastInGroup && (
                              <div className="w-8 h-8 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                      {/* Typing indicator - show when other user is typing */}
                      {otherUserTyping && <TypingIndicator />}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-5 border-t-4 border-black bg-secondary/20">
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !sendMutation.isPending) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 py-3 px-4 text-sm"
                      disabled={sendMutation.isPending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sendMutation.isPending || !newMessage.trim()}
                      title={sendMutation.isPending ? 'Sending message...' : !newMessage.trim() ? 'Type a message first' : 'Send message (Enter)'}
                      className="btn-primary px-6 group hover:scale-105 transition-transform disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </>
                      ) : (
                        <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
