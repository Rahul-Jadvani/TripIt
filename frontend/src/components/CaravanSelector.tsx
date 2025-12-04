import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Users, Sparkles, AlertCircle } from 'lucide-react';
import { communityApi } from '@/services/communityApi';
import { Community } from '@/types';
import { toast } from 'sonner';

interface CaravanSelectorProps {
  selectedCaravans: Community[];
  onCaravansChange: (caravans: Community[]) => void;
  categories?: string[];
  maxSelections?: number;
}

export function CaravanSelector({
  selectedCaravans,
  onCaravansChange,
  categories = [],
  maxSelections = 5,
}: CaravanSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [recommendedCaravans, setRecommendedCaravans] = useState<Community[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);

  // Load recommended caravans based on categories
  useEffect(() => {
    if (categories.length > 0) {
      loadRecommendedCaravans();
    }
  }, [categories]);

  const loadRecommendedCaravans = async () => {
    setIsLoadingRecommended(true);
    try {
      const response = await communityApi.getCommunityRecommendations(categories);
      const recommended = response.data.communities || [];
      // Filter out already selected ones
      const filtered = recommended.filter(
        (c) => !selectedCaravans.some((s) => s.id === c.id)
      );
      setRecommendedCaravans(filtered.slice(0, 10));
    } catch (error) {
      console.error('Error loading recommended caravans:', error);
    } finally {
      setIsLoadingRecommended(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await communityApi.getCommunities({
        search: searchQuery,
        page: 1,
        limit: 10,
      });
      const results = response.data.communities || [];
      // Filter out already selected ones
      const filtered = results.filter(
        (c) => !selectedCaravans.some((s) => s.id === c.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching caravans:', error);
      toast.error('Failed to search caravans');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCaravan = (caravan: Community) => {
    if (selectedCaravans.length >= maxSelections) {
      toast.error(`You can only select up to ${maxSelections} caravans`);
      return;
    }

    if (selectedCaravans.some((c) => c.id === caravan.id)) {
      toast.error('Caravan already selected');
      return;
    }

    onCaravansChange([...selectedCaravans, caravan]);

    // Remove from search results and recommended
    setSearchResults(searchResults.filter((c) => c.id !== caravan.id));
    setRecommendedCaravans(recommendedCaravans.filter((c) => c.id !== caravan.id));
  };

  const handleRemoveCaravan = (caravanId: string) => {
    onCaravansChange(selectedCaravans.filter((c) => c.id !== caravanId));
  };

  return (
    <div className="space-y-6">
      {/* Selected Caravans */}
      {selectedCaravans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Selected Caravans ({selectedCaravans.length}/{maxSelections})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedCaravans.map((caravan) => (
              <Badge
                key={caravan.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={caravan.logo_url} alt={caravan.name} />
                  <AvatarFallback className="text-xs">
                    {caravan.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{caravan.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleRemoveCaravan(caravan.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for caravans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            Search
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Search Results</p>
            <div className="grid gap-2">
              {searchResults.map((caravan) => (
                <Card
                  key={caravan.id}
                  className="p-3 flex items-center justify-between hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleAddCaravan(caravan)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={caravan.logo_url} alt={caravan.name} />
                      <AvatarFallback>{caravan.name[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{caravan.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {caravan.follower_count || 0} followers
                      </p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline">
                    Add
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Caravans */}
      {recommendedCaravans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Recommended for Your Trip</h3>
          </div>
          <div className="grid gap-2">
            {recommendedCaravans.slice(0, 5).map((caravan) => (
              <Card
                key={caravan.id}
                className="p-3 flex items-center justify-between hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleAddCaravan(caravan)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={caravan.logo_url} alt={caravan.name} />
                    <AvatarFallback>{caravan.name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{caravan.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {caravan.description}
                    </p>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline">
                  Add
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info message */}
      {selectedCaravans.length === 0 && recommendedCaravans.length === 0 && !searchQuery && (
        <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Add your trip to caravans to reach travelers interested in similar destinations.
            Search for caravans or select from recommendations below.
          </p>
        </div>
      )}
    </div>
  );
}
