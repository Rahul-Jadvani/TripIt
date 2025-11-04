import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useUpdateChainPost } from '@/hooks/useChainPosts';
import { ChainPost } from '@/types';
import { toast } from 'sonner';

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ChainPost;
  chainSlug: string;
}

export function EditPostDialog({ open, onOpenChange, post, chainSlug }: EditPostDialogProps) {
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content);

  const updateMutation = useUpdateChainPost(chainSlug, post.id);

  // Update form when post changes
  useEffect(() => {
    setTitle(post.title || '');
    setContent(post.content);
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    if (!post.parent_id && !title.trim()) {
      toast.error('Title is required for top-level posts');
      return;
    }

    updateMutation.mutate(
      {
        title: post.parent_id ? undefined : title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {post.parent_id ? 'Reply' : 'Post'}</DialogTitle>
          <DialogDescription>Make changes to your post</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title (only for top-level posts) */}
          {!post.parent_id && (
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your discussion about?"
                maxLength={300}
                disabled={updateMutation.isPending}
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, ideas, or questions..."
              rows={8}
              className="resize-none"
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!content.trim() || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
