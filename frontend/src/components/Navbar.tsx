import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TrendingUp, Trophy, Search, Plus, LogOut, User, Settings, LayoutDashboard, Send, Menu, X, MessageSquare, Building2, Sparkles, Shield, Link2 } from 'lucide-react';
import { ConnectWallet } from '@/components/ConnectWallet';
import { NotificationBell } from '@/components/NotificationBell';
import { Badge } from '@/components/ui/badge';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { memo, useCallback, useState } from 'react';

export const Navbar = memo(function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { unreadMessagesCount, pendingIntrosCount } = useNotificationCounts();

  // Prefetch route modules on hover/focus to speed up navigation
  const prefetchRoute = useCallback((path: string) => {
    switch (path) {
      case '/':
      case '/feed':
        import('@/pages/Feed');
        break;
      case '/leaderboard':
        import('@/pages/Leaderboard');
        break;
      case '/chains':
        import('@/pages/ChainsListPage');
        break;
      case '/search':
        import('@/pages/Search');
        break;
      case '/investors':
        import('@/pages/Investors');
        break;
      case '/publish':
        import('@/pages/Publish');
        break;
      case '/intros':
        import('@/pages/Intros');
        break;
      case '/messages':
        import('@/pages/DirectMessages');
        break;
      case '/login':
        import('@/pages/Login');
        break;
      case '/register':
        import('@/pages/Register');
        break;
      default:
        break;
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-50 w-full border-b-4 border-black bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" onMouseEnter={() => prefetchRoute('/')} onFocus={() => prefetchRoute('/')} className="flex items-center gap-2 transition-quick hover:opacity-80 flex-shrink-0">
            <img src="/logo.png" alt="ZERO" className="h-8 w-8" loading="lazy" />
            <span className="text-xl font-black text-primary" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>
              ZER0
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" onMouseEnter={() => prefetchRoute('/')} onFocus={() => prefetchRoute('/')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <TrendingUp className="h-4 w-4" />
              <span>Feed</span>
            </Link>
            <Link to="/leaderboard" onMouseEnter={() => prefetchRoute('/leaderboard')} onFocus={() => prefetchRoute('/leaderboard')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <Trophy className="h-4 w-4" />
              <span>Leaderboard</span>
            </Link>
            <Link to="/chains" onMouseEnter={() => prefetchRoute('/chains')} onFocus={() => prefetchRoute('/chains')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <Link2 className="h-4 w-4" />
              <span>Chains</span>
            </Link>
            {user && (
              <Link to="/investor-directory" onMouseEnter={() => prefetchRoute('/investor-directory')} onFocus={() => prefetchRoute('/investor-directory')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
                <Building2 className="h-4 w-4" />
                <span>Investors</span>
              </Link>
            )}
            <Link to="/search" onMouseEnter={() => prefetchRoute('/search')} onFocus={() => prefetchRoute('/search')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <>
                {/* Wallet Connection */}
                <div className="hidden lg:flex">
                  <ConnectWallet />
                </div>

                {/* Publish Button */}
                <Link
                  to="/publish"
                  aria-label="Publish a new project"
                  title="Publish"
                  onMouseEnter={() => prefetchRoute('/publish')}
                  onFocus={() => prefetchRoute('/publish')}
                  className="btn-primary hidden md:inline-flex gap-2 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Publish</span>
                </Link>

                {/* Intros */}
                <Link
                  to="/intros"
                  aria-label="Open intros"
                  title="Intros"
                  onMouseEnter={() => prefetchRoute('/intros')}
                  onFocus={() => prefetchRoute('/intros')}
                  className="btn-secondary hidden sm:inline-flex gap-2 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background relative"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Intros</span>
                  {pendingIntrosCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-3 -right-3 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold z-10"
                    >
                      {pendingIntrosCount > 9 ? '9+' : pendingIntrosCount}
                    </Badge>
                  )}
                </Link>

                {/* Messages */}
                <Link
                  to="/messages"
                  aria-label="Open messages"
                  title="Messages"
                  onMouseEnter={() => prefetchRoute('/messages')}
                  onFocus={() => prefetchRoute('/messages')}
                  className="btn-secondary hidden sm:inline-flex gap-2 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background relative"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Messages</span>
                  {unreadMessagesCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-3 -right-3 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold z-10"
                    >
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </Link>

                {/* Notifications */}
                <NotificationBell />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Open user menu"
                      title="User menu"
                      className="flex items-center gap-2 rounded-full transition-quick hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <Avatar className="h-8 w-8 border-3 border-primary">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback className="bg-primary text-black font-bold text-xs">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-3 py-3 space-y-1">
                      <p className="text-sm font-bold text-foreground">{user.displayName || user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer flex items-center gap-2 font-medium">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer flex items-center gap-2 font-medium bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-l-2 border-purple-600 hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-500 transition-all">
                          <Shield className="h-4 w-4 text-purple-600" />
                          <span className="text-purple-600 font-bold">Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {user.is_validator && (
                      <DropdownMenuItem asChild>
                        <Link to="/validator" className="cursor-pointer flex items-center gap-2 font-medium bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-l-2 border-blue-600 hover:from-blue-500/20 hover:to-cyan-500/20 hover:border-blue-500 transition-all">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 font-bold">Validator Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/my-projects" className="cursor-pointer flex items-center gap-2 font-medium">
                        <Plus className="h-4 w-4" />
                        <span>My Projects</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/intros" className="cursor-pointer flex items-center gap-2 font-medium">
                        <Send className="h-4 w-4" />
                        <span>Intro Requests</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/messages" className="cursor-pointer flex items-center gap-2 font-medium">
                        <MessageSquare className="h-4 w-4" />
                        <span>Messages</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.is_investor ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/investor-dashboard" className="cursor-pointer flex items-center gap-2 font-medium bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-l-2 border-yellow-600 hover:from-yellow-500/20 hover:to-amber-500/20 hover:border-yellow-500 transition-all">
                            <Building2 className="h-4 w-4 text-white group-hover:text-white" />
                            <span className="text-white font-bold group-hover:text-white">Investor Dashboard</span>
                            <Sparkles className="h-3 w-3 text-white ml-auto group-hover:text-white" />
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/investor-plans" className="cursor-pointer flex items-center gap-2 font-medium">
                            <Settings className="h-4 w-4" />
                            <span>Edit Investor Profile</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem asChild>
                        <Link to="/investor-plans" className="cursor-pointer flex items-center gap-2 font-medium bg-gradient-to-r from-primary/10 to-accent/10 border-l-2 border-primary hover:from-primary/20 hover:to-accent/20 transition-all">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-primary font-bold">Become an Investor</span>
                          <Sparkles className="h-3 w-3 text-primary ml-auto animate-pulse" />
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={`/u/${user.username}`} className="cursor-pointer flex items-center gap-2 font-medium">
                        <User className="h-4 w-4" />
                        <span>Public Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer flex items-center gap-2 font-medium">
                        <Settings className="h-4 w-4" />
                        <span>Edit Profile & Verify Wallet</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive flex items-center gap-2 font-medium">
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  aria-label="Login"
                  title="Login"
                  onMouseEnter={() => prefetchRoute('/login')}
                  onFocus={() => prefetchRoute('/login')}
                  className="btn-secondary px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  aria-label="Sign up"
                  title="Sign up"
                  onMouseEnter={() => prefetchRoute('/register')}
                  onFocus={() => prefetchRoute('/register')}
                  className="btn-primary px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});
