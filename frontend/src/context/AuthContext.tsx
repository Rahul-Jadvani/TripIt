import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { authService } from '@/services/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  // Helper to transform backend user data
  const transformUser = (backendUser: any): User => {
    

    const transformed = {
      id: backendUser.id,
      username: backendUser.username,
      email: backendUser.email,
      displayName: backendUser.display_name,
      display_name: backendUser.display_name,
      avatar: backendUser.avatar_url,
      avatar_url: backendUser.avatar_url,
      bio: backendUser.bio,
      isVerified: backendUser.email_verified || false,
      email_verified: backendUser.email_verified || false,
      isAdmin: backendUser.is_admin || false,
      is_admin: backendUser.is_admin || false,
      is_investor: backendUser.is_investor || false,
      is_validator: backendUser.is_validator || false,
      walletAddress: backendUser.wallet_address,
      wallet_address: backendUser.wallet_address,
      full_wallet_address: backendUser.full_wallet_address,
      hasOxcert: backendUser.has_oxcert || false,
      has_oxcert: backendUser.has_oxcert || false,
      oxcert_tx_hash: backendUser.oxcert_tx_hash,
      oxcert_token_id: backendUser.oxcert_token_id,
      oxcert_metadata: backendUser.oxcert_metadata,
      github_username: backendUser.github_username,
      github_connected: backendUser.github_connected || false,
      karma: backendUser.karma || 0,
      // Blockchain Identity Fields (TripIt SBT)
      profile_hash: backendUser.profile_hash,
      wallet_bound_at: backendUser.wallet_bound_at,
      sbt_id: backendUser.sbt_id,
      sbt_status: backendUser.sbt_status,
      sbt_verified_date: backendUser.sbt_verified_date,
      sbt_blockchain_hash: backendUser.sbt_blockchain_hash,
      reputation_score: backendUser.reputation_score || 0,
      trip_token_balance: backendUser.trip_token_balance || 0,
      createdAt: backendUser.created_at,
      created_at: backendUser.created_at,
      updatedAt: backendUser.updated_at,
      updated_at: backendUser.updated_at,
    };

    

    return transformed;
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          const response = await authService.getCurrentUser();
          setUser(transformUser(response.data.data));
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    
    const response = await authService.login(email, password);
    

    const { tokens, user: newUser } = response.data.data;
    

    localStorage.setItem('token', tokens.access);
    if (tokens.refresh) {
      localStorage.setItem('refreshToken', tokens.refresh);
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    setToken(tokens.access);
    setUser(transformUser(newUser));
    
  };

  const register = async (email: string, password: string, username: string) => {
    
    const response = await authService.register(email, username, password);
    

    const { tokens, user: newUser } = response.data.data;
    

    localStorage.setItem('token', tokens.access);
    if (tokens.refresh) {
      localStorage.setItem('refreshToken', tokens.refresh);
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    setToken(tokens.access);
    setUser(transformUser(newUser));
    
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        const response = await authService.getCurrentUser();
        setUser(transformUser(response.data.data));
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to refresh user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


