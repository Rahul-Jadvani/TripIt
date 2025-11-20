import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Brain, Github, Users, Trophy, Heart, Save, RotateCcw, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/api';

interface ScoringWeights {
  quality_score: number;
  verification_score: number;
  validation_score: number;
  community_score: number;
  onchain_score: number;
}

interface ScoringConfig {
  scoring_weights: ScoringWeights;
  llm_model: string;
  max_retries: number;
  retry_backoff_seconds: number;
  rate_limit_hours: number;
}

const defaultWeights: ScoringWeights = {
  quality_score: 20,
  verification_score: 20,
  validation_score: 30,
  community_score: 10,
  onchain_score: 20,
};

export function AdminScoringConfig() {
  const [weights, setWeights] = useState<ScoringWeights>(defaultWeights);
  const [maxRetries, setMaxRetries] = useState(10);
  const [retryBackoff, setRetryBackoff] = useState(300);
  const [rateLimit, setRateLimit] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await adminService.getScoringConfig();
      if (response.scoring_weights) {
        setWeights({
          quality_score: response.scoring_weights.quality_score ?? defaultWeights.quality_score,
          verification_score: response.scoring_weights.verification_score ?? defaultWeights.verification_score,
          validation_score: response.scoring_weights.validation_score ?? defaultWeights.validation_score,
          community_score: response.scoring_weights.community_score ?? defaultWeights.community_score,
          onchain_score: response.scoring_weights.onchain_score ?? defaultWeights.onchain_score,
        });
      }
      if (response.scoring_config) {
        setMaxRetries(response.scoring_config.max_retries || 10);
        setRetryBackoff(response.scoring_config.retry_backoff_seconds || 300);
        setRateLimit(response.scoring_config.rate_limit_hours || 1);
      }
    } catch (error) {
      console.error('Failed to load scoring config:', error);
      toast.error('Failed to load scoring configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const isValidTotal = totalWeight === 100;

  const handleSave = async () => {
    if (!isValidTotal) {
      toast.error('Total weights must equal 100');
      return;
    }

    setSaving(true);
    try {
      // Save weights
      await adminService.updateScoringConfig({
        config_key: 'scoring_weights',
        config_value: weights,
      });

      // Save general config
      await adminService.updateScoringConfig({
        config_key: 'scoring_config',
        config_value: {
          llm_model: 'gpt-4o-mini',
          max_retries: maxRetries,
          retry_backoff_seconds: retryBackoff,
          rate_limit_hours: rateLimit,
          enable_scoring: true,
        },
      });

      toast.success('Scoring configuration saved successfully');
    } catch (error) {
      console.error('Failed to save scoring config:', error);
      toast.error('Failed to save scoring configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWeights(defaultWeights);
    setMaxRetries(10);
    setRetryBackoff(300);
    setRateLimit(1);
    toast.info('Reset to default values');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Scoring Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Scoring Configuration
        </CardTitle>
        <CardDescription>
          Configure weights and parameters for the AI-powered scoring system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Weight Indicator */}
        <div
          className={`p-4 rounded-lg border-2 ${
            isValidTotal
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Total Weight:</span>
            <span
              className={`text-2xl font-black ${
                isValidTotal ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalWeight}/100
            </span>
          </div>
          {!isValidTotal && (
            <p className="text-xs text-red-600 mt-2">
              Total must equal 100. Adjust weights below.
            </p>
          )}
        </div>

        {/* Scoring Weights */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold">Component Weights (Total: 100)</h3>

          {/* Code Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Github className="h-4 w-4 text-primary" />
                Code Quality
              </Label>
              <span className="text-sm font-bold">{weights.quality_score}</span>
            </div>
            <Slider
              value={[weights.quality_score]}
              onValueChange={(value) => handleWeightChange('quality_score', value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              GitHub repo analysis, README quality, code organization
            </p>
          </div>

          {/* Team Verification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Team Verification
              </Label>
              <span className="text-sm font-bold">{weights.verification_score}</span>
            </div>
            <Slider
              value={[weights.verification_score]}
              onValueChange={(value) => handleWeightChange('verification_score', value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Team's GitHub history, past projects, contributions
            </p>
          </div>

          {/* AI Validation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI Validation
              </Label>
              <span className="text-sm font-bold">{weights.validation_score}</span>
            </div>
            <Slider
              value={[weights.validation_score]}
              onValueChange={(value) => handleWeightChange('validation_score', value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              GPT-4 analysis: market fit, competitive positioning, innovation
            </p>
          </div>

          {/* Community Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Community Score
              </Label>
              <span className="text-sm font-bold">{weights.community_score}</span>
            </div>
            <Slider
              value={[weights.community_score]}
              onValueChange={(value) => handleWeightChange('community_score', value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Upvotes and comment engagement from community
            </p>
          </div>

          {/* On-Chain Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    On-Chain Score
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Coming soon
                  </span>
                </div>
              </Label>
              <span className="text-sm font-bold">{weights.onchain_score}</span>
            </div>
            <Slider
              value={[weights.onchain_score]}
              onValueChange={(value) => handleWeightChange('onchain_score', value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Reserved for future on-chain verification signals (auto-set to 0 for now)
            </p>
          </div>
        </div>

        {/* General Configuration */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-bold">General Settings</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min={1}
                max={20}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">1-20 attempts</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retryBackoff">Retry Delay (sec)</Label>
              <Input
                id="retryBackoff"
                type="number"
                min={60}
                max={600}
                value={retryBackoff}
                onChange={(e) => setRetryBackoff(parseInt(e.target.value) || 300)}
              />
              <p className="text-xs text-muted-foreground">60-600 seconds</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimit">Rate Limit (hours)</Label>
              <Input
                id="rateLimit"
                type="number"
                min={1}
                max={24}
                value={rateLimit}
                onChange={(e) => setRateLimit(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">1-24 hours</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={!isValidTotal || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
