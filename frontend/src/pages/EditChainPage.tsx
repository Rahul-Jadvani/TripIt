import { useNavigate, useParams, Link } from 'react-router-dom';
import { useChain, useUpdateChain } from '@/hooks/useChains';
import { ChainForm, ChainFormData } from '@/components/ChainForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function EditChainPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: chainData, isLoading, error } = useChain(slug || '');
  const updateChainMutation = useUpdateChain();

  const chain = chainData?.chain;

  // Check ownership
  const isOwner = user && chain && user.id === chain.creator_id;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !chain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-destructive">layerz not found or failed to load</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/layerz">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to layerz
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            You don't have permission to edit this layerz
          </p>
          <Button asChild>
            <Link to={`/layerz/${slug}`}>View layerz</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (data: ChainFormData) => {
    try {
      await updateChainMutation.mutateAsync({ slug: slug!, data });
      toast.success('layerz updated successfully!');
      navigate(`/layerz/${slug}`);
    } catch (error: any) {
      console.error('Update layerz error:', error);
      toast.error(error.response?.data?.error || 'Failed to update layerz');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/layerz/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to layerz
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-bold">Edit layerz</h1>
          <p className="text-muted-foreground mt-2">
            Update your layerz's information and settings
          </p>
        </div>
      </div>

      {/* Form */}
      <ChainForm
        chain={chain}
        onSubmit={handleSubmit}
        isLoading={updateChainMutation.isPending}
      />
    </div>
  );
}
