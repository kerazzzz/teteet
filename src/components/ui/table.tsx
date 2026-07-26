import type * as React from "react";

import { cn } from "@/lib/utils";

export function Table({
	className,
	...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
	return (
		<div className="relative w-full overflow-auto rounded-2xl border border-border/70 bg-card/55 p-1 backdrop-blur-sm">
			<table
				className={cn("w-full caption-bottom text-sm", className)}
				{...props}
			/>
		</div>
	);
}

export function TableHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
	return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({
	className,
	...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
	return (
		<tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
	);
}

export function TableRow({
	className,
	...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
	return (
		<tr
			className={cn(
				"border-b border-border/60 transition-colors hover:bg-muted/45 data-[state=selected]:bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

export function TableHead({
	className,
	...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
	return (
		<th
			className={cn(
				"h-10 px-3 text-left align-middle text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase",
				className,
			)}
			{...props}
		/>
	);
}

export function TableCell({
	className,
	...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
	return <td className={cn("p-3 align-middle", className)} {...props} />;
}
