// This file is a wrapper for sonner to allow for custom branding/configuration
// Import directly from the package to avoid circular dependency with the vite alias
import { toast as sonnerToast, Toaster as SonnerToaster } from '../../node_modules/sonner/dist/index.mjs';
import type { ExternalToast, ToasterProps } from '../../node_modules/sonner/dist/index.mjs';

// Re-export everything
export { sonnerToast as toast, SonnerToaster as Toaster };
export type { ExternalToast, ToasterProps };
