import type * as React from "react";

import { cn } from "@/lib/utils";

export function Select({
	className,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className={cn(
				"flex h-10 w-full rounded-xl border border-input/80 bg-background/70 px-3 py-2 text-sm font-medium shadow-[0_16px_32px_-30px_rgba(7,12,22,1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}
