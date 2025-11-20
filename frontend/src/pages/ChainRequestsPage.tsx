import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChain, useChainRequests, useApproveRequest, useRejectRequest } from '@/hooks/useChains';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function ChainRequestsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: chainData, isLoading: chainLoading } = useChain(slug || '');
  const { data: requestsData, isLoading: requestsLoading } = useChainRequests(slug || '');
  const approveRequestMutation = useApproveRequest();
  const rejectRequestMutation = useRejectRequest();

  const chain = chainData?.chain;
  const requests = requestsData?.requests || [];
  const isOwner = user && chain && user.id === chain.creator_id;

  if (chainLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chain || !isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {!chain ? 'Chain not found' : "You don't have permission to view this page"}
          </p>
          <Button asChild>
            <Link to="/layerz">Back to layerz</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequestMutation.mutateAsync({ slug: slug!, requestId });
      toast.success('Project approved and added to chain!');
    } catch (error: any) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRejectingRequestId(requestId);
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectingRequestId) return;

    try {
      await rejectRequestMutation.mutateAsync({
        slug: slug!,
        requestId: rejectingRequestId,
        reason: rejectionReason.trim() || undefined,
      });
      toast.success('Request rejected');
      setRejectingRequestId(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.error || 'Failed to reject request');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/layerz/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to layerz
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-bold">Project Requests</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage project submissions for {chain.name}
          </p>
        </div>
      </div>

      {/* Requests List */}
      {requestsLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pendingRequests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">No pending requests</p>
          <p className="text-sm text-muted-foreground mt-2">
            New project submissions will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Project Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        to={`/project/${request.project.id}`}
                        className="text-xl font-semibold hover:text-primary transition-colors inline-flex items-center gap-2"
                      >
                        {request.project.title}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.project.tagline || request.project.description?.slice(0, 150)}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>

                  {/* Requester */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {request.requester.avatar_url ? (
                        <AvatarImage
                          src={request.requester.avatar_url}
                          alt={request.requester.username}
                        />
                      ) : (
                        <AvatarFallback>
                          {request.requester.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Requested by{' '}
                        <Link
                          to={`/user/${request.requester.username}`}
                          className="text-foreground font-medium hover:text-primary"
                        >
                          {request.requester.username}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Message:</p>
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 md:min-w-[120px]">
                  <Button
                    onClick={() => handleApprove(request.id)}
                    disabled={approveRequestMutation.isPending}
                    className="flex-1 md:flex-none gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRejectClick(request.id)}
                    disabled={rejectRequestMutation.isPending}
                    className="flex-1 md:flex-none gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectingRequestId} onOpenChange={() => setRejectingRequestId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Project Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this request. The requester will be
              notified.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingRequestId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectRequestMutation.isPending}
            >
              {rejectRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
