import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/api';

export default function AdminRescore() {
  const [projectId, setProjectId] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRescoreSingle = async () => {
    if (!projectId.trim()) {
      toast.error('Please enter a project ID');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await adminService.rescoreProject(projectId);
      setResult({
        success: true,
        message: `Project rescore queued successfully!`,
        data: response.data
      });
      toast.success('Rescore queued! Check project page in 30-60 seconds.');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to rescore project';
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
      const response = await adminService.rescoreProjectsBulk({ filter });
      setResult({
        success: true,
        message: `Queued ${response.data.queued_count} projects for rescoring`,
        data: response.data
      });
      toast.success(`${response.data.queued_count} projects queued for rescoring!`);
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
        <h1 className="text-3xl font-bold">Project Rescoring</h1>
        <p className="text-muted-foreground mt-2">
          Manually trigger project rescoring with updated algorithms
        </p>
      </div>

      {/* Single Project Rescore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Rescore Single Project
          </CardTitle>
          <CardDescription>
            Rescore a specific project by ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              placeholder="Enter project UUID..."
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: 2dac2aba-bbf6-4000-8c32-b68e75eb3e95
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
                Rescore Project
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
            Bulk Rescore Projects
          </CardTitle>
          <CardDescription>
            Rescore multiple projects based on status filter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filter">Filter</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger id="filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="failed">Failed Scoring Only</SelectItem>
                <SelectItem value="completed">Completed Only</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Warning: Resource Intensive
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Bulk rescoring will queue many projects and consume significant API resources (OpenAI, GitHub). Use with caution.
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
                Bulk Rescore Projects
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
              <li>Community Score: 0-30 points (upvotes, comments, engagement)</li>
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
