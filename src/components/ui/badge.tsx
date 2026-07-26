import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] transition-colors",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary/95 text-primary-foreground shadow-[0_14px_24px_-22px_rgba(10,15,27,0.9)]",
				secondary:
					"border-transparent bg-secondary/85 text-secondary-foreground",
				outline: "border-border/80 bg-background/60 text-foreground",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}
