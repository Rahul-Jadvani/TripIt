import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { AuthProvider } from "./context/AuthContext";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute, AdminRoute, ValidatorRoute } from "./components/ProtectedRoute";
import { PageScrollBackground } from "./components/PageScrollBackground";
import { wagmiConfig } from "./config/wagmi";
import { usePrefetch } from "./hooks/usePrefetch";
import { useRealTimeUpdates } from "./hooks/useRealTimeUpdates";

// Pages
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProjectDetail from "./pages/ProjectDetail";
import UserProfile from "./pages/UserProfile";
import Search from "./pages/Search";
import Leaderboard from "./pages/Leaderboard";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import MyProjects from "./pages/MyProjects";
import Publish from "./pages/Publish";
import EditProject from "./pages/EditProject";
import Intros from "./pages/Intros";
import Admin from "./pages/Admin";
import AdminValidator from "./pages/AdminValidator";
import Validator from "./pages/Validator";
import InvestorPlans from "./pages/InvestorPlans";
import InvestorDashboard from "./pages/InvestorDashboard";
import InvestorDirectory from "./pages/InvestorDirectory";
import Investors from "./pages/Investors";
import DirectMessages from "./pages/DirectMessages";
import GalleryView from "./pages/GalleryView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // Data fresh for 5 min (matches backend cache)
      gcTime: 1000 * 60 * 30,         // Keep in cache for 30 min
      refetchOnWindowFocus: true,     // Refetch when tab regains focus (fresh data when user returns)
      refetchOnReconnect: true,       // Refetch when internet reconnects
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
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <PrefetchWrapper>
        <AuthProvider>
          <PageScrollBackground />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route element={<MainLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<Feed />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/gallery/:category" element={<GalleryView />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/u/:username" element={<UserProfile />} />
              <Route path="/search" element={<Search />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/about" element={<About />} />
              <Route path="/investor-plans" element={<InvestorPlans />} />
              <Route path="/investors" element={<Investors />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
              <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
              <Route path="/project/:id/edit" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
              <Route path="/edit-project/:id" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
              <Route path="/intros" element={<ProtectedRoute><Intros /></ProtectedRoute>} />
              <Route path="/investor-dashboard" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
              <Route path="/investors" element={<ProtectedRoute><InvestorDirectory /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><DirectMessages /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

              {/* Validator Route (JWT Protected) */}
              <Route path="/validator" element={<ValidatorRoute><Validator /></ValidatorRoute>} />

              {/* Legacy Admin+Validator Route (Deprecated - will be removed) */}
              <Route path="/admin+validator" element={<AdminValidator />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </PrefetchWrapper>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
