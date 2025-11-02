import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, Shield, Loader2 } from 'lucide-react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  is_verified: boolean;
  has_oxcert: boolean;
}

interface UserSearchSelectProps {
  onSelect: (user: User) => void;
  placeholder?: string;
  className?: string;
}

export function UserSearchSelect({ onSelect, placeholder = 'Search users by name, username, or email...', className }: UserSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom, // For fixed positioning, use viewport coordinates
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Check if click is outside both the wrapper and the dropdown
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when dropdown opens or on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen]);

  // Search users with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/search?q=${encodeURIComponent(query)}&limit=10`
        );

        if (response.data.status === 'success') {
          console.log('Search results:', response.data.data);
          setResults(response.data.data || []);
          setIsOpen(true);
          // Update position immediately after opening
          setTimeout(() => updateDropdownPosition(), 0);
        } else {
          setError('Failed to search users');
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search users');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSelect = (user: User) => {
    onSelect(user);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    // Calculate position right before rendering
    let position = dropdownPosition;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      position = {
        top: rect.bottom, // For fixed positioning, use viewport coordinates
        left: rect.left,
        width: rect.width
      };
      console.log('Dropdown position:', position, 'Results:', results.length);
    }

    const dropdown = (
      <>
        {/* Dropdown results */}
        {results.length > 0 && (
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-gray-900 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-80 overflow-y-auto"
            style={{
              top: `${position.top + 8}px`,
              left: `${position.left}px`,
              width: `${position.width}px`
            }}
          >
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-yellow-100 dark:hover:bg-gray-800 transition-colors border-b-2 border-black last:border-b-0 text-left"
              >
                <Avatar className="h-10 w-10 border-2 border-black">
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                  <AvatarFallback className="bg-primary text-white font-bold">
                    {user.display_name?.[0] || user.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground truncate">
                      {user.display_name || user.username}
                    </span>
                    {user.has_oxcert && (
                      <Shield className="h-4 w-4 text-primary flex-shrink-0" title="Has 0xCert" />
                    )}
                    {user.is_verified && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" title="Verified email" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    @{user.username}
                  </div>
                  {user.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {!isSearching && query.length >= 2 && results.length === 0 && !error && (
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-gray-900 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-center text-sm text-gray-600 dark:text-gray-400"
            style={{
              top: `${position.top + 8}px`,
              left: `${position.left}px`,
              width: `${position.width}px`
            }}
          >
            No users found matching "{query}"
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-red-50 dark:bg-red-950 border-2 border-red-500 rounded-lg shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] p-4 text-center text-sm text-red-700 dark:text-red-400"
            style={{
              top: `${position.top + 8}px`,
              left: `${position.left}px`,
              width: `${position.width}px`
            }}
          >
            {error}
          </div>
        )}
      </>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {renderDropdown()}
    </div>
  );
}
