import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Award, Loader2, ExternalLink, Github, Calendar, Shield,
  TrendingUp, CheckCircle, Clock, Tag, BarChart3, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import CoffeeLoader from '@/components/CoffeeLoader';

const getBackendUrl = (): string => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  return isDev ? 'http://localhost:5000' : 'https://discovery-platform.onrender.com';
};

interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  categories?: string[];
  demo_url?: string;
  github_url?: string;
  hackathon_name?: string;
  hackathon_date?: string;
  tech_stack?: string[];
  creator?: {
    username: string;
    avatar?: string;
  };
  badges?: Array<{
    badge_type: string;
    rationale: string;
    awarded_by: {
      username: string;
    };
    awarded_at: string;
  }>;
  proof_score?: number;
  validation_score?: number;
  created_at: string;
}

interface Assignment {
  id: string;
  project_id: string;
  status: 'pending' | 'in_review' | 'validated' | 'rejected';
  priority: 'normal' | 'high' | 'urgent';
  assigned_at: string;
  category_filter?: string;
  project?: Project;
}

interface ValidatorPermissions {
  can_validate_all: boolean;
  allowed_badge_types: string[];
  allowed_project_ids: string[];
  category_preferences?: string[];
}

interface ValidatorStats {
  total_badges_awarded: number;
  badge_breakdown: {
    stone: number;
    silver: number;
    gold: number;
    platinum: number;
    demerit: number;
  };
  available_projects: number;
  permissions?: ValidatorPermissions;
}

export default function Validator() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [permissions, setPermissions] = useState<ValidatorPermissions | null>(null);
  const [stats, setStats] = useState<ValidatorStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [badgeType, setBadgeType] = useState<string>('silver');
  const [rationale, setRationale] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'validated'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    if (user && token) {
      fetchPermissions();
      fetchStats();
      fetchDashboard();
    }
  }, [user, token]);

  const fetchPermissions = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/validator/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPermissions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/validator/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/validator/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.status === 'success') {
        setAssignments(data.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch assignments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAwardBadge = async (projectId: string) => {
    if (!rationale.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rationale for the badge',
        variant: 'destructive',
      });
      return;
    }

    setIsAwarding(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/validator/badges/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          badge_type: badgeType,
          rationale: rationale.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge awarded successfully`,
        });
        setSelectedProject(null);
        setRationale('');
        setBadgeType('silver');
        fetchDashboard();
        fetchStats();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to award badge',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to award badge',
        variant: 'destructive',
      });
    } finally {
      setIsAwarding(false);
    }
  };

  const getBadgeColor = (badge_type: string) => {
    switch (badge_type) {
      case 'platinum': return 'bg-gradient-to-r from-slate-300 to-slate-500 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 'stone': return 'bg-gradient-to-r from-stone-400 to-stone-600 text-white';
      case 'demerit': return 'bg-gradient-to-r from-red-500 to-red-700 text-white';
      default: return 'bg-gray-500';
    }
  };

  const getBadgePoints = (badge_type: string) => {
    switch (badge_type) {
      case 'stone': return '+5';
      case 'silver': return '+10';
      case 'gold': return '+15';
      case 'platinum': return '+20';
      case 'demerit': return '-10';
      default: return '+0';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filterTab === 'pending') return assignment.status === 'pending';
    if (filterTab === 'validated') return assignment.status === 'validated';
    return true;
  });

  // Calculate category breakdown
  const categoryBreakdown: Record<string, number> = {};
  assignments.forEach(assignment => {
    if (assignment.project?.categories) {
      assignment.project.categories.forEach(cat => {
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      });
    }
  });

  // Show loading animation while fetching data
  if (isLoading && assignments.length === 0) {
    return <CoffeeLoader overlay captionCategory="validator" />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Validator Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Award validation badges to projects and track your validation activity</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Badges Awarded</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_badges_awarded}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all badge types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {assignments.filter(a => a.status === 'pending').length} pending validation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gold Badges</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.badge_breakdown.gold}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Silver: {stats.badge_breakdown.silver}, Platinum: {stats.badge_breakdown.platinum}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignments.length > 0
                  ? Math.round((assignments.filter(a => a.status === 'validated').length / assignments.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {assignments.filter(a => a.status === 'validated').length} validated of {assignments.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permissions and Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {permissions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Can validate all projects:</span>
                  <Badge variant={permissions.can_validate_all ? 'default' : 'secondary'}>
                    {permissions.can_validate_all ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2">Allowed badge types:</p>
                  <div className="flex flex-wrap gap-2">
                    {permissions.allowed_badge_types.map(type => (
                      <Badge key={type} className={getBadgeColor(type)}>
                        {type.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
                {permissions.category_preferences && permissions.category_preferences.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Category Preferences:</p>
                    <div className="flex flex-wrap gap-2">
                      {permissions.category_preferences.map(cat => (
                        <Badge key={cat} variant="outline" className="bg-primary/10">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {!permissions.can_validate_all && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Assigned projects:</span>
                    <span className="font-semibold">{permissions.allowed_project_ids.length} projects</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {Object.keys(categoryBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Category Breakdown
              </CardTitle>
              <CardDescription>Distribution of assigned projects by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10">
                          {category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(count / assignments.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Projects Tabs */}
      <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({assignments.filter(a => a.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            <CheckCircle className="h-4 w-4 mr-2" />
            Validated ({assignments.filter(a => a.status === 'validated').length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Projects ({assignments.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Projects List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {filterTab === 'pending' ? 'No projects pending validation' : 'No projects found'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredAssignments.map((assignment) => {
            const project = assignment.project;
            if (!project) return null;

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">
                          <a
                            href={`/project/${project.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {project.title}
                          </a>
                        </CardTitle>
                        {assignment.priority !== 'normal' && (
                          <Badge variant="outline" className={`${getPriorityColor(assignment.priority)} border-current`}>
                            {assignment.priority.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{project.tagline}</CardDescription>

                      {/* Categories */}
                      {project.categories && project.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {project.categories.map(cat => (
                            <Badge key={cat} variant="secondary" className="bg-primary/20">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {project.creator && (
                          <span>By @{project.creator.username}</span>
                        )}
                        {project.hackathon_name && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{project.hackathon_name}</span>
                          </div>
                        )}
                        {assignment.category_filter && (
                          <Badge variant="outline" className="text-xs">
                            Filter: {assignment.category_filter}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {project.proof_score || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Proof Score</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{project.description}</p>

                  {/* Tech Stack */}
                  {project.tech_stack && project.tech_stack.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tech Stack:</p>
                      <div className="flex flex-wrap gap-1">
                        {project.tech_stack.map(tech => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {project.demo_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Demo
                        </a>
                      </Button>
                    )}
                    {project.github_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                          <Github className="h-4 w-4 mr-1" />
                          GitHub
                        </a>
                      </Button>
                    )}
                  </div>

                  {project.badges && project.badges.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-2">Existing Badges</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.badges.map((badge, idx) => (
                          <Badge key={idx} className={getBadgeColor(badge.badge_type)}>
                            {badge.badge_type.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Only show Award Badge button if assignment is pending/in_review */}
                  {assignment.status !== 'validated' && assignment.status !== 'rejected' && (
                    <>
                      {selectedProject === project.id ? (
                        <div className="border-t pt-4 space-y-3">
                          <h4 className="text-sm font-semibold">Award Badge</h4>
                          <Select value={badgeType} onValueChange={setBadgeType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {permissions?.allowed_badge_types.map(type => (
                                <SelectItem key={type} value={type}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    <span className="ml-4 text-xs text-muted-foreground">
                                      {getBadgePoints(type)} points
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Rationale for awarding this badge..."
                            value={rationale}
                            onChange={(e) => setRationale(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAwardBadge(project.id)}
                              disabled={isAwarding || !rationale.trim()}
                            >
                              {isAwarding ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Awarding...
                                </>
                              ) : (
                                <>
                                  <Award className="mr-2 h-4 w-4" />
                                  Award Badge
                                </>
                              )}
                            </Button>
                            <Button variant="outline" onClick={() => {
                              setSelectedProject(null);
                              setRationale('');
                            }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setSelectedProject(project.id)}
                          variant="default"
                          size="sm"
                        >
                          <Award className="mr-2 h-4 w-4" />
                          Award Badge
                        </Button>
                      )}
                    </>
                  )}

                  {/* Show validation info for validated projects */}
                  {assignment.status === 'validated' && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Validated</span>
                      </div>
                      {assignment.review_notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {assignment.review_notes}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
