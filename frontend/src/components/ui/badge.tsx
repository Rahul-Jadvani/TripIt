import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 border-black px-3 py-1.5 text-xs font-bold transition-all duration-200 focus:outline-none shadow-[1px_1px_0_#000]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        primary: "bg-primary text-primary-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        secondary: "bg-secondary text-secondary-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        accent: "bg-accent text-accent-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        success: "bg-success text-success-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        warning: "bg-warning text-warning-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        info: "bg-info text-info-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        destructive: "bg-destructive text-destructive-foreground hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        outline: "text-foreground bg-background hover:shadow-[2px_2px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
