import { useState, useRef, useEffect } from 'react';
import { X, Trophy, TrendingUp, Star, Rocket, DollarSign, Calendar, Move } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProjectUpdate {
  id: string;
  project_id: string;
  update_type: string;
  title: string;
  content?: string;
  metadata?: any;
  color: string;
  created_at: string;
  creator?: {
    username: string;
    display_name: string;
  };
}

interface ProjectUpdateStickerProps {
  update: ProjectUpdate;
  index: number;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  position?: { x: number; y: number };
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  // If provided, use this image as the note background (text overlays it)
  noteImageSrc?: string;
  // Optional safe insets for content when using an image background
  contentSafeArea?: { top?: number; right?: number; bottom?: number; left?: number };
}

const colorClasses = {
  yellow: 'bg-[#fef3c7] border-[#fbbf24] shadow-[#fbbf24]/20',
  blue: 'bg-[#dbeafe] border-[#3b82f6] shadow-[#3b82f6]/20',
  green: 'bg-[#d1fae5] border-[#10b981] shadow-[#10b981]/20',
  pink: 'bg-[#fce7f3] border-[#ec4899] shadow-[#ec4899]/20',
  purple: 'bg-[#e9d5ff] border-[#a855f7] shadow-[#a855f7]/20',
};

const getIcon = (type: string) => {
  switch (type) {
    case 'hackathon_win': return <Trophy className="h-4 w-4" />;
    case 'investment': return <DollarSign className="h-4 w-4" />;
    case 'milestone': return <Star className="h-4 w-4" />;
    case 'feature': return <Rocket className="h-4 w-4" />;
    case 'partnership': return <TrendingUp className="h-4 w-4" />;
    default: return <Calendar className="h-4 w-4" />;
  }
};

export function ProjectUpdateSticker({ update, index, onDelete, canDelete, position, onPositionChange, noteImageSrc, contentSafeArea }: ProjectUpdateStickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const noteRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: position?.x || 0, y: position?.y || 0 });
  const rafRef = useRef<number | null>(null);

  // Rotation and position for post-it note effect
  const rotations = ['rotate-[-2deg]', 'rotate-[1deg]', 'rotate-[-1deg]', 'rotate-[2deg]', 'rotate-[-3deg]'];
  const rotation = rotations[index % rotations.length];

  const colorClass = colorClasses[update.color as keyof typeof colorClasses] || colorClasses.yellow;

  const renderAt = (x: number, y: number) => {
    const el = noteRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  // Initialize position from prop and keep in sync
  useEffect(() => {
    posRef.current = { x: position?.x || 0, y: position?.y || 0 };
    renderAt(posRef.current.x, posRef.current.y);
  }, [position?.x, position?.y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: posRef.current.x,
      startPosY: posRef.current.y,
    };
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = { x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy };
    posRef.current = next;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        renderAt(posRef.current.x, posRef.current.y);
      });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
    // Persist final position to parent (optional)
    onPositionChange?.(update.id, posRef.current);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true } as any);
      window.addEventListener('pointerup', handlePointerUp, { passive: true } as any);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove as any);
      window.removeEventListener('pointerup', handlePointerUp as any);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isDragging]);

  const sizeClasses = noteImageSrc
    ? 'w-48 h-48 sm:w-52 sm:h-52 p-0'
    : 'w-40 h-32 p-3 border-2 border-l-4 border-t-0';

  const containerClasses = [
    isDragging ? 'rotate-0 scale-105' : rotation,
    'relative rounded-[12px] overflow-hidden will-change-transform shadow-lg',
    sizeClasses,
    'transition-all duration-200 hover:scale-105 hover:shadow-xl hover:rotate-0',
    !noteImageSrc ? `${colorClass} before:absolute before:top-0 before:left-0 before:right-0 before:h-2 before:bg-gradient-to-b before:from-black/5 before:to-transparent` : ''
  ].join(' ');

  return (
    <>
      {/* Post-it Note */}
      <div
        className={containerClasses}
        style={{
          fontFamily: "'Patrick Hand', 'Caveat', cursive",
          position: 'absolute',
        }}
        ref={noteRef}
        onPointerDown={handlePointerDown}
      >
        {/* Background note image (replaces styled card) */}
        {noteImageSrc && (
          <img
            src={noteImageSrc}
            alt="Note"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-10"
          />
        )}
        {/* Drag Handle - Pin effect area */}
        <div
          className="drag-handle absolute inset-x-0 top-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
        >
          {!noteImageSrc && (
            <img src="/pin3.png" alt="Pin" className="h-5 w-5 select-none pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]" />
          )}
        </div>

        {/* Delete button (if can delete) */}
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(update.id);
            }}
            className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
            aria-label="Remove note"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Content - clickable to open dialog */}
        <div
          onClick={() => !isDragging && setIsOpen(true)}
          className={noteImageSrc ? 'cursor-pointer absolute z-30' : 'cursor-pointer relative z-30'}
          style={noteImageSrc ? {
            top: `${contentSafeArea?.top ?? 68}px`,
            left: `${contentSafeArea?.left ?? 16}px`,
            right: `${contentSafeArea?.right ?? 16}px`,
            bottom: `${contentSafeArea?.bottom ?? 36}px`,
          } : undefined}
        >
          <div className="flex items-start gap-2 mb-2 overflow-hidden">
            <div className="text-gray-700 flex-shrink-0">
              {getIcon(update.update_type)}
            </div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
              {update.title}
            </h3>
          </div>

          {update.content && (
            <p className="text-xs text-gray-700 line-clamp-3 overflow-hidden">
              {update.content}
            </p>
          )}

          <div className="absolute bottom-3 right-3 text-xs text-gray-600">
            {new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        {/* folded corner */}
        <span className="pointer-events-none absolute bottom-0 right-0 w-0 h-0 border-l-[16px] border-t-[16px] border-l-transparent border-t-white/40" />
      </div>

      {/* Expanded Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getIcon(update.update_type)}
              {update.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {update.content && (
              <div>
                <p className="text-sm text-foreground/90">{update.content}</p>
              </div>
            )}

            {update.metadata && (
              <div className="space-y-2">
                {update.update_type === 'hackathon_win' && update.metadata.hackathon_name && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Hackathon:</span>
                    <p className="text-sm font-medium">{update.metadata.hackathon_name}</p>
                  </div>
                )}

                {update.update_type === 'hackathon_win' && update.metadata.prize && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Prize:</span>
                    <p className="text-sm font-medium">{update.metadata.prize}</p>
                  </div>
                )}

                {update.update_type === 'investment' && update.metadata.amount && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Amount:</span>
                    <p className="text-sm font-medium">${update.metadata.amount}</p>
                  </div>
                )}

                {update.update_type === 'investment' && update.metadata.investor_name && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Investor:</span>
                    <p className="text-sm font-medium">{update.metadata.investor_name}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t text-xs text-muted-foreground">
              Posted {new Date(update.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
              {update.creator && ` by @${update.creator.username}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
