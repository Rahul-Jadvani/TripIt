import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Copy,
  Twitter,
  Linkedin,
  Facebook,
  Mail,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  description?: string;
}

export function ShareDialog({ open, onOpenChange, url, title, description }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  // Platform-specific templates
  const templates = {
    whatsapp: `🚀 *${title}*\n\n${description || ''}\n\n✨ Check it out here:\n${url}\n\n#Innovation #Tech #Project`,

    twitter: `🚀 ${title}\n\n${description || ''}\n\n🔗 ${url}\n\n#BuildInPublic #Tech #Innovation #Startup`,

    linkedin: `🚀 Excited to share: ${title}\n\n${description || ''}\n\nI discovered this amazing project and thought it would be valuable to share with my network.\n\n🔗 Check it out: ${url}\n\n#Innovation #Technology #Entrepreneurship #StartupLife`,

    facebook: `🚀 ${title}\n\n${description || ''}\n\n💡 This project caught my attention and I had to share it with you all!\n\nCheck it out and let me know what you think! 👇\n${url}`,

    telegram: `🚀 *${title}*\n\n${description || ''}\n\n🔗 View project:\n${url}\n\n#Tech #Innovation`,

    email: {
      subject: `Check out this project: ${title}`,
      body: `Hi there!\n\nI wanted to share this interesting project with you:\n\n📌 ${title}\n\n${description || ''}\n\n🔗 View the full project here:\n${url}\n\nLet me know what you think!\n\nBest regards`
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🚀 ${title}`,
          text: `${description || ''}\n\nCheck out this amazing project!`,
          url: url,
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:bg-green-500/10 hover:text-green-500',
      iconColor: 'text-green-500',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(templates.whatsapp)}`, '_blank'),
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'hover:bg-sky-500/10 hover:text-sky-500',
      iconColor: 'text-sky-500',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(templates.twitter)}`, '_blank'),
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'hover:bg-blue-600/10 hover:text-blue-600',
      iconColor: 'text-blue-600',
      action: () => {
        // LinkedIn requires URL and summary separately, we'll use the share endpoint with our template as a fallback
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodeURIComponent(templates.linkedin)}`, '_blank');
      },
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:bg-blue-500/10 hover:text-blue-500',
      iconColor: 'text-blue-500',
      action: () => {
        // Facebook requires quote parameter for text
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(templates.facebook)}`, '_blank');
      },
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'hover:bg-sky-400/10 hover:text-sky-400',
      iconColor: 'text-sky-400',
      action: () => window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(templates.telegram)}`, '_blank'),
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'hover:bg-orange-500/10 hover:text-orange-500',
      iconColor: 'text-orange-500',
      action: () => window.open(`mailto:?subject=${encodeURIComponent(templates.email.subject)}&body=${encodeURIComponent(templates.email.body)}`, '_blank'),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-[42rem] bg-card border-4 border-black rounded-2xl shadow-card overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Share2 className="h-5 w-5 text-primary" />
            Share Project
          </DialogTitle>
          <DialogDescription className="text-base">
            Share this project with your network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Link Button - Primary Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="min-w-0 grow px-4 py-3 rounded-lg bg-card border-2 border-border text-sm font-mono overflow-hidden">
              <div className="truncate text-muted-foreground">{url}</div>
            </div>
            <Button
              onClick={handleCopyLink}
              size="lg"
              variant={copied ? 'default' : 'secondary'}
              className="flex-shrink-0 min-w-[100px]"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* Native Share (Mobile) */}
          {navigator.share && (
            <Button
              onClick={handleNativeShare}
              variant="outline"
              size="lg"
              className="w-full border-2 hover:bg-accent/10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share via...
            </Button>
          )}

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground/70 font-medium">
                Or share on
              </span>
            </div>
          </div>

          {/* Social Media Grid - auto-fit to avoid overflow */}
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] gap-3 w-full">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => {
                    option.action();
                    onOpenChange(false);
                  }}
                  className={`group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:bg-accent/10 transition-all duration-200 hover:scale-105 w-full ${option.color}`}
                >
                  <Icon className={`h-7 w-7 ${option.iconColor} transition-transform group-hover:scale-110`} />
                  <span className="text-xs font-semibold text-foreground/80 group-hover:text-foreground">{option.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
