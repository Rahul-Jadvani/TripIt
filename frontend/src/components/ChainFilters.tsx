import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, TrendingUp, Clock, Folder, Users, Star, ArrowDownAZ } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChainFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  category?: string;
  onCategoryChange: (value: string | undefined) => void;
  featuredOnly: boolean;
  onFeaturedOnlyChange: (value: boolean) => void;
}

const CATEGORIES = [
  'Hackathon',
  'DeFi',
  'NFT',
  'Gaming',
  'AI/ML',
  'Web3',
  'Social',
  'Tools',
  'Education',
  'Infrastructure',
];

export function ChainFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  category,
  onCategoryChange,
  featuredOnly,
  onFeaturedOnlyChange,
}: ChainFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search layerz..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Sort */}
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trending">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending
              </div>
            </SelectItem>
            <SelectItem value="newest">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Newest
              </div>
            </SelectItem>
            <SelectItem value="most_projects">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Most Projects
              </div>
            </SelectItem>
            <SelectItem value="most_followers">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Most Followers
              </div>
            </SelectItem>
            <SelectItem value="alphabetical">
              <div className="flex items-center gap-2">
                <ArrowDownAZ className="h-4 w-4" />
                A-Z
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Featured Filter */}
        <Badge
          variant={featuredOnly ? 'default' : 'outline'}
          className="cursor-pointer gap-1.5"
          onClick={() => onFeaturedOnlyChange(!featuredOnly)}
        >
          <Star className="h-3 w-3" />
          Featured
        </Badge>

        {/* Clear Filters */}
        {(search || category || featuredOnly) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchChange('');
              onCategoryChange(undefined);
              onFeaturedOnlyChange(false);
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={category === cat ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onCategoryChange(category === cat ? undefined : cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Active Filters Display */}
      {(category || featuredOnly) && (
        <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
          <span>Active filters:</span>
          {category && (
            <Badge variant="secondary" className="gap-1.5">
              {category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onCategoryChange(undefined)}
              />
            </Badge>
          )}
          {featuredOnly && (
            <Badge variant="secondary" className="gap-1.5">
              Featured only
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFeaturedOnlyChange(false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
