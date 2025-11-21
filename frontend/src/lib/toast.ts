// This file is a wrapper for sonner to allow for custom branding/configuration
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';
import type { ExternalToast, ToasterProps } from 'sonner';

// Re-export everything
export { sonnerToast as toast, SonnerToaster as Toaster };
export type { ExternalToast, ToasterProps };
