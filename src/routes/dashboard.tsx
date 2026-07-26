import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import {
	ArrowRightLeft,
	Clock3,
	MessageSquareMore,
	Search,
	Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart,
	Line,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nprCompact } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

type TransactionLike = {
	amountNpr: number;
	createdAt: number;
	status: string;
};

type ChatLike = {
	lastMessageAt: number;
	unreadCount: number;
	partner?: {
		name?: string | null;
	} | null;
};

type SearchLike = {
	createdAt: number;
	filters: string;
	query: string;
};

type TrendDirection = "up" | "down" | "flat";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const COMPLETED_TRANSACTION_STATUSES = new Set([
	"paid",
	"document_generated",
	"completed",
]);

const TRANSACTION_STATUS_META = [
	{ key: "completed", label: "Completed", color: "var(--color-chart-3)" },
	{
		key: "document_generated",
		label: "Docs Generated",
		color: "var(--color-chart-2)",
	},
	{ key: "paid", label: "Paid", color: "var(--color-chart-1)" },
	{
		key: "payment_pending",
		label: "Payment Pending",
		color: "var(--color-chart-4)",
	},
	{ key: "initiated", label: "Initiated", color: "var(--color-chart-5)" },
	{ key: "cancelled", label: "Cancelled", color: "var(--color-muted-foreground)" },
	{ key: "failed", label: "Failed", color: "var(--color-destructive)" },
] as const;

function DashboardPage() {
	return (
		<RequireAuth>
			<DashboardContent />
		</RequireAuth>
	);
}

function DashboardContent() {
	const transactions = useQuery(api.transactions.listMyTransactions, {
		limit: 60,
	});
	const chats = useQuery(api.chats.listMyChats);
	const searches = useQuery(api.search.getRecentSearches, { limit: 60 });
	const isLoading =
		transactions === undefined || chats === undefined || searches === undefined;

	const insights = useMemo(() => {
		const transactionRows = (transactions ?? []) as TransactionLike[];
		const chatRows = (chats ?? []) as ChatLike[];
		const searchRows = (searches ?? []) as SearchLike[];

		const weeklyActivity = buildWeeklyActivity(
			transactionRows,
			chatRows,
			searchRows,
			8,
		);
		const currentWeek = weeklyActivity.at(-1);
		const previousWeek = weeklyActivity.at(-2);
		const currentPulse = currentWeek
			? currentWeek.transactions + currentWeek.chats + currentWeek.searches
			: 0;
		const previousPulse = previousWeek
			? previousWeek.transactions + previousWeek.chats + previousWeek.searches
			: 0;

		const transactionVolume = transactionRows.reduce(
			(sum, tx) => sum + tx.amountNpr,
			0,
		);
		const completedTransactions = transactionRows.filter((tx) =>
			COMPLETED_TRANSACTION_STATUSES.has(tx.status),
		).length;
		const completionRate = transactionRows.length
			? Math.round((completedTransactions / transactionRows.length) * 100)
			: 0;

		const unreadMessages = chatRows.reduce(
			(sum, chat) => sum + chat.unreadCount,
			0,
		);
		const activeThreads = chatRows.length;
		const pendingThreads = chatRows.filter((chat) => chat.unreadCount > 0).length;

		const uniqueSearches = new Set(
			searchRows
				.map((search) => search.query.trim().toLowerCase())
				.filter((query) => query.length > 0),
		);
		const searchTimeline = buildDailySearchTimeline(searchRows, 14);
		const filterUsage = buildFilterUsage(searchRows);
		const activeFilterTotal = searchRows.reduce(
			(sum, row) => sum + countActiveFilters(row.filters),
			0,
		);
		const avgFiltersPerSearch = searchRows.length
			? Number((activeFilterTotal / searchRows.length).toFixed(1))
			: 0;
		const highIntentSearches = searchRows.filter(
			(row) => countActiveFilters(row.filters) >= 3,
		).length;
		const busiestSearchDay = searchTimeline.reduce(
			(max, day) => (day.searches > max.searches ? day : max),
			searchTimeline[0] ?? {
				avgFilters: 0,
				dateLabel: "-",
				label: "-",
				searches: 0,
			},
		);

		const chatQueue = chatRows
			.map((chat, index) => ({
				id: `chat-${index}-${chat.lastMessageAt}`,
				lastMessageAt: chat.lastMessageAt,
				partnerName: chat.partner?.name?.trim() || "Marketplace contact",
				unreadCount: chat.unreadCount,
			}))
			.sort(
				(a, b) =>
					b.unreadCount - a.unreadCount || b.lastMessageAt - a.lastMessageAt,
			)
			.slice(0, 5);

		const rawStatusData = TRANSACTION_STATUS_META.map((meta) => {
			const count = transactionRows.filter((tx) => tx.status === meta.key).length;
			return {
				color: meta.color,
				label: meta.label,
				value: count,
			};
		});
		const statusData = rawStatusData.filter((item) => item.value > 0);

		return {
			activeThreads,
			chatQueue,
			completionRate,
			currentPulse,
			pendingThreads,
			pulseChange: calculatePercentChange(currentPulse, previousPulse),
			avgFiltersPerSearch,
			busiestSearchDay,
			filterUsage,
			highIntentSearches,
			searchTimeline,
			searchTermCount: uniqueSearches.size,
			statusData,
			totalSearches: searchRows.length,
			totalTransactions: transactionRows.length,
			transactionVolume,
			unreadMessages,
			weeklyActivity,
		};
	}, [transactions, chats, searches]);

	return (
		<PageShell
			title="Dashboard"
			description="Your live command center for deal flow, message pressure, and search intent trends."
		>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<InsightCard
					description="Across your latest activity window"
					direction={
						insights.pulseChange > 0
							? "up"
							: insights.pulseChange < 0
								? "down"
								: "flat"
					}
					icon={Sparkles}
					title="Weekly Pulse"
					trend={formatDeltaCopy(insights.pulseChange)}
					value={isLoading ? "..." : String(insights.currentPulse)}
				/>
				<InsightCard
					description={`${insights.totalTransactions} total transactions in view`}
					direction={insights.completionRate >= 50 ? "up" : "flat"}
					icon={ArrowRightLeft}
					title="Transaction Completion"
					trend={isLoading ? "Loading..." : `${insights.completionRate}% closed`}
					value={isLoading ? "..." : nprCompact(insights.transactionVolume)}
				/>
				<InsightCard
					description={`${insights.pendingThreads} chats need attention`}
					direction={insights.unreadMessages > 6 ? "down" : "flat"}
					icon={MessageSquareMore}
					title="Unread Messages"
					trend={
						isLoading
							? "Loading..."
							: `${insights.activeThreads} active conversations`
					}
					value={isLoading ? "..." : String(insights.unreadMessages)}
				/>
				<InsightCard
					description={`${insights.searchTermCount} unique search patterns`}
					direction={insights.totalSearches >= 6 ? "up" : "flat"}
					icon={Search}
					title="Search Momentum"
					trend={isLoading ? "Loading..." : "Based on recent saved queries"}
					value={isLoading ? "..." : String(insights.totalSearches)}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/97 via-card/93 to-secondary/20">
					<div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
					<CardHeader className="relative flex-row items-start justify-between gap-3 pb-4">
						<div className="space-y-2">
							<CardTitle className="text-xl">8-Week Activity Pulse</CardTitle>
							<p className="text-sm text-muted-foreground">
								Weekly trend of transactions, conversations, and saved searches.
							</p>
						</div>
						<Badge variant="secondary">Live Trend</Badge>
					</CardHeader>
					<CardContent className="relative h-[320px] pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading weekly activity..." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={insights.weeklyActivity}
									margin={{ left: 8, right: 16, top: 12, bottom: 0 }}
								>
									<CartesianGrid
										stroke="var(--color-border)"
										strokeDasharray="4 4"
										opacity={0.5}
									/>
									<XAxis
										dataKey="label"
										axisLine={false}
										tickLine={false}
										stroke="var(--color-muted-foreground)"
										fontSize={12}
									/>
									<YAxis
										allowDecimals={false}
										axisLine={false}
										tickLine={false}
										width={36}
										stroke="var(--color-muted-foreground)"
										fontSize={12}
									/>
									<Tooltip content={<DashboardChartTooltip />} cursor={false} />
									<Area
										type="monotone"
										dataKey="transactions"
										name="Transactions"
										stroke="var(--color-chart-1)"
										fill="var(--color-chart-1)"
										fillOpacity={0.2}
										strokeWidth={2.3}
									/>
									<Area
										type="monotone"
										dataKey="chats"
										name="Chats"
										stroke="var(--color-chart-2)"
										fill="var(--color-chart-2)"
										fillOpacity={0.2}
										strokeWidth={2.3}
									/>
									<Area
										type="monotone"
										dataKey="searches"
										name="Searches"
										stroke="var(--color-chart-4)"
										fill="var(--color-chart-4)"
										fillOpacity={0.2}
										strokeWidth={2.3}
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/92 to-accent/18">
					<div className="pointer-events-none absolute -bottom-24 -left-20 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
					<CardHeader className="relative space-y-2 pb-4">
						<CardTitle className="text-xl">Transaction Pipeline</CardTitle>
						<p className="text-sm text-muted-foreground">
							Current status split for your recent transaction stream.
						</p>
					</CardHeader>
					<CardContent className="relative space-y-5 pb-6">
						<div className="h-[210px]">
							{isLoading ? (
								<DashboardPlaceholder label="Building transaction split..." />
							) : insights.statusData.length === 0 ? (
								<DashboardPlaceholder label="No transactions yet." />
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={insights.statusData}
											dataKey="value"
											innerRadius={56}
											outerRadius={90}
											paddingAngle={3}
											strokeWidth={0}
										>
											{insights.statusData.map((segment) => (
												<Cell key={segment.label} fill={segment.color} />
											))}
										</Pie>
										<Tooltip content={<DashboardChartTooltip />} cursor={false} />
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="space-y-3">
							{insights.statusData.slice(0, 4).map((segment) => (
								<div
									key={segment.label}
									className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-3 py-2"
								>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span
											className="size-2.5 rounded-full"
											style={{ backgroundColor: segment.color }}
										/>
										{segment.label}
									</div>
									<span className="text-sm font-semibold">{segment.value}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

				<div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
					<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/93 to-chart-2/12">
						<div className="pointer-events-none absolute -right-24 top-1/3 h-44 w-44 rounded-full bg-chart-2/20 blur-3xl" />
						<CardHeader className="flex-row items-start justify-between gap-4 pb-4">
							<div className="space-y-2">
								<CardTitle className="text-xl">Search Strategy Radar</CardTitle>
								<p className="text-sm text-muted-foreground">
									Daily search intensity with filter precision trend across the last 14 days.
								</p>
							</div>
							<Badge variant="outline">14-Day Lens</Badge>
						</CardHeader>
						<CardContent className="space-y-5 pb-6">
							<div className="h-[245px]">
								{isLoading ? (
									<DashboardPlaceholder label="Loading search strategy..." />
								) : insights.searchTimeline.every((row) => row.searches === 0) ? (
									<DashboardPlaceholder label="No search history yet." />
								) : (
									<ResponsiveContainer width="100%" height="100%">
										<ComposedChart
											data={insights.searchTimeline}
											margin={{ left: 0, right: 8, top: 6, bottom: 0 }}
										>
											<CartesianGrid
												stroke="var(--color-border)"
											strokeDasharray="4 4"
											opacity={0.45}
										/>
										<XAxis
												dataKey="label"
												axisLine={false}
												tickLine={false}
												stroke="var(--color-muted-foreground)"
												fontSize={12}
											/>
											<YAxis
												yAxisId="left"
												allowDecimals={false}
												axisLine={false}
												tickLine={false}
												width={32}
												stroke="var(--color-muted-foreground)"
												fontSize={12}
											/>
											<YAxis
												yAxisId="right"
												allowDecimals={true}
												axisLine={false}
												tickLine={false}
												orientation="right"
												width={36}
												stroke="var(--color-muted-foreground)"
												fontSize={12}
											/>
											<Tooltip content={<DashboardChartTooltip />} cursor={false} />
											<Bar
												yAxisId="left"
												dataKey="searches"
												name="Searches"
												radius={[8, 8, 0, 0]}
												fill="var(--color-chart-2)"
											/>
											<Line
												yAxisId="right"
												type="monotone"
												dataKey="avgFilters"
												name="Avg Filters"
												stroke="var(--color-chart-5)"
												strokeWidth={2.4}
												dot={false}
											/>
										</ComposedChart>
									</ResponsiveContainer>
								)}
							</div>
							<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
								<div className="space-y-2">
									<p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
										Most Used Filters
									</p>
									{isLoading ? (
										<DashboardPlaceholder label="Measuring filter focus..." />
									) : insights.filterUsage.length === 0 ? (
										<DashboardPlaceholder label="No active filters found yet." />
									) : (
										insights.filterUsage.slice(0, 4).map((filter) => (
											<div
												key={filter.key}
												className="rounded-2xl border border-border/70 bg-background/62 px-3 py-2.5"
											>
												<div className="flex items-center justify-between gap-2 text-sm">
													<span className="font-medium">{filter.label}</span>
													<span className="text-muted-foreground">
														{filter.count} uses
													</span>
												</div>
												<div className="mt-2 h-1.5 rounded-full bg-muted/75">
													<span
														className="block h-full rounded-full bg-chart-2"
														style={{ width: `${filter.percent}%` }}
													/>
												</div>
											</div>
										))
									)}
								</div>

								<div className="grid gap-2">
									<SearchStatTile
										label="Avg Filters / Search"
										value={
											isLoading ? "..." : insights.avgFiltersPerSearch.toFixed(1)
										}
									/>
									<SearchStatTile
										label="High-Intent Searches"
										value={isLoading ? "..." : String(insights.highIntentSearches)}
									/>
									<SearchStatTile
										label="Busiest Day"
										value={isLoading ? "..." : insights.busiestSearchDay.dateLabel}
										subText={
											isLoading
												? undefined
												: `${insights.busiestSearchDay.searches} searches`
										}
									/>
								</div>
							</div>
						</CardContent>
					</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/93 to-primary/10">
					<CardHeader className="space-y-2 pb-4">
						<CardTitle className="text-xl">Priority Inbox</CardTitle>
						<p className="text-sm text-muted-foreground">
							Conversations ranked by unread pressure and recency.
						</p>
					</CardHeader>
					<CardContent className="space-y-3 pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading inbox priorities..." />
						) : insights.chatQueue.length === 0 ? (
							<DashboardPlaceholder label="No active conversations yet." />
						) : (
							insights.chatQueue.map((thread) => (
								<div
									key={thread.id}
									className="rounded-2xl border border-border/70 bg-background/65 px-3 py-3"
								>
									<div className="flex items-center justify-between gap-3">
										<p className="truncate text-sm font-semibold">
											{thread.partnerName}
										</p>
										<Badge
											variant={thread.unreadCount > 0 ? "default" : "outline"}
										>
											{thread.unreadCount} unread
										</Badge>
									</div>
									<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
										<span className="inline-flex items-center gap-1">
											<Clock3 className="size-3.5" />
											{formatRelativeAge(thread.lastMessageAt)}
										</span>
										<span>Message queue priority</span>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>

			<div className="flex flex-wrap gap-2">
				<Link to="/messages">
					<Button variant="outline">Open Message Hub</Button>
				</Link>
				<Link to="/transactions">
					<Button variant="outline">Review Transactions</Button>
				</Link>
				<Link to="/search-history">
					<Button variant="outline">Search History</Button>
				</Link>
				<Link to="/profile">
					<Button>Manage Profile</Button>
				</Link>
			</div>
		</PageShell>
	);
}

function InsightCard({
	title,
	value,
	description,
	trend,
	icon: Icon,
	direction,
}: {
	title: string;
	value: string;
	description: string;
	trend: string;
	icon: LucideIcon;
	direction: TrendDirection;
}) {
	return (
		<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/97 via-card/94 to-primary/10">
			<div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-primary/18 blur-2xl" />
			<CardHeader className="relative flex-row items-start justify-between gap-3 pb-3">
				<div className="space-y-1">
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
						{title}
					</p>
					<CardTitle className="text-2xl leading-none">{value}</CardTitle>
				</div>
				<div className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-background/65">
					<Icon className="size-4 text-primary" />
				</div>
			</CardHeader>
			<CardContent className="relative space-y-2 pt-0">
				<p className="text-sm text-muted-foreground">{description}</p>
				<div className="flex items-center justify-between gap-2">
					<TrendPill direction={direction}>{trend}</TrendPill>
				</div>
			</CardContent>
		</Card>
	);
}

function TrendPill({
	direction,
	children,
}: {
	direction: TrendDirection;
	children: string;
}) {
	return (
		<span
			className={cn(
				"rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
				direction === "up" &&
					"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
				direction === "down" &&
					"bg-amber-500/20 text-amber-800 dark:text-amber-300",
				direction === "flat" && "bg-muted text-muted-foreground",
			)}
		>
			{children}
		</span>
	);
}

function DashboardPlaceholder({ label }: { label: string }) {
	return (
		<div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/45 px-5 text-sm text-muted-foreground">
			{label}
		</div>
	);
}

function SearchStatTile({
	label,
	value,
	subText,
}: {
	label: string;
	value: string;
	subText?: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
			<p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-base font-semibold">{value}</p>
			{subText ? <p className="text-xs text-muted-foreground">{subText}</p> : null}
		</div>
	);
}

type TooltipDatum = {
	color?: string;
	dataKey?: string | number;
	name?: string;
	value?: number | string;
};

function DashboardChartTooltip({
	active,
	label,
	payload,
}: {
	active?: boolean;
	label?: string | number;
	payload?: TooltipDatum[];
}) {
	if (!active || !payload || payload.length === 0) {
		return null;
	}

	return (
		<div className="rounded-xl border border-border/80 bg-popover/95 px-3 py-2 shadow-[0_24px_56px_-42px_rgba(7,14,31,0.98)] backdrop-blur-sm">
			{label !== undefined ? (
				<p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
					{label}
				</p>
			) : null}
			<div className="mt-1.5 space-y-1">
				{payload.map((item, index) => {
					const rawValue = item.value;
					const value =
						typeof rawValue === "number"
							? Number.isInteger(rawValue)
								? rawValue.toLocaleString("en-NP")
								: rawValue.toFixed(1)
							: (rawValue ?? "-");
					return (
						<div
							key={`${item.name ?? item.dataKey ?? "item"}-${index}`}
							className="flex items-center justify-between gap-3 text-xs"
						>
							<span className="inline-flex items-center gap-1.5 text-muted-foreground">
								<span
									className="size-2 rounded-full"
									style={{ backgroundColor: item.color ?? "var(--color-primary)" }}
								/>
								{item.name ?? item.dataKey ?? "Value"}
							</span>
							<span className="font-semibold text-foreground">{value}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function buildWeeklyActivity(
	transactions: TransactionLike[],
	chats: ChatLike[],
	searches: SearchLike[],
	weeks: number,
) {
	const now = Date.now();
	const windowStart = now - WEEK_MS * (weeks - 1);
	const buckets = Array.from({ length: weeks }, (_, index) => {
		const bucketStart = windowStart + index * WEEK_MS;
		return {
			label: new Date(bucketStart).toLocaleDateString("en-NP", {
				month: "short",
				day: "numeric",
			}),
			transactions: 0,
			chats: 0,
			searches: 0,
		};
	});

	const add = (timestamp: number, key: "transactions" | "chats" | "searches") => {
		const bucketIndex = Math.floor((timestamp - windowStart) / WEEK_MS);
		if (bucketIndex < 0 || bucketIndex >= buckets.length) {
			return;
		}
		buckets[bucketIndex][key] += 1;
	};

	for (const tx of transactions) {
		add(tx.createdAt, "transactions");
	}
	for (const chat of chats) {
		add(chat.lastMessageAt, "chats");
	}
	for (const search of searches) {
		add(search.createdAt, "searches");
	}

	return buckets;
}

function buildDailySearchTimeline(searches: SearchLike[], days: number) {
	const DAY_MS = 1000 * 60 * 60 * 24;
	const now = Date.now();
	const start = now - DAY_MS * (days - 1);

	const buckets = Array.from({ length: days }, (_, index) => {
		const dayStart = start + index * DAY_MS;
		const date = new Date(dayStart);
		return {
			avgFilters: 0,
			dateLabel: date.toLocaleDateString("en-NP", {
				month: "short",
				day: "numeric",
			}),
			filterTotal: 0,
			label: date.toLocaleDateString("en-NP", { day: "2-digit" }),
			searches: 0,
		};
	});

	for (const row of searches) {
		const index = Math.floor((row.createdAt - start) / DAY_MS);
		if (index < 0 || index >= buckets.length) {
			continue;
		}
		const activeFilters = countActiveFilters(row.filters);
		buckets[index].searches += 1;
		buckets[index].filterTotal += activeFilters;
	}

	return buckets.map((bucket) => ({
		avgFilters:
			bucket.searches > 0
				? Number((bucket.filterTotal / bucket.searches).toFixed(1))
				: 0,
		dateLabel: bucket.dateLabel,
		label: bucket.label,
		searches: bucket.searches,
	}));
}

function buildFilterUsage(searches: SearchLike[]) {
	const filterCounts = new Map<string, number>();
	let totalApplied = 0;

	for (const row of searches) {
		try {
			const parsed = JSON.parse(row.filters) as Record<string, unknown>;
			for (const [key, value] of Object.entries(parsed)) {
				if (!isFilterValueActive(value)) {
					continue;
				}
				filterCounts.set(key, (filterCounts.get(key) ?? 0) + 1);
				totalApplied += 1;
			}
		} catch {
			continue;
		}
	}

	return Array.from(filterCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([key, count]) => ({
			count,
			key,
			label: formatFilterLabel(key),
			percent:
				totalApplied > 0 ? Math.max(8, Math.round((count / totalApplied) * 100)) : 0,
		}));
}

function formatFilterLabel(key: string) {
	const aliases: Record<string, string> = {
		fuelType: "Fuel Type",
		locationDistrict: "Location",
		maxPrice: "Max Price",
		maxYear: "Max Year",
		minPrice: "Min Price",
		minYear: "Min Year",
		sortBy: "Sort",
	};
	return aliases[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function countActiveFilters(rawFilters: string) {
	try {
		const parsed = JSON.parse(rawFilters) as Record<string, unknown>;
		return Object.values(parsed).filter((value) => isFilterValueActive(value)).length;
	} catch {
		return 0;
	}
}

function isFilterValueActive(value: unknown) {
	if (value === null || value === undefined) {
		return false;
	}
	if (typeof value === "string") {
		return value.trim().length > 0;
	}
	if (typeof value === "number") {
		return true;
	}
	if (typeof value === "boolean") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.length > 0;
	}
	return true;
}

function calculatePercentChange(current: number, previous: number) {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return Math.round(((current - previous) / previous) * 100);
}

function formatDeltaCopy(delta: number) {
	if (delta > 0) {
		return `+${delta}% vs previous week`;
	}
	if (delta < 0) {
		return `${delta}% vs previous week`;
	}
	return "Steady week over week";
}

function formatRelativeAge(timestamp: number) {
	const elapsedHours = Math.max(
		1,
		Math.round((Date.now() - timestamp) / (1000 * 60 * 60)),
	);
	if (elapsedHours < 24) {
		return `${elapsedHours}h ago`;
	}
	return `${Math.round(elapsedHours / 24)}d ago`;
}
