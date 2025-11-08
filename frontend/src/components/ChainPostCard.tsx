import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChainPost } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Pin, Lock, MoreVertical, Edit, Trash2, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useTogglePinPost, useToggleLockPost, useDeleteChainPost, useChainPostReplies } from '@/hooks/useChainPosts';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { ReplyForm } from './ReplyForm';
import { MarkdownContent } from './MarkdownContent';
import { EditPostDialog } from './EditPostDialog';

interface ChainPostCardProps {
  post: ChainPost;
  chainSlug: string;
  isOwner?: boolean;
  showReplies?: boolean;
  compact?: boolean;
  parentAuthor?: string;
  expandAll?: boolean; // when true, auto-expand nested replies
}

export function ChainPostCard({
  post,
  chainSlug,
  isOwner = false,
  showReplies = true,
  compact = false,
  parentAuthor,
  expandAll = false,
}: ChainPostCardProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false); // Start collapsed; toggle to reveal
  const [showEditDialog, setShowEditDialog] = useState(false);

  const pinMutation = useTogglePinPost(chainSlug);
  const lockMutation = useToggleLockPost(chainSlug);
  const deleteMutation = useDeleteChainPost(chainSlug);
  const { data: repliesPayload } = useChainPostReplies(chainSlug, post.id, { per_page: 50, sort: 'top' });

  // Persist expanded/collapsed state across refresh per-post
  useEffect(() => {
    try {
      const k = `chain.replies.expanded.${post.id}`;
      const saved = localStorage.getItem(k);
      if (saved === '1' || expandAll) setShowAllReplies(true);
    } catch {}
  }, [post.id, expandAll]);

  const isAuthor = user && post.author_id === user.id;

  const handlePin = () => {
    pinMutation.mutate(post.id);
  };

  const handleLock = () => {
    lockMutation.mutate(post.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      deleteMutation.mutate(post.id);
    }
  };

  const mergedReplies = (post.replies && post.replies.length > 0) ? post.replies : (repliesPayload?.replies || []);
  const visibleReplies = showAllReplies ? mergedReplies : mergedReplies?.slice(0, 3);

  return (
    <Card className={cn('overflow-hidden', post.is_pinned && 'border-primary/50 bg-primary/5')}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/u/${post.author?.username}`} className="flex items-center gap-2 hover:underline">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={post.author?.avatar_url} alt={post.author?.username} />
                    <AvatarFallback className="text-xs">
                      {post.author?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{post.author?.username || '[deleted]'}</span>
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
                {parentAuthor && (
                  <span className="text-xs text-muted-foreground">replying to <span className="font-semibold">@{parentAuthor}</span></span>
                )}
                {post.is_pinned && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                {post.is_locked && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {post.updated_at !== post.created_at && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>

              {/* Actions Menu */}
              {user && (isAuthor || isOwner) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAuthor && !post.is_deleted && (
                      <>
                        <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    {isOwner && !post.parent_id && (
                      <>
                        {(isAuthor || isOwner) && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={handlePin}>
                          <Pin className="h-4 w-4 mr-2" />
                          {post.is_pinned ? 'Unpin' : 'Pin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLock}>
                          <Lock className="h-4 w-4 mr-2" />
                          {post.is_locked ? 'Unlock' : 'Lock'}
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isAuthor && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Title (for top-level posts) */}
            {post.title && !compact && (
              <h3 className="text-lg font-semibold mb-2 break-words">{post.title}</h3>
            )}

            {/* Content */}
            <div className="mb-3">
              <MarkdownContent content={post.content} />
            </div>

            {/* Images */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {post.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Post image ${index + 1}`}
                    className="rounded-lg border max-h-64 w-full object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setShowReplyForm(!showReplyForm)}
                disabled={post.is_locked}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Reply</span>
              </Button>

              {post.comment_count > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    setShowAllReplies((v) => {
                      const nv = !v;
                      try { localStorage.setItem(`chain.replies.expanded.${post.id}`, nv ? '1' : '0'); } catch {}
                      return nv;
                    });
                  }}
                >
                  <MessageSquare className="h-3 w-3" />
                  {showAllReplies ? 'Hide replies' : `${post.comment_count} ${post.comment_count === 1 ? 'reply' : 'replies'}`}
                </Button>
              )}

              {post.is_locked && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && !post.is_locked && (
              <div className="mt-3 pl-4 border-l-2 border-muted">
                <ReplyForm
                  chainSlug={chainSlug}
                  parentId={post.id}
                  onSuccess={() => setShowReplyForm(false)}
                  onCancel={() => setShowReplyForm(false)}
                />
              </div>
            )}

            {/* Replies */}
            {showReplies && mergedReplies && mergedReplies.length > 0 && showAllReplies && (
              <div className="mt-4 space-y-3">
                {visibleReplies?.map((reply) => (
                  <div
                    key={reply.id}
                    className="relative pl-4 border-l-2 border-border before:absolute before:left-0 before:top-5 before:w-4 before:h-px before:bg-border"
                  >
                    <ChainPostCard
                      post={reply}
                      chainSlug={chainSlug}
                      isOwner={isOwner}
                      showReplies={true}
                      compact
                      parentAuthor={post.author?.username}
                      expandAll={showAllReplies}
                    />
                  </div>
                ))}
                {/* When expanded, we show full thread; collapsed state handled by toggle button above */}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      {showEditDialog && (
        <EditPostDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          post={post}
          chainSlug={chainSlug}
        />
      )}
    </Card>
  );
}
