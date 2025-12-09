import { FC, useState } from 'react';
import { SourceItinerary } from '@/hooks/useRemixChat';
import { Calendar, DollarSign, MapPin, Tag, Sparkles, Backpack, Shield, Gem, BookOpen, Sun, Navigation } from 'lucide-react';
import { RouteMapModal } from '@/components/RouteMapModal';

interface RemixItineraryPreviewProps {
  draft: any;
  sourceItineraries: SourceItinerary[];
}

export const RemixItineraryPreview: FC<RemixItineraryPreviewProps> = ({
  draft,
  sourceItineraries
}) => {
  const [showRouteMap, setShowRouteMap] = useState(false);

  if (!draft) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No preview available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="badge-primary px-3 py-1 rounded-full text-xs mb-3 inline-block">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Live Preview
        </div>

        <h3 className="text-xl font-bold text-foreground mb-2">
          {draft.title || 'Untitled'}
        </h3>

        {draft.description && (
          <p className="text-sm text-muted-foreground line-clamp-4">
            {draft.description}
          </p>
        )}
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        {draft.destination && (
          <div className="bg-secondary rounded-[15px] p-3 border-2 border-black">
            <MapPin className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Destination</div>
            <div className="text-sm font-bold">{draft.destination}</div>
          </div>
        )}

        {draft.duration_days && (
          <div className="bg-secondary rounded-[15px] p-3 border-2 border-black">
            <Calendar className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Duration</div>
            <div className="text-sm font-bold">{draft.duration_days} days</div>
          </div>
        )}

        {draft.budget_amount && (
          <div className="bg-secondary rounded-[15px] p-3 border-2 border-black">
            <DollarSign className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Budget</div>
            <div className="text-sm font-bold">
              {draft.budget_amount} {draft.budget_currency || 'USD'}
            </div>
          </div>
        )}

        {draft.difficulty_level && (
          <div className="bg-secondary rounded-[15px] p-3 border-2 border-black">
            <Tag className="w-4 h-4 text-primary mb-1" />
            <div className="text-xs text-muted-foreground">Difficulty</div>
            <div className="text-sm font-bold capitalize">
              {draft.difficulty_level}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      {draft.categories && draft.categories.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2">Travel Types</h4>
          <div className="flex flex-wrap gap-2">
            {draft.categories.map((cat: string, idx: number) => (
              <span
                key={idx}
                className="badge-primary text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activity tags */}
      {draft.activity_tags && draft.activity_tags.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2">Activities & Gear</h4>
          <div className="flex flex-wrap gap-2">
            {draft.activity_tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="badge-secondary text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Best Season */}
      {draft.best_season && (
        <div className="bg-accent/20 rounded-[15px] p-4 border-2 border-black">
          <div className="flex items-start gap-2">
            <Sun className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-foreground mb-1">Best Time to Visit</h4>
              <p className="text-sm text-muted-foreground">
                {draft.best_season}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Highlights */}
      {draft.trip_highlights && (
        <div className="border-2 border-black rounded-[15px] p-4 bg-card">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <h4 className="text-sm font-bold text-foreground">Trip Highlights</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {draft.trip_highlights}
          </p>
        </div>
      )}

      {/* Journey */}
      {draft.trip_journey && (
        <div className="border-2 border-black rounded-[15px] p-4 bg-card">
          <div className="flex items-start gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <h4 className="text-sm font-bold text-foreground">The Journey</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {draft.trip_journey}
          </p>
        </div>
      )}

      {/* Hidden Gems */}
      {draft.hidden_gems && (
        <div className="border-2 border-black rounded-[15px] p-4 bg-card">
          <div className="flex items-start gap-2 mb-2">
            <Gem className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <h4 className="text-sm font-bold text-foreground">Hidden Gems</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {draft.hidden_gems}
          </p>
        </div>
      )}

      {/* Day by Day Plan (first 3 days) */}
      {draft.day_by_day_plan && (
        <div className="border-2 border-black rounded-[15px] p-4 bg-card">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <h4 className="text-sm font-bold text-foreground">Day-by-Day Plan</h4>
            </div>
            <button
              onClick={() => setShowRouteMap(true)}
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-[8px] hover:opacity-90 transition-opacity flex items-center gap-1 flex-shrink-0"
            >
              <Navigation className="w-3 h-3" />
              Map
            </button>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-line line-clamp-[20]">
            {draft.day_by_day_plan}
          </div>
        </div>
      )}

      {/* Safety Tips */}
      {draft.safety_tips && (
        <div className="border-2 border-red-500 rounded-[15px] p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-start gap-2 mb-2">
            <Shield className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <h4 className="text-sm font-bold text-red-600">Safety Tips</h4>
          </div>
          <p className="text-sm text-red-700 dark:text-red-400">
            {draft.safety_tips}
          </p>
        </div>
      )}

      {/* Packing List */}
      {draft.packing_list && draft.packing_list.length > 0 && (
        <div className="border-2 border-black rounded-[15px] p-4 bg-card">
          <div className="flex items-start gap-2 mb-2">
            <Backpack className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <h4 className="text-sm font-bold text-foreground">Packing List</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.packing_list.map((item: string, idx: number) => (
              <span key={idx} className="text-xs bg-secondary px-2 py-1 rounded border border-border">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source attribution */}
      {sourceItineraries.length > 0 && (
        <div className="border-t-2 border-black pt-4">
          <h4 className="text-xs font-bold text-muted-foreground mb-2">
            REMIXED FROM:
          </h4>
          <div className="space-y-2">
            {sourceItineraries.map((source) => (
              <div
                key={source.id}
                className="text-xs bg-secondary rounded-lg p-2 border border-border"
              >
                <div className="font-semibold text-foreground">
                  {source.title}
                </div>
                <div className="text-muted-foreground">
                  {source.destination} • {source.duration_days} days
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Map Modal */}
      <RouteMapModal
        isOpen={showRouteMap}
        onClose={() => setShowRouteMap(false)}
        dayByDayPlan={draft.day_by_day_plan || ''}
        destination={draft.destination || 'Unknown'}
        title={`${draft.title || 'Remix'} - Route Map`}
      />
    </div>
  );
};
