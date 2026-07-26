import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-wide transition-all duration-300 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-[0_16px_36px_-20px_rgba(7,10,22,0.9)] hover:-translate-y-0.5 hover:brightness-110",
				secondary:
					"border border-border/60 bg-secondary/80 text-secondary-foreground shadow-[0_14px_30px_-24px_rgba(7,12,22,0.9)] hover:bg-secondary",
				outline:
					"border border-input/80 bg-background/70 shadow-[0_12px_24px_-24px_rgba(6,10,22,0.95)] backdrop-blur-sm hover:bg-accent/70 hover:text-accent-foreground",
				ghost: "hover:bg-accent/65 hover:text-accent-foreground",
				destructive:
					"bg-destructive text-destructive-foreground shadow-[0_16px_34px_-22px_rgba(124,23,7,0.9)] hover:brightness-110",
			},
			size: {
				default: "h-10 px-5",
				sm: "h-8 px-3.5 text-xs",
				lg: "h-11 px-7 text-sm",
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
		VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<button
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
