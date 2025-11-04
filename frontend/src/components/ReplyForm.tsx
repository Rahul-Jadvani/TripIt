import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCreateChainPost } from '@/hooks/useChainPosts';

interface ReplyFormProps {
  chainSlug: string;
  parentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReplyForm({ chainSlug, parentId, onSuccess, onCancel }: ReplyFormProps) {
  const [content, setContent] = useState('');
  const createMutation = useCreateChainPost(chainSlug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createMutation.mutate(
      {
        content: content.trim(),
        parent_id: parentId,
      },
      {
        onSuccess: () => {
          setContent('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        rows={3}
        className="resize-none"
        disabled={createMutation.isPending}
      />
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!content.trim() || createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Reply
        </Button>
      </div>
    </form>
  );
}
