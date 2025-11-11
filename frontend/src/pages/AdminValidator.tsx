import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle, Award, Loader2, Shield, ExternalLink, Github, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CoffeeLoader from '@/components/CoffeeLoader';

const ADMIN_PASSWORD = 'Admin';

// Helper function to get the backend URL
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
  demo_url?: string;
  github_url?: string;
  hackathon_name?: string;
  hackathon_date?: string;
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
  verification_score?: number;
  community_score?: number;
  validation_score?: number;
  quality_score?: number;
  created_at: string;
}

interface InvestorRequest {
  id: string;
  user_id: string;
  plan_type: string;
  company_name?: string;
  linkedin_url?: string;
  reason?: string;
  status: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
    email?: string;
  };
}

export default function AdminValidator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [investorRequests, setInvestorRequests] = useState<InvestorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [badgeType, setBadgeType] = useState<'stone' | 'silver' | 'gold' | 'platinum' | 'demerit'>('silver');
  const [rationale, setRationale] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated in session
    const isAuth = sessionStorage.getItem('adminValidatorAuth') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
      fetchProjects();
      fetchInvestorRequests();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminValidatorAuth', 'true');
        setError('');
        fetchProjects();
        fetchInvestorRequests();
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (error) {
      setError('Failed to authenticate');
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminValidatorAuth');
    setPassword('');
    navigate('/');
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/projects?sort=newest&per_page=100`);
      const data = await response.json();
      console.log('API Response:', data);

      if (data.status === 'success') {
        // Handle paginated response
        const projectsArray = Array.isArray(data.data) ? data.data : [];
        console.log('Projects array:', projectsArray);
        setProjects(projectsArray);
      } else {
        console.error('API returned error', data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch projects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvestorRequests = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/investor-requests/all`, {
        headers: {
          'X-Admin-Password': 'Admin',
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        setInvestorRequests(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch investor requests:', err);
    }
  };

  const handleApproveInvestor = async (requestId: string) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/investor-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'X-Admin-Password': 'Admin',
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: 'Investor request approved',
        });
        fetchInvestorRequests();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to approve request',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  const handleRejectInvestor = async (requestId: string) => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/investor-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'X-Admin-Password': 'Admin',
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: 'Investor request rejected',
        });
        fetchInvestorRequests();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to reject request',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/badges/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
          description: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge awarded!`,
        });
        setSelectedProject(null);
        setRationale('');
        setBadgeType('silver');
        fetchProjects();
      } else {
        throw new Error(data.message || 'Failed to award badge');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to award badge',
        variant: 'destructive',
      });
    } finally {
      setIsAwarding(false);
    }
  };

  const getValidationStatus = (project: Project) => {
    if (project.badges && project.badges.length > 0) {
      const highestBadge = project.badges.reduce((highest, current) => {
        const badgeOrder = { platinum: 3, gold: 2, silver: 1 };
        const currentLevel = badgeOrder[current.badge_type as keyof typeof badgeOrder] || 0;
        const highestLevel = badgeOrder[highest.badge_type as keyof typeof badgeOrder] || 0;
        return currentLevel > highestLevel ? current : highest;
      });
      return {
        status: 'validated',
        badge: highestBadge.badge_type,
        rationale: highestBadge.rationale,
      };
    }
    return { status: 'pending', badge: null, rationale: null };
  };

  const badgeIcons: Record<string, string> = {
    stone: '🪨',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    demerit: '⛔',
  };

  const badgeColors: Record<string, string> = {
    stone: 'bg-stone-400/20 border-stone-500 text-stone-700',
    silver: 'bg-gray-400/20 border-gray-400 text-gray-700',
    gold: 'bg-primary border-primary text-black font-semibold',
    platinum: 'bg-purple-400/20 border-purple-500 text-purple-700',
    demerit: 'bg-red-400/20 border-red-500 text-red-700',
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black text-center">Admin + Validator</CardTitle>
            <CardDescription className="text-center">
              Enter password to access validation dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-black"
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full btn-primary">
                <Shield className="mr-2 h-4 w-4" />
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading animation on first load
  if (isLoading && projects.length === 0 && investorRequests.length === 0) {
    return <CoffeeLoader overlay captionCategory="admin" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-black">Admin + Validator Dashboard</h1>
          <p className="text-muted-foreground">Review and validate projects</p>
        </div>
        <Button onClick={handleLogout} variant="outline" className="border-2 border-black">
          Logout
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="pending">Pending Validation</TabsTrigger>
          <TabsTrigger value="validated">Validated</TabsTrigger>
          <TabsTrigger value="investor-requests">Investor Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const validation = getValidationStatus(project);
                return (
                  <Card
                    key={project.id}
                    className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl font-black">{project.title}</CardTitle>
                            {validation.status === 'validated' && validation.badge && (
                              <Badge className={`${badgeColors[validation.badge]} border-2`}>
                                {badgeIcons[validation.badge]} {validation.badge.toUpperCase()}
                              </Badge>
                            )}
                            {validation.status === 'pending' && (
                              <Badge variant="outline" className="border-2 border-primary bg-primary text-black font-semibold">
                                ⏳ Pending
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{project.tagline}</CardDescription>
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <span>by @{project.creator?.username || 'Unknown'}</span>
                            {project.hackathon_name && (
                              <>
                                <span>•</span>
                                <Calendar className="h-3 w-3" />
                                <span>{project.hackathon_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="badge-primary flex flex-col items-center justify-center px-4 py-2 rounded-lg">
                          <div className="text-2xl font-black">{project.proof_score || 0}</div>
                          <div className="text-xs font-bold">Score</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-foreground line-clamp-2">{project.description}</p>

                        <div className="flex flex-wrap gap-2">
                          {project.demo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-2 border-black"
                            >
                              <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Demo
                              </a>
                            </Button>
                          )}
                          {project.github_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-2 border-black"
                            >
                              <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                <Github className="mr-2 h-4 w-4" />
                                Code
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-2 border-black"
                          >
                            <a href={`/project/${project.id}`} target="_blank" rel="noopener noreferrer">
                              View Details
                            </a>
                          </Button>
                        </div>

                        {validation.status === 'validated' && validation.rationale && (
                          <div className="border-l-4 border-primary pl-4 py-2 bg-secondary/30 rounded">
                            <p className="text-sm font-semibold text-foreground">Validation Rationale:</p>
                            <p className="text-sm text-muted-foreground">{validation.rationale}</p>
                          </div>
                        )}

                        {validation.status === 'validated' ? (
                          <div className="border-2 border-primary rounded-lg p-3 bg-primary hover:bg-primary/90 transition-all duration-200">
                            <div className="flex items-center gap-2 text-sm text-black font-semibold hover:text-black/80 transition-colors duration-200">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black stroke-black" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-bold">Already Validated</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              This project has been awarded a {validation.badge?.toUpperCase()} badge
                            </p>
                          </div>
                        ) : selectedProject === project.id ? (
                          <div className="border-4 border-primary rounded-lg p-4 bg-primary/5">
                            <h4 className="font-black text-sm mb-3">Award Badge</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-bold mb-2 block">Badge Type</label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                  {(['stone', 'silver', 'gold'] as const).map((type) => (
                                    <Button
                                      key={type}
                                      variant={badgeType === type ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setBadgeType(type)}
                                      className={`border-2 border-black ${
                                        badgeType === type ? 'bg-primary' : ''
                                      }`}
                                    >
                                      <span className="text-lg mr-1">{badgeIcons[type]}</span>
                                      <span className="text-xs">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    </Button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {(['platinum', 'demerit'] as const).map((type) => (
                                    <Button
                                      key={type}
                                      variant={badgeType === type ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setBadgeType(type)}
                                      className={`border-2 border-black ${
                                        badgeType === type ? 'bg-primary' : ''
                                      } ${type === 'demerit' ? 'border-red-500' : ''}`}
                                    >
                                      <span className="text-lg mr-1">{badgeIcons[type]}</span>
                                      <span className="text-xs">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    </Button>
                                  ))}
                                </div>
                                <div className="mt-2 p-2 bg-secondary/30 rounded text-xs">
                                  <p className="font-semibold mb-1">Points:</p>
                                  <p>🪨 Stone: +5 | 🥈 Silver: +10 | 🥇 Gold: +15 | 💎 Platinum: +20 | ⛔ Demerit: -10</p>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-bold mb-2 block">Rationale</label>
                                <Input
                                  placeholder="Why does this project deserve this badge?"
                                  value={rationale}
                                  onChange={(e) => setRationale(e.target.value)}
                                  className="border-2 border-black"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAwardBadge(project.id)}
                                  disabled={isAwarding || !rationale.trim()}
                                  className="btn-primary"
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
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProject(null);
                                    setRationale('');
                                    setBadgeType('silver');
                                  }}
                                  className="border-2 border-black"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setSelectedProject(project.id)}
                            className="btn-secondary"
                          >
                            <Award className="mr-2 h-4 w-4" />
                            Award Badge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-4">
            {projects
              .filter((p) => getValidationStatus(p).status === 'pending')
              .map((project) => (
                <Card
                  key={project.id}
                  className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl font-black">{project.title}</CardTitle>
                        <CardDescription>{project.tagline}</CardDescription>
                      </div>
                      <Badge variant="outline" className="border-2 border-primary bg-primary text-black font-semibold">
                        ⏳ Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => setSelectedProject(project.id)}
                      className="btn-primary"
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Review & Award
                    </Button>
                  </CardContent>
                </Card>
              ))}
            {projects.filter((p) => getValidationStatus(p).status === 'pending').length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No projects pending validation
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="validated">
          <div className="space-y-4">
            {projects
              .filter((p) => getValidationStatus(p).status === 'validated')
              .map((project) => {
                const validation = getValidationStatus(project);
                return (
                  <Card
                    key={project.id}
                    className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl font-black">{project.title}</CardTitle>
                            {validation.badge && (
                              <Badge className={`${badgeColors[validation.badge]} border-2`}>
                                {badgeIcons[validation.badge]} {validation.badge.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{project.tagline}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {validation.rationale && (
                        <div className="border-l-4 border-primary pl-4 py-2 bg-secondary/30 rounded">
                          <p className="text-sm font-semibold text-foreground">Rationale:</p>
                          <p className="text-sm text-muted-foreground">{validation.rationale}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            {projects.filter((p) => getValidationStatus(p).status === 'validated').length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No validated projects yet
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="investor-requests">
          <div className="space-y-4">
            {investorRequests.filter((req) => req.status === 'pending').length === 0 && (
              <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No pending investor requests</p>
                </CardContent>
              </Card>
            )}
            {investorRequests
              .filter((req) => req.status === 'pending')
              .map((req) => (
                <Card
                  key={req.id}
                  className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-black">
                          {req.user?.display_name || req.user?.username || 'Unknown User'}
                        </CardTitle>
                        <CardDescription className="space-y-1 mt-2">
                          <div>@{req.user?.username}</div>
                          {req.user?.email && <div>{req.user.email}</div>}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-primary/20 border-2 border-primary text-primary">
                              {req.plan_type.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Requested {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {req.company_name && (
                      <div>
                        <p className="text-sm font-bold mb-1">Company/Fund:</p>
                        <p className="text-sm text-muted-foreground">{req.company_name}</p>
                      </div>
                    )}
                    {req.linkedin_url && (
                      <div>
                        <p className="text-sm font-bold mb-1">LinkedIn:</p>
                        <a
                          href={req.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {req.linkedin_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {req.reason && (
                      <div>
                        <p className="text-sm font-bold mb-1">Reason:</p>
                        <p className="text-sm text-muted-foreground">{req.reason}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleApproveInvestor(req.id)}
                        className="flex-1 btn-primary"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectInvestor(req.id)}
                        variant="outline"
                        className="flex-1 border-2 border-black"
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
