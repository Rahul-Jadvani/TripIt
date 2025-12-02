import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  AlertTriangle,
  BookOpen,
  Heart,
  Backpack,
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  ThumbsUp,
  Pin,
} from 'lucide-react';
import { WomenSafetyResource } from '@/types';
import api from '@/services/api';

type ResourceCategory = 'tips' | 'emergency' | 'legal' | 'health' | 'packing' | 'cultural' | 'navigation';

export function WomenSafetyResourcesHub() {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('tips');
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [showHelplines, setShowHelplines] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['women-safety-resources'],
    queryFn: async () => {
      const response = await api.get('/women-safety/resources');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const resources: WomenSafetyResource[] = data?.resources || [];

  const getCategoryIcon = (category: ResourceCategory) => {
    switch (category) {
      case 'tips':
        return <BookOpen className="h-4 w-4" />;
      case 'emergency':
        return <AlertTriangle className="h-4 w-4" />;
      case 'legal':
        return <Shield className="h-4 w-4" />;
      case 'health':
        return <Heart className="h-4 w-4" />;
      case 'packing':
        return <Backpack className="h-4 w-4" />;
      case 'cultural':
        return <Globe className="h-4 w-4" />;
      case 'navigation':
        return <MapPin className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/20 text-red-600 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const toggleResource = (id: string) => {
    setExpandedResources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredResources = resources.filter((r) => r.category === selectedCategory);
  const featuredResources = filteredResources.filter((r) => r.is_featured || r.is_pinned);
  const regularResources = filteredResources.filter((r) => !r.is_featured && !r.is_pinned);

  // Collect all unique helpline numbers
  const allHelplines = resources.reduce((acc: any[], resource) => {
    if (resource.helpline_numbers) {
      acc.push(...resource.helpline_numbers);
    }
    return acc;
  }, []);

  // Remove duplicates
  const uniqueHelplines = Array.from(
    new Map(allHelplines.map((h) => [`${h.country}-${h.service}`, h])).values()
  );

  const ResourceCard = ({ resource }: { resource: WomenSafetyResource }) => {
    const isExpanded = expandedResources.has(resource.id);

    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <Collapsible open={isExpanded} onOpenChange={() => toggleResource(resource.id)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {resource.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                <h3 className="font-semibold text-foreground line-clamp-1">{resource.title}</h3>
                <Badge className={`text-xs px-2 py-0.5 border ${getUrgencyColor(resource.urgency_level)}`}>
                  {resource.urgency_level}
                </Badge>
              </div>

              {resource.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {resource.description}
                </p>
              )}

              {!isExpanded && resource.content && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {resource.content.substring(0, 150)}...
                </p>
              )}
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-4 space-y-4">
            {/* Full Content */}
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resource.content}</p>
            </div>

            {/* External Links */}
            {resource.external_links && resource.external_links.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Helpful Resources
                </h4>
                <div className="space-y-1">
                  {resource.external_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline p-2 rounded hover:bg-secondary/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{link.title}</span>
                      {link.source && (
                        <span className="text-xs text-muted-foreground">({link.source})</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Target Countries */}
            {resource.target_countries && resource.target_countries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Relevant for:</span>
                {resource.target_countries.slice(0, 5).map((country, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {country}
                  </Badge>
                ))}
                {resource.target_countries.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{resource.target_countries.length - 5} more
                  </Badge>
                )}
              </div>
            )}

            <Separator />

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{resource.helpful_count || 0} found helpful</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Helpful
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Women's Safety Resources</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Essential information, tips, and emergency resources for safe travel
        </p>
      </div>

      {/* Emergency Helplines Widget */}
      {uniqueHelplines.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <Collapsible open={showHelplines} onOpenChange={setShowHelplines}>
            <CollapsibleTrigger asChild>
              <div className="p-4 cursor-pointer flex items-center justify-between hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Emergency Helpline Numbers</h3>
                  <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                    Quick Access
                  </Badge>
                </div>
                {showHelplines ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <Separator />
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uniqueHelplines.slice(0, 12).map((helpline, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                  >
                    <div>
                      <div className="font-semibold text-sm">{helpline.service}</div>
                      <div className="text-xs text-muted-foreground">{helpline.country}</div>
                    </div>
                    <a
                      href={`tel:${helpline.number}`}
                      className="text-primary font-bold hover:underline"
                    >
                      {helpline.number}
                    </a>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Tabs for Categories */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ResourceCategory)}>
        <TabsList className="grid w-full grid-cols-7 mb-6">
          <TabsTrigger value="tips" className="flex items-center gap-1">
            {getCategoryIcon('tips')}
            <span className="hidden sm:inline">Tips</span>
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-1">
            {getCategoryIcon('emergency')}
            <span className="hidden sm:inline">Emergency</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-1">
            {getCategoryIcon('legal')}
            <span className="hidden sm:inline">Legal</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-1">
            {getCategoryIcon('health')}
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="packing" className="flex items-center gap-1">
            {getCategoryIcon('packing')}
            <span className="hidden sm:inline">Packing</span>
          </TabsTrigger>
          <TabsTrigger value="cultural" className="flex items-center gap-1">
            {getCategoryIcon('cultural')}
            <span className="hidden sm:inline">Cultural</span>
          </TabsTrigger>
          <TabsTrigger value="navigation" className="flex items-center gap-1">
            {getCategoryIcon('navigation')}
            <span className="hidden sm:inline">Navigation</span>
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-2" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="tips" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="legal" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="packing" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <Backpack className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cultural" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <Globe className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="navigation" className="space-y-4">
              {featuredResources.length > 0 && (
                <>
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <Pin className="h-5 w-5 text-primary" />
                    Featured Resources
                  </h2>
                  {featuredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                  {regularResources.length > 0 && <Separator className="my-6" />}
                </>
              )}
              {regularResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
              {filteredResources.length === 0 && (
                <Card className="p-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No resources available in this category yet.</p>
                </Card>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
