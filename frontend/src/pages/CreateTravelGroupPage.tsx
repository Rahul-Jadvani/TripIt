import { useNavigate } from 'react-router-dom';
import { TravelGroupForm } from '@/components/TravelGroupForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreateTravelGroupPage() {
  const navigate = useNavigate();

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

        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground mb-2">Create New Layerz</h1>
          <p className="text-muted-foreground">
            Start a new travel group and find companions for your next adventure
          </p>
        </div>

        <TravelGroupForm mode="create" />
      </div>
    </div>
  );
}
