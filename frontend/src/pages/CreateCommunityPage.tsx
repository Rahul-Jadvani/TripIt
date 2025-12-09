import { useNavigate, Link } from 'react-router-dom';
import { useCreateChain } from '@/hooks/useCommunities';
import { CommunityForm, CommunityFormData } from '@/components/CommunityForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function CreateCommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createCommunityMutation = useCreateChain();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            You must be logged in to create a caravan
          </p>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (data: CommunityFormData) => {
    try {
      const result = await createCommunityMutation.mutateAsync(data);
      toast.success('Caravan created successfully!');
      navigate(`/community/${result.data.slug}`);
    } catch (error: any) {
      console.error('Create caravan error:', error);
      toast.error(error.response?.data?.error || 'Failed to create caravan');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/communities">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Caravans
          </Link>
        </Button>

        <div>
          <h1 className="text-4xl font-bold">Create New Caravan</h1>
          <p className="text-muted-foreground mt-2">
            Create a new travel caravan to connect with fellow travelers
          </p>
        </div>
      </div>

      {/* Form */}
      <CommunityForm onSubmit={handleSubmit} isLoading={createCommunityMutation.isPending} />
    </div>
  );
}
