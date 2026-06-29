import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        rating: "bg-rating/10 text-rating",
        neutral: "bg-surface-2 text-muted",
        primary: "bg-primary/10 text-primary",
        accent: "bg-accent/10 text-accent-600",
        navy: "bg-navy text-white",
        success: "bg-success/10 text-success",
        warning: "bg-amber-100 text-amber-700",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
