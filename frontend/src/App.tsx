import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute, AdminRoute, ValidatorRoute } from "./components/ProtectedRoute";
import { PageScrollBackground } from "./components/PageScrollBackground";
import { wagmiConfig } from "./config/wagmi";
import { usePrefetch } from "./hooks/usePrefetch";
import { useRealTimeUpdates } from "./hooks/useRealTimeUpdates";
import { Suspense, lazy } from "react";
import { CoffeeLoader } from "./components/CoffeeLoader";
import { FirstOpenLoader } from "./components/FirstOpenLoader";
import { NetworkGuard } from "./components/NetworkGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Pages (lazy-loaded)
const Feed = lazy(() => import("./pages/Feed"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Search = lazy(() => import("./pages/Search"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const About = lazy(() => import("./pages/About"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const MyProjects = lazy(() => import("./pages/MyProjects"));
const Publish = lazy(() => import("./pages/Publish"));
const EditProject = lazy(() => import("./pages/EditProject"));
const Intros = lazy(() => import("./pages/Intros"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminRescore = lazy(() => import("./pages/AdminRescore"));
const AdminValidator = lazy(() => import("./pages/AdminValidator"));
const Validator = lazy(() => import("./pages/Validator"));
const InvestorPlans = lazy(() => import("./pages/InvestorPlans"));
const InvestorDashboard = lazy(() => import("./pages/InvestorDashboard"));
const InvestorDirectory = lazy(() => import("./pages/InvestorDirectory"));
const Investors = lazy(() => import("./pages/Investors"));
const DirectMessages = lazy(() => import("./pages/DirectMessages"));
const GalleryView = lazy(() => import("./pages/GalleryView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NetworkIssue = lazy(() => import("./pages/NetworkIssue"));
const ChainsListPage = lazy(() => import("./pages/ChainsListPage"));
const ChainDetailPage = lazy(() => import("./pages/ChainDetailPage"));
const ChainAnalytics = lazy(() => import("./pages/ChainAnalytics"));
const CreateChainPage = lazy(() => import("./pages/CreateChainPage"));
const EditChainPage = lazy(() => import("./pages/EditChainPage"));
const ChainRequestsPage = lazy(() => import("./pages/ChainRequestsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // Data fresh for 5 min (matches backend cache)
      gcTime: 1000 * 60 * 30,         // Keep in cache for 30 min
      refetchOnWindowFocus: false,    // Don't refetch on focus - rely on cache
      refetchOnReconnect: true,       // Refetch when internet reconnects
      refetchOnMount: false,          // Don't refetch on mount - use cached data
      retry: 1,                       // Retry failed requests once
    },
  },
});

// Component to run prefetch and real-time updates on mount
function PrefetchWrapper({ children }: { children: React.ReactNode }) {
  usePrefetch(); // Prefetch all critical data in background
  useRealTimeUpdates(); // Connect to Socket.IO for real-time updates
  return <>{children}</>;
}

// Public investors route that redirects logged-in users to the protected directory
function InvestorsGateway() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CoffeeLoader size="sm" message="Checking your session…" />
      </div>
    );
  }
  if (user) {
    return <Navigate to="/investor-directory" replace />;
  }
  return <Investors />;
}

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrefetchWrapper>
          <PageScrollBackground />
          <FirstOpenLoader />
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <NetworkGuard />
              <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><CoffeeLoader message="Warming up modules…" /></div>}>
              <ErrorBoundary>
              <Routes>
                <Route element={<MainLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<Feed />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/gallery/:category" element={<GalleryView />} />
              {/* Helpful redirects */}
              <Route path="/investor" element={<Navigate to="/investor-directory" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/register" element={<Register />} />
              <Route path="/offline" element={<NetworkIssue />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/u/:username" element={<UserProfile />} />
              <Route path="/search" element={<Search />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/about" element={<About />} />
              <Route path="/investor-plans" element={<InvestorPlans />} />
              <Route path="/investors" element={<InvestorsGateway />} />

              {/* Chains Routes */}
              <Route path="/chains" element={<ChainsListPage />} />
              <Route path="/chains/:slug" element={<ChainDetailPage />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
              <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
              <Route path="/project/:id/edit" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
              <Route path="/intros" element={<ProtectedRoute><Intros /></ProtectedRoute>} />
              <Route path="/investor-dashboard" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
              <Route path="/investor-directory" element={<ProtectedRoute><InvestorDirectory /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><DirectMessages /></ProtectedRoute>} />
              <Route path="/chains/create" element={<ProtectedRoute><CreateChainPage /></ProtectedRoute>} />
              <Route path="/chains/:slug/edit" element={<ProtectedRoute><EditChainPage /></ProtectedRoute>} />
              <Route path="/chains/:slug/requests" element={<ProtectedRoute><ChainRequestsPage /></ProtectedRoute>} />
              <Route path="/chains/:slug/analytics" element={<ProtectedRoute><ChainAnalytics /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin/rescore" element={<AdminRoute><AdminRescore /></AdminRoute>} />

              {/* Validator Route (JWT Protected) */}
              <Route path="/validator" element={<ValidatorRoute><Validator /></ValidatorRoute>} />

              

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
              </Routes>
              </ErrorBoundary>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </PrefetchWrapper>
      </AuthProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
