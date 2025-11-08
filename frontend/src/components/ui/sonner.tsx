import { toast } from "@/lib/toast";

// Local shim Toaster: styling handled by NotificationCenterHost globally.
// Keep API compatibility for existing imports.
const Toaster = (_props: any) => null;

export { Toaster, toast };
