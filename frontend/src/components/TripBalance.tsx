import { useState } from 'react';
import { Coins, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TripBalanceProps {
  variant?: 'navbar' | 'card' | 'inline';
  showTooltip?: boolean;
  className?: string;
}

export const TripBalance = ({
  variant = 'navbar',
  showTooltip = true,
  className
}: TripBalanceProps) => {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const balance = user?.trip_token_balance || 0;
  const earnings = user?.trip_earnings_total || 0;
  const spent = user?.trip_spent_total || 0;

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Navbar variant - compact display in navbar
  if (variant === 'navbar') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border border-orange-200 dark:border-orange-800 cursor-default transition-all hover:shadow-md",
                className
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Coins className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-bold text-primary">
                {formatNumber(balance)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                TRIP
              </span>
            </div>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent side="bottom" className="w-64">
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-semibold">TRIP Token Balance</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Balance:</span>
                    <span className="font-semibold">{formatNumber(balance)} TRIP</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Total Earned:</span>
                    <span className="font-semibold">+{formatNumber(earnings)} TRIP</span>
                  </div>
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>Total Spent:</span>
                    <span className="font-semibold">-{formatNumber(spent)} TRIP</span>
                  </div>
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Earn TRIP by creating itineraries, sharing intel, rating places, and posting snaps!
                </div>
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Card variant - detailed display in cards/sections
  if (variant === 'card') {
    return (
      <div className={cn("p-6 rounded-xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 border border-orange-200 dark:border-orange-800", className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">TRIP Balance</h3>
              <p className="text-3xl font-bold text-primary">
                {formatNumber(balance)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/50 dark:bg-black/20">
            <TrendingUp className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              +{formatNumber(earnings)}
            </p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              -{formatNumber(spent)}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Ways to earn TRIP:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Verified itinerary: 50 TRIP</li>
                <li>Travel intel: 10 TRIP</li>
                <li>Safety rating: 5 TRIP</li>
                <li>Snap post: 2 TRIP</li>
                <li>Emergency response: 20 TRIP</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant - simple inline display
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", className)}>
      <Coins className="h-4 w-4 text-primary" />
      <span className="text-primary">{formatNumber(balance)}</span>
      <span className="text-muted-foreground text-xs">TRIP</span>
    </span>
  );
};
