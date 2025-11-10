import { useState } from 'react';
import { useComments, useCreateComment, useDeleteComment, useVoteComment } from '@/hooks/useComments';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ThumbsUp, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CommentSectionProps {
  projectId: string;
  altProjectId?: string; // fallback id (e.g., numeric vs uuid)
}

export function CommentSection({ projectId, altProjectId }: CommentSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');

  const { data: commentsData, isLoading } = useComments(projectId, altProjectId);
  const createCommentMutation = useCreateComment(projectId);
  const deleteCommentMutation = useDeleteComment('', projectId);
  const voteCommentMutation = useVoteComment(projectId);

  const comments = commentsData?.data || [];

  const handlePostComment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (commentText.trim().length === 0) return;
    if (createCommentMutation.isPending) return; // guard against double clicks

    await createCommentMutation.mutateAsync({ content: commentText });
    setCommentText('');
    toast.success('Comment posted');
  };

  const handleDelete = (commentId: string) => {
    if (window.confirm('Delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Comments ({comments.length})</h3>

        {user ? (
          <Card className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handlePostComment}
                disabled={createCommentMutation.isPending || commentText.trim().length === 0}
                className="w-full"
              >
                {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed p-4 text-center">
            <p className="text-muted-foreground">
              <Button variant="link" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              {' '}to comment
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment: any) => (
            <Card key={comment.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author.avatar} alt={comment.author.username} />
                  <AvatarFallback className="text-xs">
                    {comment.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{comment.author.displayName || comment.author.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {user?.id === comment.author.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteCommentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <p className="mt-2 text-sm">{comment.content}</p>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => voteCommentMutation.mutate({ commentId: comment.id, voteType: 'up' })}
                      disabled={voteCommentMutation.isPending}
                      className="text-muted-foreground"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span className="ml-1 text-xs">{comment.upvotes}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
