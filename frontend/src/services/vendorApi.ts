/**
 * Vendor API Service
 * Handles vendor authentication and QR verification API calls
 */
import axios from 'axios';
import { API_BASE } from './api';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface VendorRegisterData {
  vendor_name: string;
  organization?: string;
  contact_email: string;
  contact_phone?: string;
  password: string;
  vendor_type: 'hotel' | 'transport' | 'police' | 'hospital' | 'other';
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

export interface VendorLoginData {
  contact_email: string;
  password: string;
}

export interface VendorData {
  id: string;
  vendor_name: string;
  organization: string | null;
  contact_email: string;
  contact_phone: string | null;
  vendor_type: string;
  city: string | null;
  state: string | null;
  country: string;
  address: string | null;
  is_active: boolean;
  total_scans: number;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserVerificationData {
  full_name: string | null;
  verification_status: string;
  sbt_token_id: string | null;
  blood_group: string | null;
  emergency_contact_1_name: string | null;
  emergency_contact_1_phone: string | null;
  emergency_contact_2_name: string | null;
  emergency_contact_2_phone: string | null;
  scan_count: number;
}

export interface ScanHistoryItem {
  full_name: string | null;
  verification_status: string;
  sbt_token_id: string | null;
  blood_group: string | null;
  scan_count: number;
  last_scanned_at: string | null;
}

export interface VendorStats {
  total_scans: number;
  unique_users_verified: number;
  last_scan_at: string | null;
  vendor_since: string | null;
}

// ============================================================================
// Axios Instance with Vendor Token
// ============================================================================

const vendorApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add vendor token to requests
vendorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('vendor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (import.meta.env.DEV) console.log(`[VendorAPI] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Handle responses and 401 errors
vendorApi.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) console.log(`[VendorAPI Response] ${response.status}`, response.data);
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) console.error(`[VendorAPI Error] ${error.response?.status}:`, error.response?.data);

    // Handle 401 - redirect to vendor login
    if (error.response?.status === 401) {
      localStorage.removeItem('vendor_token');
      localStorage.removeItem('vendor_data');
      // Only redirect if we're on a vendor page
      if (window.location.pathname.startsWith('/vendor') && !window.location.pathname.includes('/login')) {
        window.location.href = '/vendor/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Register a new vendor
 */
export async function vendorRegister(data: VendorRegisterData): Promise<{ status: string; message: string; vendor_id?: string }> {
  const response = await vendorApi.post('/vendor/register', data);
  return response.data;
}

/**
 * Login vendor and store token
 */
export async function vendorLogin(data: VendorLoginData): Promise<{ token: string; vendor: VendorData }> {
  const response = await vendorApi.post('/vendor/login', data);
  const { token, vendor } = response.data.data;

  // Store token and vendor data
  localStorage.setItem('vendor_token', token);
  localStorage.setItem('vendor_data', JSON.stringify(vendor));

  return { token, vendor };
}

/**
 * Logout vendor - clear stored data
 */
export function vendorLogout(): void {
  localStorage.removeItem('vendor_token');
  localStorage.removeItem('vendor_data');
}

/**
 * Check if vendor is logged in
 */
export function isVendorLoggedIn(): boolean {
  return !!localStorage.getItem('vendor_token');
}

/**
 * Get stored vendor data from localStorage
 */
export function getStoredVendorData(): VendorData | null {
  const data = localStorage.getItem('vendor_data');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============================================================================
// Profile Functions
// ============================================================================

/**
 * Get vendor profile from API
 */
export async function getVendorProfile(): Promise<VendorData> {
  const response = await vendorApi.get('/vendor/profile');
  const vendor = response.data.data;
  // Update stored data
  localStorage.setItem('vendor_data', JSON.stringify(vendor));
  return vendor;
}

/**
 * Update vendor profile
 */
export async function updateVendorProfile(data: Partial<VendorData>): Promise<VendorData> {
  const response = await vendorApi.put('/vendor/update-profile', data);
  const vendor = response.data.data;
  // Update stored data
  localStorage.setItem('vendor_data', JSON.stringify(vendor));
  return vendor;
}

/**
 * Change vendor password
 */
export async function changeVendorPassword(currentPassword: string, newPassword: string): Promise<{ status: string; message: string }> {
  const response = await vendorApi.post('/vendor/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verify a user's QR token (increments scan count)
 */
export async function verifyUserToken(token: string): Promise<UserVerificationData> {
  const response = await vendorApi.post('/vendor/verify-token', {
    verification_token: token,
  });
  return response.data.data;
}

/**
 * Check if a token exists (without incrementing scan count)
 */
export async function checkToken(token: string): Promise<{ exists: boolean; verification_status: string | null }> {
  const response = await vendorApi.post('/vendor/check-token', {
    verification_token: token,
  });
  return response.data.data;
}

/**
 * Get vendor's scan history
 */
export async function getScanHistory(limit: number = 20, offset: number = 0): Promise<{
  items: ScanHistoryItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}> {
  const response = await vendorApi.get('/vendor/scan-history', {
    params: { limit, offset },
  });
  return response.data.data;
}

/**
 * Get vendor statistics
 */
export async function getVendorStats(): Promise<VendorStats> {
  const response = await vendorApi.get('/vendor/stats');
  return response.data.data;
}

// ============================================================================
// Export default instance for custom calls
// ============================================================================

export default vendorApi;
