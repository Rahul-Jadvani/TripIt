import { useState, useEffect } from 'react';
import { useChains, useChainRecommendations } from '@/hooks/useChains';
import { Chain } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Lock, Info, CheckCircle2, Plus, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';

interface ChainSelectorProps {
  selectedChainIds: string[];
  onSelectionChange: (chainIds: string[]) => void;
  maxSelections?: number;
  projectCategories?: string[]; // Categories for recommendations
}

export function ChainSelector({
  selectedChainIds,
  onSelectionChange,
  maxSelections = 5,
  projectCategories = [],
}: ChainSelectorProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: chainsData, isLoading } = useChains({
    search,
    limit: 50,
    sort: 'trending',
  });

  // Get recommendations based on project categories
  const { data: recommendationsData } = useChainRecommendations(
    projectCategories.length > 0 ? projectCategories : undefined
  );

  const chains = chainsData?.chains || [];
  const recommendations = recommendationsData?.chains || [];
  const selectedChains = chains.filter((c) => selectedChainIds.includes(c.id));
  const isMaxReached = selectedChainIds.length >= maxSelections;

  // Filter recommendations to not show already selected ones
  const filteredRecommendations = recommendations.filter(
    (rec) => !selectedChainIds.includes(rec.id)
  );

  const handleToggle = (chainId: string) => {
    if (selectedChainIds.includes(chainId)) {
      onSelectionChange(selectedChainIds.filter((id) => id !== chainId));
    } else if (!isMaxReached) {
      onSelectionChange([...selectedChainIds, chainId]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Publish to Chains (Optional)</label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Select up to {maxSelections} chains to publish your project in. Some chains may require approval from the chain owner.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Selected Chains */}
      {selectedChains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedChains.map((chain) => (
            <Badge key={chain.id} variant="secondary" className="gap-2 pr-1">
              <Avatar className="h-4 w-4">
                {chain.logo_url ? (
                  <AvatarImage src={chain.logo_url} alt={chain.name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {chain.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <span>{chain.name}</span>
              {chain.requires_approval && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleToggle(chain.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Chain Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            Add to chains ({selectedChainIds.length}/{maxSelections})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chains..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading chains...
              </div>
            ) : chains.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No chains found
              </div>
            ) : (
              <div className="p-2 space-y-4">
                {/* Suggested Chains Section */}
                {filteredRecommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">Suggested for You</span>
                    </div>
                    {filteredRecommendations.slice(0, 3).map((chain) => {
                      const isSelected = selectedChainIds.includes(chain.id);
                      const isDisabled = !isSelected && isMaxReached;

                      return (
                        <div
                          key={chain.id}
                          className={`flex items-center gap-3 p-2 rounded-md bg-primary/5 border border-primary/20 hover:bg-primary/10 cursor-pointer transition-colors ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => !isDisabled && handleToggle(chain.id)}
                        >
                          <Checkbox checked={isSelected} disabled={isDisabled} />

                          <Avatar className="h-8 w-8">
                            {chain.logo_url ? (
                              <AvatarImage src={chain.logo_url} alt={chain.name} />
                            ) : (
                              <AvatarFallback className="text-sm">
                                {chain.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {chain.name}
                              </span>
                              <Badge variant="secondary" className="text-xs gap-1 bg-primary/20">
                                <Sparkles className="h-2 w-2" />
                                Match
                              </Badge>
                              {chain.requires_approval && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Lock className="h-3 w-3" />
                                  Approval
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {chain.project_count} projects • {chain.follower_count} followers
                            </p>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    <div className="h-px bg-border my-2" />
                  </div>
                )}

                {/* All Chains Section */}
                <div className="space-y-1">
                  {filteredRecommendations.length > 0 && (
                    <div className="px-2 py-1">
                      <span className="text-sm font-semibold text-muted-foreground">All Chains</span>
                    </div>
                  )}
                  {chains.map((chain) => {
                  const isSelected = selectedChainIds.includes(chain.id);
                  const isDisabled = !isSelected && isMaxReached;

                  return (
                    <div
                      key={chain.id}
                      className={`flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => !isDisabled && handleToggle(chain.id)}
                    >
                      <Checkbox checked={isSelected} disabled={isDisabled} />

                      <Avatar className="h-8 w-8">
                        {chain.logo_url ? (
                          <AvatarImage src={chain.logo_url} alt={chain.name} />
                        ) : (
                          <AvatarFallback className="text-sm">
                            {chain.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {chain.name}
                          </span>
                          {chain.requires_approval && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Approval
                            </Badge>
                          )}
                          {!chain.is_public && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {chain.project_count} projects
                        </p>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-muted/50">
            <Link
              to="/chains/create"
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={() => setOpen(false)}
            >
              <Plus className="h-3 w-3" />
              Create new chain
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {isMaxReached && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxSelections} chains reached
        </p>
      )}

      {selectedChains.some((c) => c.requires_approval) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Some chains require approval from the chain owner
        </p>
      )}
    </div>
  );
}
