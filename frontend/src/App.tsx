import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute, AdminRoute, ValidatorRoute } from "./components/ProtectedRoute";
import { PageScrollBackground } from "./components/PageScrollBackground";
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
const About = lazy(() => import("./pages/About"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const MyProjects = lazy(() => import("./pages/MyProjects"));
const Publish = lazy(() => import("./pages/Publish"));
const EditProject = lazy(() => import("./pages/EditProject"));
const Intros = lazy(() => import("./pages/Intros"));
const Admin = lazy(() => import("./pages/Admin"));
const DirectMessages = lazy(() => import("./pages/DirectMessages"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NetworkIssue = lazy(() => import("./pages/NetworkIssue"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const CommunitiesListPage = lazy(() => import("./pages/CommunitiesListPage"));
const CommunityDetailPage = lazy(() => import("./pages/CommunityDetailPage"));
const CreateCommunityPage = lazy(() => import("./pages/CreateCommunityPage"));
const EditCommunityPage = lazy(() => import("./pages/EditCommunityPage"));
const SnapCamera = lazy(() => import("./pages/SnapCamera"));
const TravelGroupsListPage = lazy(() => import("./pages/TravelGroupsListPage"));
const TravelGroupDetailPage = lazy(() => import("./pages/TravelGroupDetailPage"));
const CreateTravelGroupPage = lazy(() => import("./pages/CreateTravelGroupPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,      // Data fresh for 10 min (increased for better caching)
      gcTime: 1000 * 60 * 30,         // Keep in cache for 30 min after becoming inactive
      refetchOnWindowFocus: false,    // Don't refetch on focus - rely on cache
      refetchOnReconnect: false,      // Don't refetch on reconnect - rely on cache
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


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PrefetchWrapper>
        <PageScrollBackground />
        <FirstOpenLoader />
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <NetworkGuard />
            <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><CoffeeLoader message="Warming up modules…" /></div>}>
            <ErrorBoundary>
            <Routes>
                <Route element={<MainLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<Feed />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/register" element={<Register />} />
              <Route path="/offline" element={<NetworkIssue />} />
              <Route path="/itinerary/:id" element={<ProjectDetail />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/u/:username" element={<UserProfile />} />
              <Route path="/search" element={<Search />} />
              <Route path="/about" element={<About />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/communities" element={<CommunitiesListPage />} />
              <Route path="/community/:slug" element={<CommunityDetailPage />} />
              <Route path="/community/create" element={<ProtectedRoute><CreateCommunityPage /></ProtectedRoute>} />
              <Route path="/community/:slug/edit" element={<ProtectedRoute><EditCommunityPage /></ProtectedRoute>} />

              {/* Travel Groups / Layerz Routes */}
              <Route path="/layerz" element={<TravelGroupsListPage />} />
              <Route path="/groups" element={<TravelGroupsListPage />} />
              <Route path="/layerz/:id" element={<TravelGroupDetailPage />} />
              <Route path="/groups/:id" element={<TravelGroupDetailPage />} />
              <Route path="/layerz/create" element={<ProtectedRoute><CreateTravelGroupPage /></ProtectedRoute>} />
              <Route path="/groups/create" element={<ProtectedRoute><CreateTravelGroupPage /></ProtectedRoute>} />

              {/* Snap Routes */}
              <Route path="/snap/camera" element={<ProtectedRoute><SnapCamera /></ProtectedRoute>} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
              <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
              <Route path="/itinerary/:id/edit" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
              <Route path="/project/:id/edit" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
              <Route path="/intros" element={<ProtectedRoute><Intros /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><DirectMessages /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

              {/* Validator Routes - redirect to dashboard */}
              <Route path="/validator" element={<ValidatorRoute><Dashboard /></ValidatorRoute>} />



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
);

export default App;

