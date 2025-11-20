import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Mail, Trash2, Power, Crown, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';

interface AdminUser {
  id: string;
  email: string;
  is_root: boolean;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export function AdminUserManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.listAdmins();
      if (response.data.status === 'success') {
        setAdmins(response.data.data || []);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'Only root admins can manage admin users',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load admin users',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAdding(true);
      const response = await adminApi.addAdmin(newAdminEmail.trim());
      if (response.data.status === 'success') {
        toast({
          title: 'Success',
          description: `Admin added: ${newAdminEmail}`,
        });
        setNewAdminEmail('');
        fetchAdmins();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add admin',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, email: string) => {
    if (!confirm(`Remove admin access for ${email}?`)) return;

    try {
      const response = await adminApi.removeAdmin(adminId);
      if (response.data.status === 'success') {
        toast({
          title: 'Success',
          description: `Admin removed: ${email}`,
        });
        fetchAdmins();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove admin',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (adminId: string, email: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} admin: ${email}?`)) return;

    try {
      const response = await adminApi.toggleAdminActive(adminId);
      if (response.data.status === 'success') {
        toast({
          title: 'Success',
          description: `Admin ${action}d: ${email}`,
        });
        fetchAdmins();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${action} admin`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          Admin User Management
        </CardTitle>
        <CardDescription>
          Manage admin accounts with OTP-based authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Admin */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Add New Admin</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
              disabled={isAdding}
            />
            <Button
              onClick={handleAddAdmin}
              disabled={isAdding || !newAdminEmail.trim()}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Admin
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            New admins will receive OTP codes via email to login
          </p>
        </div>

        {/* Admin List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Admin Users</h3>
            <div className="text-sm text-muted-foreground">
              Total: {admins.length} ({admins.filter(a => a.is_root).length} root)
            </div>
          </div>

          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No admin users found
            </p>
          ) : (
            <>
              {/* Root Admins Section */}
              {admins.filter(a => a.is_root).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase">
                    <Crown className="h-4 w-4" />
                    Root Administrators
                  </div>
                  {admins.filter(a => a.is_root).map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 border-2 border-purple-600/20 rounded-lg bg-purple-600/5"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Mail className="h-4 w-4 text-purple-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{admin.email}</span>
                            <Badge variant="default" className="bg-purple-600">
                              <Crown className="h-3 w-3 mr-1" />
                              Root Admin
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(admin.created_at).toLocaleDateString()}
                            {admin.last_login && (
                              <> • Last login: {new Date(admin.last_login).toLocaleString()}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Protected
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Regular Admins Section */}
              {admins.filter(a => !a.is_root).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                    <Shield className="h-4 w-4" />
                    Regular Administrators
                  </div>
                  {admins.filter(a => !a.is_root).map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{admin.email}</span>
                            {!admin.is_active && (
                              <Badge variant="secondary">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(admin.created_at).toLocaleDateString()}
                            {admin.last_login && (
                              <> • Last login: {new Date(admin.last_login).toLocaleString()}</>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(admin.id, admin.email, admin.is_active)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">How Admin OTP Authentication Works:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Admins login using email-based OTP codes</li>
            <li>OTP codes are valid for 10 minutes and single-use</li>
            <li>Root admins can manage other admin accounts</li>
            <li>Root admins cannot be removed or deactivated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
