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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  TrendingUp,
  Trophy,
  Search,
  Plus,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
  Send,
  Menu,
  MessageSquare,
  Image,
  Sparkles,
  CheckCircle,
  FileText,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { TripBalance } from '@/components/TripBalance';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { memo, useCallback, useState } from 'react';

export const Navbar = memo(function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadMessagesCount, pendingIntrosCount } = useNotificationCounts();

  // Prefetch route modules on hover/focus to speed up navigation
  const prefetchRoute = useCallback((path: string) => {
    switch (path) {
      case '/':
      case '/feed':
        import('@/pages/Feed');
        break;
      case '/search':
        import('@/pages/Search');
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
      case '/leaderboard':
        import('@/pages/Leaderboard');
        break;
      case '/communities':
        import('@/pages/CommunitiesListPage');
        break;
      case '/groups':
      case '/layerz':
        import('@/pages/TravelGroupsListPage');
        break;
      case '/blockchain-identity':
        import('@/pages/BlockchainIdentity');
        break;
      case '/remix':
        import('@/pages/RemixPage');
        break;
      default:
        break;
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setMenuOpen(false);
  }, [logout, navigate]);

  const handleMenuItemClick = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b-4 border-black bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Logo & Hamburger Menu */}
          <div className="flex items-center">
            {/* Hamburger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-12 w-12 rounded-full border border-border bg-secondary/60 hover:bg-secondary flex items-center justify-center"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Explore TripIt features</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col items-center gap-3 pt-4">
                  <Link
                    to="/"
                    onClick={handleMenuItemClick}
                    className="flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-secondary"
                  >
                    <img src="/logo.svg" alt="TripIt logo" className="h-16 w-16" loading="lazy" />
                    <div className="text-left">
                      <p className="text-lg font-semibold leading-tight">TripIt</p>
                      <p className="text-xs text-muted-foreground">Trusted travel identity</p>
                    </div>
                  </Link>
                </div>
                <Separator className="my-4" />
                <div className="flex flex-col gap-4">
                  {/* Main Menu Items */}
                  <div className="space-y-1">
                    <Link
                      to="/"
                      onClick={handleMenuItemClick}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Discover Itineraries</span>
                    </Link>
                    <Link
                      to="/search"
                      onClick={handleMenuItemClick}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      <Search className="h-4 w-4" />
                      <span>Search</span>
                    </Link>
                  </div>

                  <Separator />

                  {/* Community Features */}
                  <div className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Community
                    </p>
                    <Link
                      to="/communities"
                      onClick={handleMenuItemClick}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Caravans</span>
                    </Link>
                    <Link
                      to="/leaderboard"
                      onClick={handleMenuItemClick}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>Leaderboard</span>
                    </Link>
                  </div>

                  <Separator />

                  {/* Features */}
                  <div className="space-y-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Features
                    </p>
                    {user && (
                      <Link
                        to="/remix"
                        onClick={handleMenuItemClick}
                        onMouseEnter={() => prefetchRoute('/remix')}
                        onFocus={() => prefetchRoute('/remix')}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors bg-primary/10 border-2 border-primary/30"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-primary font-semibold">AI Remix</span>
                        {/* <Badge variant="secondary" className="ml-auto text-xs">New</Badge> */}
                      </Link>
                    )}
                    <Link
                      to="/snap/camera"
                      onClick={handleMenuItemClick}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      <Image className="h-4 w-4" />
                      <span>Snaps (Stories)</span>
                    </Link>
                  </div>

                  {user && (
                    <>
                      <Separator />

                      {/* Blockchain Identity */}
                      <div className="space-y-1">
                        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Blockchain
                        </p>
                        <Link
                          to="/blockchain-identity"
                          onClick={handleMenuItemClick}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
                        >
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span>Blockchain Identity</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            {user ? (
              <>
                {/* Publish Button */}
                <Link
                  to="/publish"
                  onMouseEnter={() => prefetchRoute('/publish')}
                  onFocus={() => prefetchRoute('/publish')}
                  className="btn-primary inline-flex gap-2 px-2 sm:px-3 py-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Publish</span>
                </Link>

                {/* TRIP Balance */}
                <TripBalance variant="navbar" />

                {/* Intros */}
                <div className="relative inline-flex">
                  <Link
                    to="/intros"
                    aria-label="Open intros"
                    title="Intros"
                    onMouseEnter={() => prefetchRoute('/intros')}
                    onFocus={() => prefetchRoute('/intros')}
                    className="btn-secondary inline-flex gap-2 px-2 sm:px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Intros</span>
                  </Link>
                  {pendingIntrosCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
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
                    className="btn-secondary inline-flex gap-2 px-2 sm:px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Messages</span>
                  </Link>
                  {unreadMessagesCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                    >
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </div>

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={user.avatar_url || user.avatar || user.profilePictureUrl || user.profile_picture_url || undefined}
                          alt={user.username || 'User'}
                        />
                        <AvatarFallback>
                          {(user.username || user.email || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.username || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/u/${user.username}`} className="cursor-pointer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>Public Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Edit Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-projects" className="cursor-pointer">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>My Itineraries</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/blockchain-identity" className="cursor-pointer">
                        <Sparkles className="mr-2 h-4 w-4 text-primary" />
                        <span>Blockchain Identity</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.is_validator && (
                      <DropdownMenuItem asChild>
                        <Link to="/validator" className="cursor-pointer">
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          <span>Validator Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {user.is_admin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <ShieldCheck className="mr-2 h-4 w-4 text-red-500" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="text-sm hidden sm:inline-flex"
                  onMouseEnter={() => prefetchRoute('/login')}
                  onFocus={() => prefetchRoute('/login')}
                >
                  <Link to="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  className="btn-primary text-sm"
                  onMouseEnter={() => prefetchRoute('/register')}
                  onFocus={() => prefetchRoute('/register')}
                >
                  <Link to="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});
