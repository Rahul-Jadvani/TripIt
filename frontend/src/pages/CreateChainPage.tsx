import { useNavigate, Link } from 'react-router-dom';
import { useCreateChain } from '@/hooks/useChains';
import { ChainForm, ChainFormData } from '@/components/ChainForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function CreateChainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createChainMutation = useCreateChain();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            You must be logged in to create a chain
          </p>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (data: ChainFormData) => {
    try {
      const result = await createChainMutation.mutateAsync(data);
      toast.success('Chain created successfully!');
      navigate(`/chains/${result.data.slug}`);
    } catch (error: any) {
      console.error('Create chain error:', error);
      toast.error(error.response?.data?.error || 'Failed to create chain');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/chains">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chains
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-bold">Create Chain</h1>
          <p className="text-muted-foreground mt-2">
            Create a new collection to organize and showcase projects
          </p>
        </div>
      </div>

      {/* Form */}
      <ChainForm onSubmit={handleSubmit} isLoading={createChainMutation.isPending} />
    </div>
  );
}
