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
import { TrendingUp, Trophy, Search, Plus, LogOut, User, Settings, LayoutDashboard, Send, Menu, X, MessageSquare, Building2, Sparkles, Shield, Link2, Image } from 'lucide-react';
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
      case '/layerz':
        import('@/pages/ChainsListPage');
        break;
      case '/explore':
        import('@/pages/Gallery');
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
          <Link to="/" onMouseEnter={() => prefetchRoute('/')} onFocus={() => prefetchRoute('/')} className="transition-quick hover:opacity-80 flex-shrink-0">
            <img src="/logo.svg" alt="ZERO" className="h-20 w-20" loading="lazy" />
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
            <Link to="/layerz" onMouseEnter={() => prefetchRoute('/layerz')} onFocus={() => prefetchRoute('/layerz')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <Link2 className="h-4 w-4" />
              <span>Layerz</span>
            </Link>
            {user && (
              <Link to="/investor-directory" onMouseEnter={() => prefetchRoute('/investor-directory')} onFocus={() => prefetchRoute('/investor-directory')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
                <Building2 className="h-4 w-4" />
                <span>Investors</span>
              </Link>
            )}
            <Link to="/explore" onMouseEnter={() => prefetchRoute('/explore')} onFocus={() => prefetchRoute('/explore')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <Image className="h-4 w-4" />
              <span>Explore</span>
            </Link>
            <Link to="/search" onMouseEnter={() => prefetchRoute('/search')} onFocus={() => prefetchRoute('/search')} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {user ? (
              <>
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
                <div className="relative inline-flex">
                  <Link
                    to="/intros"
                    aria-label="Open intros"
                    title="Intros"
                    onMouseEnter={() => prefetchRoute('/intros')}
                    onFocus={() => prefetchRoute('/intros')}
                    className="btn-secondary hidden sm:inline-flex gap-2 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Intros</span>
                  </Link>
                  {pendingIntrosCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2.5 -right-2.5 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                    >
                      {pendingIntrosCount > 9 ? '9+' : pendingIntrosCount}
                    </Badge>
                  )}
                </div>

                {/* Messages */}
                <div className="relative inline-flex">
                  <Link
                    to="/messages"
                    aria-label="Open messages"
                    title="Messages"
                    onMouseEnter={() => prefetchRoute('/messages')}
                    onFocus={() => prefetchRoute('/messages')}
                    className="btn-secondary hidden sm:inline-flex gap-2 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Messages</span>
                  </Link>
                  {unreadMessagesCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2.5 -right-2.5 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                    >
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </div>

                {/* Notifications */}
                <NotificationBell />

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle mobile menu"
                  aria-expanded={mobileMenuOpen}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

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
                  <DropdownMenuContent align="end" className="min-w-[320px] rounded-2xl border-4 border-black p-0 overflow-hidden shadow-[10px_10px_0_0_#000]">
                    {/* Header */}
                    <div className="px-4 py-3 bg-secondary/60 border-b-2 border-black flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback className="text-xs font-black bg-primary text-black">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-black truncate">{user.displayName || user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="p-2">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer flex items-center gap-2 font-medium">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer flex items-center gap-2 font-medium rounded-xl px-2 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:bg-secondary/60 border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0_0_#000]">
                          <Shield className="h-4 w-4 text-purple-600" />
                          <span className="font-bold text-foreground">Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {user.is_validator && (
                      <DropdownMenuItem asChild>
                        <Link to="/validator" className="cursor-pointer flex items-center gap-2 font-medium rounded-xl px-2 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:bg-secondary/60 border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0_0_#000]">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-foreground">Validator Dashboard</span>
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
                    <DropdownMenuSeparator className="my-2" />
                    {user.is_investor ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/investor-dashboard" className="cursor-pointer flex items-center gap-2 font-medium rounded-xl px-2 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:bg-secondary/60 border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0_0_#000]">
                            <Building2 className="h-4 w-4 text-white group-hover:text-white" />
                            <span className="font-bold text-foreground">Investor Dashboard</span>
                            <Sparkles className="h-3 w-3 text-amber-600 ml-auto" />
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
                        <Link to="/investor-plans" className="cursor-pointer flex items-center gap-2 font-medium rounded-xl px-2 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:bg-secondary/60 border-2 border-transparent hover:border-black hover:shadow-[4px_4px_0_0_#000]">
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
                        <span>Edit Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive flex items-center gap-2 font-medium">
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Navigation Drawer */}
                {mobileMenuOpen && (
                  <div className="absolute top-16 left-0 right-0 md:hidden bg-background border-b-4 border-black shadow-lg z-40">
                    <nav className="flex flex-col p-4 gap-2">
                      <Link
                        to="/"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          prefetchRoute('/');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick"
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span>Feed</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          prefetchRoute('/leaderboard');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick"
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Leaderboard</span>
                      </Link>
                      <Link
                        to="/layerz"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          prefetchRoute('/layerz');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick"
                      >
                        <Link2 className="h-4 w-4" />
                        <span>Layerz</span>
                      </Link>
                      {user && (
                        <Link
                          to="/investor-directory"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            prefetchRoute('/investor-directory');
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick"
                        >
                          <Building2 className="h-4 w-4" />
                          <span>Investors</span>
                        </Link>
                      )}
                      <Link
                        to="/explore"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          prefetchRoute('/explore');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick"
                      >
                        <Image className="h-4 w-4" />
                        <span>Explore</span>
                      </Link>
                      <Link
                        to="/search"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          prefetchRoute('/search');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-quick"
                      >
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                      </Link>
                      <Link
                        to="/publish"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          prefetchRoute('/publish');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold btn-primary transition-quick"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Publish</span>
                      </Link>
                    </nav>
                  </div>
                )}
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

