import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/api';

export default function AdminRescore() {
  const [itineraryId, setItineraryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRescoreSingle = async () => {
    if (!itineraryId.trim()) {
      toast.error('Please enter an itinerary ID');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await adminService.rescoreItinerary(itineraryId);
      setResult({
        success: true,
        message: `Itinerary rescore queued successfully!`,
        data: response.data
      });
      toast.success('Rescore queued! Check itinerary page in 30-60 seconds.');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to rescore itinerary';
      setResult({
        success: false,
        message: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRescoreBulk = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await adminService.rescoreItinerariesBulk();
      setResult({
        success: true,
        message: `Queued ${response.data.queued_count} itineraries for rescoring`,
        data: response.data
      });
      toast.success(`${response.data.queued_count} itineraries queued for rescoring!`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to bulk rescore';
      setResult({
        success: false,
        message: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Itinerary Rescoring</h1>
        <p className="text-muted-foreground mt-2">
          Manually trigger itinerary rescoring with updated scoring algorithms
        </p>
      </div>

      {/* Single Itinerary Rescore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Rescore Single Itinerary
          </CardTitle>
          <CardDescription>
            Rescore a specific itinerary by ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itineraryId">Itinerary ID</Label>
            <Input
              id="itineraryId"
              placeholder="Enter itinerary UUID..."
              value={itineraryId}
              onChange={(e) => setItineraryId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: aa434517-d433-4bc4-81b0-0f62e7c17610
            </p>
          </div>
          <Button
            onClick={handleRescoreSingle}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Queueing Rescore...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescore Itinerary
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Rescore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Bulk Rescore All Itineraries
          </CardTitle>
          <CardDescription>
            Rescore all itineraries in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will queue all itineraries for rescoring with the new scoring algorithm.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Warning: Resource Intensive
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Bulk rescoring will queue all itineraries. This may take several minutes depending on the number of itineraries in the system.
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleRescoreBulk}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Queueing Bulk Rescore...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Bulk Rescore All Itineraries
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className={result.success ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {result.message}
                </p>
                {result.data && (
                  <pre className="mt-3 p-3 bg-slate-100 dark:bg-slate-900 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>How Rescoring Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>When to Rescore:</strong>
            <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
              <li>After updating scoring algorithms</li>
              <li>When projects show incorrect or outdated scores</li>
              <li>After adding GitHub token (increases rate limit)</li>
              <li>When scoring failed due to API issues</li>
            </ul>
          </div>
          <div>
            <strong>Scoring Components (100 points total):</strong>
            <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
              <li>Code Quality: 0-20 points (GitHub repo analysis)</li>
              <li>Author Verification: 0-20 points (repository owner profile)</li>
              <li>AI Validation: 0-30 points (market fit, innovation, success criteria)</li>
              <li>Community Score: 0-10 points (upvotes + comments relative to top projects)</li>
              <li>On-Chain Score: 0-20 points (reserved for upcoming on-chain verification)</li>
            </ul>
          </div>
          <div>
            <strong>Processing Time:</strong>
            <p className="text-muted-foreground mt-1">
              Rescoring takes 30-60 seconds per project. Results appear on project page after completion.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
