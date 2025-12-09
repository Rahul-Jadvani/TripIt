import { useState } from 'react';
import { useCreateIntro } from '@/hooks/useIntros';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

// Helper function to get the backend URL
const getBackendUrl = (): string => {
  return 'https://tripit-xgvr.onrender.com';
};

interface IntroRequestProps {
  projectId?: string;  // Can be project ID or itinerary ID
  recipientId: string;  // User to connect with
  contentType?: 'project' | 'itinerary';
}

export function IntroRequest({ projectId, recipientId, contentType = 'project' }: IntroRequestProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Don't show if not logged in
  if (!user) {
    return null;
  }

  // Don't show for own content
  if (user.id === recipientId) {
    return null;
  }

  const handleSendIntro = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/intros/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          project_id: projectId,  // Can be project or itinerary ID
          recipient_id: recipientId,
          message: message.trim(),
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessage('');
        setIsOpen(false);
        toast.success('Intro request sent! They\'ll be notified.');
      } else {
        toast.error(data.message || 'Failed to send intro request');
      }
    } catch (error) {
      console.error('Intro request error:', error);
      toast.error('Failed to send intro request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5 whitespace-nowrap">
          <Send className="h-4 w-4" />
          Request Intro
        </button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:w-full max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-[12px] bg-primary/20 flex items-center justify-center border-2 border-primary flex-shrink-0">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="truncate">Request Intro</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-base">
            Introduce yourself and let them know why you'd like to connect
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="message" className="text-xs sm:text-sm font-bold flex items-center justify-between">
              <span>Your Message</span>
              <span className={`text-xs font-semibold transition-colors ${message.length >= 10 && message.length <= 1000 ? 'text-primary' : 'text-muted-foreground'}`}>
                {message.length}/1000
              </span>
            </Label>
            <Textarea
              id="message"
              placeholder={contentType === 'itinerary'
                ? "Hi! I loved your itinerary and would love to connect. Maybe we can travel together or share tips..."
                : "Hi! I'm interested in learning more about your project. I think there might be some interesting opportunities to collaborate..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none border-2 focus:border-primary text-sm"
            />
            {message.trim().length > 0 && message.trim().length < 10 && (
              <p className="text-xs text-red-600 font-medium">
                Message must be at least 10 characters
              </p>
            )}
          </div>

          <div className="bg-secondary/50 rounded-[12px] p-3 sm:p-4 border-2 border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tip:</strong> Great intro requests are specific about your interest,
              mention what caught your attention, and suggest how you might add value.
            </p>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="flex-1 font-bold text-xs sm:text-sm h-9 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendIntro}
              disabled={
                loading ||
                message.trim().length < 10 ||
                message.length > 1000
              }
              className="flex-1 btn-primary font-bold gap-2 text-xs sm:text-sm h-9 sm:h-10"
            >
              {loading ? (
                <>
                  <span className="animate-pulse">Sending</span>
                  <span className="animate-pulse text-xs">.</span>
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">Send</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
