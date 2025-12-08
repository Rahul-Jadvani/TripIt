import { FC } from 'react';
import { X, Save, Sparkles, Menu, PanelRightClose, PanelRight, Plane } from 'lucide-react';
import { RemixChatSession } from '@/hooks/useRemixChat';

interface RemixChatHeaderProps {
  session: RemixChatSession | null;
  onClose: () => void;
  onFinalize: () => void;
  onBookTrip?: () => void;
  onToggleSidebar?: () => void;
  onTogglePreview?: () => void;
  isLoading?: boolean;
}

export const RemixChatHeader: FC<RemixChatHeaderProps> = ({
  session,
  onClose,
  onFinalize,
  onBookTrip,
  onToggleSidebar,
  onTogglePreview,
  isLoading
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b-4 border-black bg-card">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-secondary rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Sparkles className="w-6 h-6 text-primary" />

        <div>
          <h2 className="text-lg font-bold text-foreground">
            {session?.title || 'AI Remix Chat'}
          </h2>
          {session && (
            <p className="text-xs text-muted-foreground">
              {session.message_count} messages
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            className="p-2 hover:bg-secondary rounded-lg hidden xl:block"
            title="Toggle Preview"
          >
            <PanelRight className="w-5 h-5" />
          </button>
        )}

        {session && onBookTrip && (
          <button
            onClick={onBookTrip}
            disabled={isLoading || !session.current_draft_id}
            className="btn-primary bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center gap-2 disabled:opacity-50 shadow-lg"
          >
            <Plane className="w-4 h-4" />
            Bring to Life
          </button>
        )}

        {session && (
          <button
            onClick={onFinalize}
            disabled={isLoading || !session.current_draft_id}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save & Publish
          </button>
        )}

        <button
          onClick={onClose}
          className="p-2 hover:bg-secondary rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
