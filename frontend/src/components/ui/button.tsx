import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold border-2 border-black shadow-[2px_2px_0_#000] outline-none transition-all duration-200 ease-in-out hover:shadow-[3px_3px_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-[2px_2px_0_#000] disabled:translate-x-0 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "border-transparent shadow-none hover:bg-accent hover:text-accent-foreground hover:shadow-none hover:translate-x-0 hover:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline border-transparent shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0",
      },
      size: {
        default: "h-auto px-4 py-2.5",
        sm: "h-auto px-3 py-2 text-xs",
        lg: "h-auto px-8 py-3.5 text-base",
        icon: "h-10 w-10 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
