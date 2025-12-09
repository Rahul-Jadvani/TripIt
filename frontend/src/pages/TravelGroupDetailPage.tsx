import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { travelGroupsService } from '@/services/api';
import { TravelGroupDetail } from '@/components/TravelGroupDetail';
import { CoffeeLoader } from '@/components/CoffeeLoader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TravelGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['travel-group', id],
    queryFn: async () => {
      const response = await travelGroupsService.getGroupById(id!);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CoffeeLoader message="Loading layerz details..." />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Layerz not found</h2>
          <Button onClick={() => navigate('/layerz')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Layerz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/layerz')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Layerz
        </Button>

        <TravelGroupDetail group={data.data} />
      </div>
    </div>
  );
}
