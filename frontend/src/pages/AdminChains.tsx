/**
 * Admin Chain Moderation Page
 * Comprehensive chain management for admins
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Layers,
  Shield,
  Ban,
  Clock,
  Check,
  Trash2,
  Star,
  Search,
  AlertCircle,
  Loader2,
  Eye,
  Users,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  useAdminChains,
  useBanChain,
  useSuspendChain,
  useUnbanChain,
  useDeleteChainAdmin,
  useToggleChainFeatured,
  useModerationLogs,
  usePlatformStats,
} from '@/hooks/useAdminChains';

export default function AdminChains() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chains');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'banned' | 'suspended' | ''>('');
  const [page, setPage] = useState(1);

  // Fetch data
  const { data: chainsData, isLoading: chainsLoading } = useAdminChains({
    page,
    per_page: 20,
    search: searchQuery,
    status: statusFilter,
  });
  const { data: logsData, isLoading: logsLoading } = useModerationLogs({ page, per_page: 50 });
  const { data: statsData } = usePlatformStats();

  // Mutations
  const banChainMutation = useBanChain();
  const suspendChainMutation = useSuspendChain();
  const unbanChainMutation = useUnbanChain();
  const deleteChainMutation = useDeleteChainAdmin();
  const toggleFeaturedMutation = useToggleChainFeatured();

  // State for dialogs
  const [selectedChain, setSelectedChain] = useState<any>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [deleteReason, setDeleteReason] = useState('');

  // Check if user is admin
  if (!user?.isAdmin && !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-6 w-6" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You must be an administrator to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const chains = chainsData?.data?.chains || [];
  const totalChains = chainsData?.data?.total || 0;
  const logs = logsData?.data?.logs || [];
  const chainStats = statsData?.data?.chains || {};

  // Handler functions
  const handleBanChain = async () => {
    if (!selectedChain) return;
    await banChainMutation.mutateAsync({
      slug: selectedChain.slug,
      reason: banReason || undefined,
    });
    setBanDialogOpen(false);
    setBanReason('');
    setSelectedChain(null);
  };

  const handleSuspendChain = async () => {
    if (!selectedChain) return;
    await suspendChainMutation.mutateAsync({
      slug: selectedChain.slug,
      reason: suspendReason || undefined,
      duration_days: suspendDuration,
    });
    setSuspendDialogOpen(false);
    setSuspendReason('');
    setSuspendDuration(7);
    setSelectedChain(null);
  };

  const handleUnbanChain = async (chain: any) => {
    await unbanChainMutation.mutateAsync({
      slug: chain.slug,
      reason: 'Unbanned by administrator',
    });
  };

  const handleDeleteChain = async () => {
    if (!selectedChain) return;
    await deleteChainMutation.mutateAsync({
      slug: selectedChain.slug,
      reason: deleteReason || undefined,
    });
    setDeleteDialogOpen(false);
    setDeleteReason('');
    setSelectedChain(null);
  };

  const handleToggleFeatured = async (chain: any) => {
    await toggleFeaturedMutation.mutateAsync(chain.slug);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'banned':
        return <Badge variant="destructive">Banned</Badge>;
      case 'suspended':
        return <Badge variant="secondary" className="bg-orange-500">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground flex items-center gap-3 mb-2">
            <Shield className="h-10 w-10 text-primary" />
            Chain Moderation
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage and moderate chains across the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Chains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{chainStats.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{chainStats.active || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500" />
                Banned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{chainStats.banned || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Suspended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{chainStats.suspended || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="chains" className="gap-2">
              <Layers className="h-4 w-4" />
              All Chains ({totalChains})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Shield className="h-4 w-4" />
              Moderation Logs
            </TabsTrigger>
          </TabsList>

          {/* Chains Tab */}
          <TabsContent value="chains" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search chains by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Chains List */}
            {chainsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : chains.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No chains found
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {chains.map((chain: any) => (
                  <Card key={chain.id} className="hover:border-primary transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Link
                              to={`/chains/${chain.slug}`}
                              className="text-xl font-bold text-foreground hover:text-primary transition-colors"
                            >
                              {chain.name}
                            </Link>
                            {getStatusBadge(chain.status)}
                            {chain.is_featured && (
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {chain.description}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FolderOpen className="h-4 w-4" />
                              {chain.project_count} projects
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {chain.follower_count} followers
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {chain.view_count} views
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(chain.created_at)}
                            </div>
                          </div>

                          {chain.ban_reason && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                              <p className="text-sm text-red-500 font-medium">Reason: {chain.ban_reason}</p>
                              {chain.suspended_until && (
                                <p className="text-xs text-red-400 mt-1">
                                  Suspended until: {formatDate(chain.suspended_until)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {chain.status === 'active' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleFeatured(chain)}
                                disabled={toggleFeaturedMutation.isPending}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                {chain.is_featured ? 'Unfeature' : 'Feature'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedChain(chain);
                                  setSuspendDialogOpen(true);
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Suspend
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedChain(chain);
                                  setBanDialogOpen(true);
                                }}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUnbanChain(chain)}
                              disabled={unbanChainMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Unban
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              setSelectedChain(chain);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Moderation Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            {logsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No moderation logs found
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {logs.map((log: any) => (
                  <Card key={log.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{log.action}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          {log.chain && (
                            <Link
                              to={`/chains/${log.chain.slug}`}
                              className="text-lg font-semibold text-foreground hover:text-primary"
                            >
                              {log.chain.name}
                            </Link>
                          )}
                          {log.reason && (
                            <p className="text-sm text-muted-foreground">Reason: {log.reason}</p>
                          )}
                          {log.admin && (
                            <p className="text-xs text-muted-foreground">
                              By: {log.admin.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Ban Dialog */}
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban Chain</DialogTitle>
              <DialogDescription>
                This will permanently ban "{selectedChain?.name}". Users will not be able to access it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="banReason">Reason (optional)</Label>
                <Textarea
                  id="banReason"
                  placeholder="Enter reason for banning this chain..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBanChain}
                disabled={banChainMutation.isPending}
              >
                {banChainMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Banning...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Ban Chain
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspend Chain</DialogTitle>
              <DialogDescription>
                Temporarily suspend "{selectedChain?.name}" for a specified duration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="suspendDuration">Duration (days)</Label>
                <Input
                  id="suspendDuration"
                  type="number"
                  min={1}
                  max={365}
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="suspendReason">Reason (optional)</Label>
                <Textarea
                  id="suspendReason"
                  placeholder="Enter reason for suspending this chain..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSuspendChain}
                disabled={suspendChainMutation.isPending}
              >
                {suspendChainMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Suspending...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Suspend Chain
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Chain</DialogTitle>
              <DialogDescription>
                This will PERMANENTLY delete "{selectedChain?.name}" and all associated data. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4">
                <p className="text-sm text-red-500 font-medium">
                  Warning: This will delete all projects, followers, and data associated with this
                  chain.
                </p>
              </div>
              <div>
                <Label htmlFor="deleteReason">Reason (optional)</Label>
                <Textarea
                  id="deleteReason"
                  placeholder="Enter reason for deleting this chain..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChain}
                disabled={deleteChainMutation.isPending}
              >
                {deleteChainMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
