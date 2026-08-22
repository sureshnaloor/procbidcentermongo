import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
        outline: "text-foreground border-input bg-background",
        success: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
        warning: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const dotColor =
    variant === "success"
      ? "bg-emerald-500"
      : variant === "warning"
      ? "bg-amber-500"
      : variant === "destructive"
      ? "bg-destructive"
      : variant === "secondary"
      ? "bg-muted-foreground"
      : "bg-primary";

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      <span className={cn("status-dot", dotColor)} />
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
