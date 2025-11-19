/**
 * Chain Analytics Dashboard
 * Comprehensive analytics for chain owners
 */
import { useParams, Link, Navigate } from 'react-router-dom';
import { useChain, useChainAnalytics } from '@/hooks/useChains';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  FolderOpen,
  Eye,
  ThumbsUp,
  MessageSquare,
  Activity,
  Loader2,
  BarChart3,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';
import { formatScore, getProjectScore } from '@/utils/score';

export default function ChainAnalytics() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: chainData, isLoading: chainLoading } = useChain(slug || '');
  const { data: analyticsData, isLoading: analyticsLoading } = useChainAnalytics(slug || '', !!slug);

  const chain = chainData?.chain;
  const analytics = analyticsData;

  // Check if user is owner
  const isOwner = user && chain && (chain.creator_id === user.id || chain.creator_id === user.userId);

  if (chainLoading || analyticsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-destructive">Chain not found</p>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return <Navigate to={`/chains/${slug}`} replace />;
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-destructive">Failed to load analytics</p>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to={`/chains/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chain
            </Link>
          </Button>
          <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-primary" />
            {analytics.chain.name} Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive insights for your chain
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overview.total_projects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{analytics.recent_activity.projects_last_7_days} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Followers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overview.total_followers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{analytics.recent_activity.followers_last_7_days} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overview.total_views}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatScore(analytics.overview.average_project_score)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overview.pending_requests}</div>
            <p className="text-xs text-muted-foreground mt-1">Requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm">Total Upvotes</span>
              </div>
              <div className="text-2xl font-bold">{analytics.engagement.total_upvotes}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Total Comments</span>
              </div>
              <div className="text-2xl font-bold">{analytics.engagement.total_comments}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Engagement Rate</span>
              </div>
              <div className="text-2xl font-bold">{analytics.engagement.engagement_rate}</div>
              <p className="text-xs text-muted-foreground">Per project</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Follower Growth (30 Days)
            </CardTitle>
            <CardDescription>Total followers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.growth.cumulative_followers.slice(-10).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                  <span className="font-semibold">{item.followers} followers</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Additions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Projects Added (30 Days)
            </CardTitle>
            <CardDescription>New projects per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.growth.projects_added.slice(-10).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                  <Badge variant="outline">+{item.count} projects</Badge>
                </div>
              ))}
              {analytics.growth.projects_added.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No projects added in the last 30 days</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Performing Projects
          </CardTitle>
          <CardDescription>Highest scoring projects in your chain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.top_projects.map((project, index) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="flex items-start justify-between p-4 bg-secondary/20 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-muted-foreground/50">#{index + 1}</span>
                    <h3 className="font-bold text-foreground">{project.title}</h3>
                    {project.is_pinned && <Badge variant="default">Pinned</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      Score: {formatScore(getProjectScore(project))}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {project.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {project.comment_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {project.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {analytics.top_projects.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No projects in chain yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Period Info */}
      <Card className="bg-secondary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Analytics data for the last 30 days • Created on {new Date(analytics.chain.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
