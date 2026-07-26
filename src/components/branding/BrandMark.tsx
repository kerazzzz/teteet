import { cn } from "@/lib/utils";

type BrandMarkProps = {
	className?: string;
	iconClassName?: string;
};

export function BrandMark({ className, iconClassName }: BrandMarkProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center justify-center rounded-2xl border border-border/55 bg-muted/35 shadow-[0_16px_28px_-24px_rgba(7,11,21,0.55)] backdrop-blur-[1px] transition-transform duration-300 group-hover:-translate-y-0.5",
				className,
			)}
		>
			<img
				src="/Classic%20Red%20Car.svg"
				alt="Titeet logo"
				className={cn("size-[88%]", iconClassName)}
				loading="eager"
				decoding="async"
			/>
		</span>
	);
}
