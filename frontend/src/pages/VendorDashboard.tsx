/**
 * VendorDashboard - Main dashboard for vendor portal
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  QrCode,
  History,
  LogOut,
  Building2,
  MapPin,
  Mail,
  Phone,
  ScanLine,
  Clock,
  Users,
  ChevronRight,
} from 'lucide-react';
import {
  getVendorProfile,
  getScanHistory,
  getVendorStats,
  vendorLogout,
  VendorData,
  ScanHistoryItem,
  VendorStats,
} from '@/services/vendorApi';

export default function VendorDashboard() {
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [vendorData, statsData, historyData] = await Promise.all([
        getVendorProfile(),
        getVendorStats(),
        getScanHistory(5, 0),
      ]);
      setVendor(vendorData);
      setStats(statsData);
      setRecentScans(historyData.items);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    vendorLogout();
    toast.success('Logged out successfully');
    navigate('/vendor/login');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVendorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotel: 'Hotel / Accommodation',
      transport: 'Transport Service',
      police: 'Police Station',
      hospital: 'Hospital / Medical',
      other: 'Other Service',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Vendor Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {vendor?.vendor_name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_scans || 0}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
            </div>
          </div>

          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.unique_users_verified || 0}</p>
                <p className="text-xs text-muted-foreground">Unique Users</p>
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 col-span-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium truncate">
                  {formatDate(stats?.last_scan_at)}
                </p>
                <p className="text-xs text-muted-foreground">Last Scan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate('/vendor/scan-qr')}
            className="card-elevated p-6 text-left hover:border-primary transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <QrCode className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">Scan SBT QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Verify traveler identity
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>

          <button
            onClick={() => navigate('/vendor/scan-qr')}
            className="card-elevated p-6 text-left hover:border-primary transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <History className="h-7 w-7 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">View Scan History</h3>
                <p className="text-sm text-muted-foreground">
                  See past verifications
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendor Info Card */}
          <div className="card-elevated p-4 sm:p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Vendor Information
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{vendor?.vendor_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {vendor?.organization || 'Individual Vendor'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">
                    {vendor?.vendor_type?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {getVendorTypeLabel(vendor?.vendor_type || '')}
                  </p>
                  <p className="text-xs text-muted-foreground">Vendor Type</p>
                </div>
              </div>

              {(vendor?.city || vendor?.state) && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {[vendor?.city, vendor?.state, vendor?.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">Location</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{vendor?.contact_email}</p>
                  <p className="text-xs text-muted-foreground">Email</p>
                </div>
              </div>

              {vendor?.contact_phone && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{vendor.contact_phone}</p>
                    <p className="text-xs text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scans */}
          <div className="card-elevated p-4 sm:p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Verifications
            </h2>

            {recentScans.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No verifications yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start scanning QR codes to see history
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {scan.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {scan.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(scan.last_scanned_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          scan.verification_status === 'verified'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {scan.verification_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
