import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { travelIntelService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ThumbsUp, Trash2, Info, AlertTriangle, MessageCircle, MapPin, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from '@/utils/date';
import { resolveProjectId } from '@/utils/projectId';
import { toast } from 'sonner';
import type { TravelIntel } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';

type IntelType = TravelIntel['intel_type'];

const intelTypeMeta: Record<
  IntelType,
  { label: string; icon: JSX.Element; tone: string }
> = {
  question: { label: 'Question', icon: <MessageCircle className="h-3.5 w-3.5" />, tone: 'bg-blue-500/15 text-blue-600' },
  update: { label: 'Update', icon: <Sparkles className="h-3.5 w-3.5" />, tone: 'bg-emerald-500/15 text-emerald-600' },
  warning: { label: 'Warning', icon: <AlertTriangle className="h-3.5 w-3.5" />, tone: 'bg-amber-500/15 text-amber-700' },
  recommendation: { label: 'Recommendation', icon: <Info className="h-3.5 w-3.5" />, tone: 'bg-primary/15 text-primary' },
  local_insight: { label: 'Local Insight', icon: <MapPin className="h-3.5 w-3.5" />, tone: 'bg-purple-500/15 text-purple-700' },
};

const normalizeIntel = (raw: any): TravelIntel => ({
  id: raw.id,
  itinerary_id: raw.itinerary_id || raw.project_id,
  intel_type: raw.intel_type || 'update',
  title: raw.title,
  content: raw.content,
  helpful_count: raw.helpful_count || raw.upvotes || 0,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
  traveler: raw.traveler || raw.author,
  replies: raw.replies || [],
  is_deleted: raw.is_deleted,
  deleted_at: raw.deleted_at,
  parent_intel_id: raw.parent_intel_id,
  response_status: raw.response_status,
  status: raw.status,
});

interface TravelIntelSectionProps {
  itineraryId: string;
  altItineraryId?: string;
}

export function TravelIntelSection({ itineraryId, altItineraryId }: TravelIntelSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [intelText, setIntelText] = useState('');
  const [intelType, setIntelType] = useState<IntelType>('recommendation');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [intelToDelete, setIntelToDelete] = useState<string | null>(null);

  const resolvedId = resolveProjectId(itineraryId, altItineraryId);

  const { data: intelData, isLoading, error } = useQuery({
    queryKey: ['travel-intel', resolvedId || 'pending'],
    queryFn: async () => {
      if (!resolvedId) return { data: [] };
      const res = await travelIntelService.getByItinerary(resolvedId);
      const raw = res.data?.data || [];
      return { data: (Array.isArray(raw) ? raw : []).map(normalizeIntel) } as any;
    },
    enabled: !!resolvedId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    placeholderData: (previous) => previous,
  });

  const createIntel = useMutation({
    mutationFn: () =>
      travelIntelService.create({
        itinerary_id: resolvedId,
        intel_type: intelType,
        content: intelText.trim(),
      }),
    onSuccess: (res) => {
      const real = normalizeIntel(res.data?.data || res.data);
      queryClient.setQueryData(['travel-intel', resolvedId], (old: any) => {
        if (!old?.data) return { data: [real] };
        return { ...old, data: [real, ...old.data] };
      });
      queryClient.invalidateQueries({ queryKey: ['project', resolvedId] });
      toast.success('Travel intel shared');
      setIntelText('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Unable to share intel'),
  });

  const deleteIntel = useMutation({
    mutationFn: (id: string) => travelIntelService.delete(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData(['travel-intel', resolvedId], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((item: TravelIntel) => item.id !== id) };
      });
      queryClient.invalidateQueries({ queryKey: ['project', resolvedId] });
      toast.success('Intel deleted');
      setShowDeleteConfirm(false);
      setIntelToDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Unable to delete intel'),
  });

  const markHelpful = useMutation({
    mutationFn: (id: string) => travelIntelService.markHelpful(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['travel-intel', resolvedId] });
      const previous = queryClient.getQueryData(['travel-intel', resolvedId]);
      queryClient.setQueryData(['travel-intel', resolvedId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((item: TravelIntel) =>
            item.id === id ? { ...item, helpful_count: (item.helpful_count || 0) + 1 } : item
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['travel-intel', resolvedId], context.previous);
      }
      toast.error('Unable to mark helpful');
    },
  });

  if (!resolvedId) return <div className="text-center text-muted-foreground">Preparing travel intel...</div>;
  if (isLoading && !intelData) return <div className="text-center text-muted-foreground">Loading intel...</div>;
  if (error && !intelData?.data?.length) {
    return <div className="text-center text-muted-foreground">Unable to load travel intel. Please refresh.</div>;
  }

  const intelList = intelData?.data || [];

  const handlePost = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!intelText.trim() || !resolvedId) return;
    createIntel.mutate();
  };

  return (
    <div id="travel-intel" className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Travel Intel ({intelList.length})</h3>

        {user ? (
          <Card className="p-4 space-y-3">
            <div className="flex gap-2 items-center">
              <label className="text-xs font-semibold text-muted-foreground">Intel Type</label>
              <select
                value={intelType}
                onChange={(e) => setIntelType(e.target.value as IntelType)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(intelTypeMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="Share a route update, safety warning, local insight, or ask a question..."
              value={intelText}
              onChange={(e) => setIntelText(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handlePost}
              disabled={createIntel.isPending || intelText.trim().length === 0 || !resolvedId}
              className="w-full"
            >
              {createIntel.isPending ? 'Sharing...' : 'Post Intel'}
            </Button>
          </Card>
        ) : (
          <Card className="border-dashed p-4 text-center">
            <p className="text-muted-foreground">
              <Button variant="link" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              {' '}to share intel
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {intelList.length === 0 ? (
          <p className="text-center text-muted-foreground">No intel yet. Start the conversation!</p>
        ) : (
          intelList.map((intel: TravelIntel) => {
            const meta = intelTypeMeta[intel.intel_type] || intelTypeMeta.update;
            const traveler = intel.traveler;
            return (
              <Card key={intel.id} id={`comment-${intel.id}`} className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={traveler?.avatar || traveler?.avatar_url} alt={traveler?.username} />
                    <AvatarFallback className="text-xs">
                      {(traveler?.username || 'TR').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{traveler?.displayName || traveler?.username || 'Traveler'}</span>
                        <span className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${meta.tone}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </div>

                      {user?.id === traveler?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIntelToDelete(intel.id);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={deleteIntel.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <p className="text-sm">{intel.content}</p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(intel.created_at), { addSuffix: true })}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markHelpful.mutate(intel.id)}
                          disabled={markHelpful.isPending}
                          className="text-muted-foreground"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span className="ml-1">{intel.helpful_count || 0}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete intel?"
        description="This action cannot be undone."
        onConfirm={() => {
          if (intelToDelete) {
            deleteIntel.mutate(intelToDelete);
          }
        }}
      />
    </div>
  );
}
