import { cn } from "@/lib/utils";

type PageShellTone =
	| "market"
	| "compare"
	| "seller"
	| "admin"
	| "finance"
	| "messages"
	| "news"
	| "account";

function inferShellTone(title: string): PageShellTone {
	const normalizedTitle = title.toLowerCase();

	if (
		normalizedTitle.includes("compare") ||
		normalizedTitle.includes("versus")
	) {
		return "compare";
	}

	if (
		normalizedTitle.includes("seller") ||
		normalizedTitle.includes("inquiries")
	) {
		return "seller";
	}

	if (normalizedTitle.includes("admin") || normalizedTitle.includes("review")) {
		return "admin";
	}

	if (
		normalizedTitle.includes("transaction") ||
		normalizedTitle.includes("payment") ||
		normalizedTitle.includes("financing")
	) {
		return "finance";
	}

	if (normalizedTitle.includes("message") || normalizedTitle.includes("chat")) {
		return "messages";
	}

	if (normalizedTitle.includes("news")) {
		return "news";
	}

	if (
		normalizedTitle.includes("profile") ||
		normalizedTitle.includes("sign in") ||
		normalizedTitle.includes("sign up")
	) {
		return "account";
	}

	return "market";
}

function shellLabelForTone(tone: PageShellTone): string {
	switch (tone) {
		case "compare":
			return "COMPARISON STUDIO";
		case "seller":
			return "SELLER WORKSPACE";
		case "admin":
			return "ADMIN CONTROL ROOM";
		case "finance":
			return "TRANSACTION DESK";
		case "messages":
			return "CONVERSATION HUB";
		case "news":
			return "MARKET EDITORIAL";
		case "account":
			return "ACCOUNT ACCESS";
		default:
			return "TITEET MARKETPLACE";
	}
}

export function PageShell({
	title,
	description,
	children,
	className,
	tone,
	headerClassName,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
	tone?: PageShellTone;
	headerClassName?: string;
}) {
	const resolvedTone = tone ?? inferShellTone(title);
	const shellLabel = shellLabelForTone(resolvedTone);

	return (
		<main
			className={cn(
				"page-shell page-shell-enter mx-auto w-full max-w-7xl space-y-8 px-4 pb-12 pt-7 sm:px-6 sm:pt-8",
				className,
			)}
			data-shell-tone={resolvedTone}
		>
			<header
				className={cn(
					"page-shell-header relative overflow-hidden rounded-[1.9rem] border border-border/70 bg-card/65 px-6 py-7 shadow-[0_30px_70px_-52px_rgba(7,14,31,0.9)] backdrop-blur-xl sm:px-8 sm:py-8",
					headerClassName,
				)}
			>
				<p className="relative text-[0.63rem] font-semibold uppercase tracking-[0.34em] text-primary/80">
					{shellLabel}
				</p>
				<h1 className="relative mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.8rem]">
					{title}
				</h1>
				{description ? (
					<p className="relative mt-4 max-w-3xl text-sm text-muted-foreground sm:text-base">
						{description}
					</p>
				) : null}
			</header>
			{children}
		</main>
	);
}
