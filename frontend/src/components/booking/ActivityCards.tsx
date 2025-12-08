import React, { useState } from 'react';
import { RefreshCw, Sparkles, Clock, Star, Loader2, Info, ExternalLink } from 'lucide-react';

interface Activity {
  name: string;
  category: string;
  description: string;
  duration: string;
  price: number;
  rating: number;
  review_count: number;
  booking_url: string;
  sources?: string[];
}

interface Props {
  activities: Activity[];
  onSelect: (activities: Activity[]) => void;
  multiSelect: boolean;
  onCustomize?: () => void;
  isLoading?: boolean;
}

const ActivityCards: React.FC<Props> = ({ activities, onSelect, multiSelect, onCustomize, isLoading = false }) => {
  const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
  const [showSources, setShowSources] = useState<number | null>(null);

  const handleToggleActivity = (index: number) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(index);
    }
    setSelectedActivities(newSelected);
  };

  const handleContinue = () => {
    const selected = Array.from(selectedActivities).map(index => activities[index]);
    onSelect(selected);
  };

  const getCategoryIcon = (category: string) => {
    return null;
  };

  if (activities.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-muted-foreground font-medium mb-4">No activities found.</p>
        <div className="flex gap-3 justify-center">
          {onCustomize && (
            <button
              onClick={onCustomize}
              disabled={isLoading}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Try Different Options
                </>
              )}
            </button>
          )}
          <button
            onClick={() => onSelect([])}
            className="btn-primary"
          >
            Skip Activities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            <Sparkles className="w-6 h-6 inline mr-2" />
            Choose Activities
          </h3>
          {multiSelect && (
            <span className="text-sm text-muted-foreground">
              {selectedActivities.size} selected
            </span>
          )}
        </div>
        {onCustomize && (
          <button
            onClick={onCustomize}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isLoading ? 'Loading...' : 'Different Options'}
          </button>
        )}
      </div>

      {/* Activity Cards */}
      <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
        {activities.map((activity, index) => (
          <div
            key={index}
            onClick={() => handleToggleActivity(index)}
            className={`card-elevated p-4 cursor-pointer transition-all hover:shadow-button-hover ${
              selectedActivities.has(index) ? 'ring-4 ring-primary' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="mb-2">
                  <h4 className="text-lg font-bold text-foreground mb-1">
                    {activity.name}
                  </h4>
                  <span className="text-xs bg-secondary text-foreground px-2 py-1 rounded border border-black font-medium">
                    {activity.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {activity.description}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {activity.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    {activity.rating} ({activity.review_count})
                  </span>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-primary">
                  ₹{activity.price.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>

            {/* Sources */}
            {activity.sources && activity.sources.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSources(showSources === index ? null : index);
                  }}
                  className="text-xs text-primary flex items-center gap-1 hover:text-primary/80 transition-colors font-medium"
                >
                  <Info className="w-3 h-3" />
                  {showSources === index ? 'Hide' : 'View'} Verified Sources
                </button>
                {showSources === index && (
                  <div className="mt-2 p-3 bg-secondary border-2 border-black rounded-[10px]">
                    <div className="text-xs font-bold mb-2 text-foreground">Verified Sources:</div>
                    <div className="space-y-1">
                      {activity.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Source {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={activity.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 btn-secondary text-center text-sm"
              >
                View Details
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleActivity(index);
                }}
                className="flex-1 btn-primary text-sm"
              >
                {selectedActivities.has(index) ? 'Selected' : 'Select'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      {multiSelect && (
        <div className="sticky bottom-0 bg-background border-t-4 border-black pt-4">
          <button
            onClick={handleContinue}
            disabled={selectedActivities.size === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {selectedActivities.size === 0
              ? 'Skip Activities'
              : `Continue with ${selectedActivities.size} ${
                  selectedActivities.size === 1 ? 'activity' : 'activities'
                }`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityCards;
