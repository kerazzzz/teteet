import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	ArrowRightLeft,
	Clock3,
	ShieldAlert,
	Sparkles,
	Users,
} from "lucide-react";
import { useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { nprCompact } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboardPage,
});

type AdminStatsLike = {
	flaggedReviewCount: number;
	liveListingCount: number;
	pendingListingCount: number;
	transactionCount: number;
	userCount: number;
};

type AdminUserLike = {
	createdAt: number;
	isActive: boolean;
	role: string;
};

type AdminTransactionLike = {
	amountNpr: number;
	createdAt: number;
	status: string;
};

type AdminReviewLike = {
	createdAt: number;
	moderationStatus: string;
	rating: number;
};

type PendingListingLike = {
	_id: string;
	createdAt: number;
	locationDistrict: string;
	make: string;
	model: string;
	priceNpr: number;
	title: string;
};

type TrendDirection = "up" | "down" | "flat";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const QUEUE_ALERT_HOURS = 48;

const COMPLETED_TRANSACTION_STATUSES = new Set([
	"paid",
	"document_generated",
	"completed",
]);
const IN_FLIGHT_TRANSACTION_STATUSES = new Set(["initiated", "payment_pending"]);

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

const ROLE_META = [
	{ key: "buyer", label: "Buyers", color: "var(--color-chart-2)" },
	{ key: "seller", label: "Sellers", color: "var(--color-chart-3)" },
	{ key: "admin", label: "Admins", color: "var(--color-chart-5)" },
] as const;

const REVIEW_META = [
	{ key: "visible", label: "Visible", color: "var(--color-chart-3)" },
	{ key: "flagged", label: "Flagged", color: "var(--color-destructive)" },
	{ key: "hidden", label: "Hidden", color: "var(--color-chart-4)" },
] as const;

function AdminDashboardPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminDashboardContent />
		</RequireRole>
	);
}

function AdminDashboardContent() {
	const statsQuery = useQuery(api.admin.dashboardStats);
	const usersQuery = useQuery(api.admin.listUsers, { limit: 500 });
	const transactionsQuery = useQuery(api.admin.listTransactions, { limit: 500 });
	const reviewsQuery = useQuery(api.admin.listReviews, { limit: 500 });
	const pendingQuery = useQuery(api.admin.listPendingListings, { limit: 200 });
	const isLoading =
		statsQuery === undefined ||
		usersQuery === undefined ||
		transactionsQuery === undefined ||
		reviewsQuery === undefined ||
		pendingQuery === undefined;

	const insights = useMemo(() => {
		const stats = (statsQuery ?? null) as AdminStatsLike | null;
		const users = (usersQuery ?? []) as AdminUserLike[];
		const transactions = (transactionsQuery ?? []) as AdminTransactionLike[];
		const reviews = (reviewsQuery ?? []) as AdminReviewLike[];
		const pendingRows = (pendingQuery ?? []) as PendingListingLike[];

		const roleData = ROLE_META.map((meta) => ({
			color: meta.color,
			count: users.filter((user) => user.role === meta.key).length,
			key: meta.key,
			label: meta.label,
		}));
		const activeUsers = users.filter((user) => user.isActive).length;
		const inactiveUsers = users.length - activeUsers;

		const txStatusData = TRANSACTION_STATUS_META.map((meta) => ({
			color: meta.color,
			label: meta.label,
			value: transactions.filter((tx) => tx.status === meta.key).length,
		})).filter((row) => row.value > 0);

		const completedTransactions = transactions.filter((tx) =>
			COMPLETED_TRANSACTION_STATUSES.has(tx.status),
		).length;
		const completionRate = transactions.length
			? Math.round((completedTransactions / transactions.length) * 100)
			: 0;
		const processedVolume = transactions
			.filter((tx) => COMPLETED_TRANSACTION_STATUSES.has(tx.status))
			.reduce((sum, tx) => sum + tx.amountNpr, 0);
		const inFlightVolume = transactions
			.filter((tx) => IN_FLIGHT_TRANSACTION_STATUSES.has(tx.status))
			.reduce((sum, tx) => sum + tx.amountNpr, 0);

		const reviewStatusData = REVIEW_META.map((meta) => ({
			color: meta.color,
			count: reviews.filter((review) => review.moderationStatus === meta.key).length,
			key: meta.key,
			label: meta.label,
		}));
		const flaggedReviews =
			reviewStatusData.find((row) => row.key === "flagged")?.count ?? 0;
		const flaggedRate = reviews.length
			? Math.round((flaggedReviews / reviews.length) * 100)
			: 0;
		const avgRating = reviews.length
			? Number(
					(
						reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
					).toFixed(1),
				)
			: 0;

		const queue = pendingRows
			.map((listing) => ({
				...listing,
				ageHours: getAgeHours(listing.createdAt),
			}))
			.sort((a, b) => b.ageHours - a.ageHours);
		const queueValue = queue.reduce((sum, listing) => sum + listing.priceNpr, 0);
		const avgQueueHours = queue.length
			? Math.round(
					queue.reduce((sum, listing) => sum + listing.ageHours, 0) / queue.length,
				)
			: 0;
		const agedQueueCount = queue.filter(
			(listing) => listing.ageHours >= QUEUE_ALERT_HOURS,
		).length;
		const oldestQueue = queue.slice(0, 5);
		const districtData = buildTopDistricts(pendingRows, 5);

		const weeklySeries = buildWeeklyOperationsSeries(
			users,
			transactions,
			reviews,
			pendingRows,
			8,
		);
		const currentWeek = weeklySeries.at(-1);
		const previousWeek = weeklySeries.at(-2);
		const thisWeekActivity = currentWeek
			? currentWeek.users +
				currentWeek.transactions +
				currentWeek.pending +
				currentWeek.reviews
			: 0;
		const previousWeekActivity = previousWeek
			? previousWeek.users +
				previousWeek.transactions +
				previousWeek.pending +
				previousWeek.reviews
			: 0;

		const totalUsers = stats?.userCount ?? users.length;
		const totalTransactions = stats?.transactionCount ?? transactions.length;
		const pendingListings = stats?.pendingListingCount ?? pendingRows.length;
		const liveListings = stats?.liveListingCount ?? 0;
		const platformFlaggedReviews = stats?.flaggedReviewCount ?? flaggedReviews;
		const liveAndPending = liveListings + pendingListings;
		const pendingShare = liveAndPending
			? Math.round((pendingListings / liveAndPending) * 100)
			: 0;

		return {
			activeUsers,
			agedQueueCount,
			avgQueueHours,
			avgRating,
			completionRate,
			districtData,
			flaggedRate,
			inFlightVolume,
			inactiveUsers,
			liveListings,
			oldestQueue,
			pendingListings,
			pendingShare,
			platformFlaggedReviews,
			processedVolume,
			queueValue,
			reviewStatusData,
			roleData,
			thisWeekActivity,
			thisWeekChange: calculatePercentChange(thisWeekActivity, previousWeekActivity),
			totalTransactions,
			totalUsers,
			txStatusData,
			weeklySeries,
		};
	}, [statsQuery, usersQuery, transactionsQuery, reviewsQuery, pendingQuery]);

	return (
		<PageShell
			title="Admin Operations Hub"
			description="Real-time platform command center for demand, moderation risk, and queue health."
		>
			<div className="flex flex-wrap gap-2">
				<Link to="/admin/listings/pending">
					<Button variant="outline">Pending Listings</Button>
				</Link>
				<Link to="/admin/sellers/applications">
					<Button variant="outline">Seller Applications</Button>
				</Link>
				<Link to="/admin/reviews">
					<Button variant="outline">Moderation Queue</Button>
				</Link>
				<Link to="/admin/transactions">
					<Button variant="outline">Transaction Monitor</Button>
				</Link>
				<Link to="/admin/users">
					<Button variant="outline">User Management</Button>
				</Link>
				<Link to="/admin/news">
					<Button>Publishing Desk</Button>
				</Link>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
				<AdminMetricCard
					description="Users, listings, transactions, and reviews in this weekly cycle."
					direction={
						insights.thisWeekChange > 0
							? "up"
							: insights.thisWeekChange < 0
								? "down"
								: "flat"
					}
					icon={Sparkles}
					title="Weekly Platform Throughput"
					trend={formatDeltaCopy(insights.thisWeekChange)}
					value={isLoading ? "..." : insights.thisWeekActivity.toLocaleString("en-NP")}
				/>
				<AdminMetricCard
					description={`${insights.totalTransactions.toLocaleString("en-NP")} transactions sampled for lifecycle health.`}
					direction={insights.completionRate >= 55 ? "up" : "flat"}
					icon={ArrowRightLeft}
					title="Completion Efficiency"
					trend={
						isLoading
							? "Loading..."
							: `Processed ${nprCompact(insights.processedVolume)}`
					}
					value={isLoading ? "..." : `${insights.completionRate}%`}
				/>
				<AdminMetricCard
					description={`${insights.flaggedRate}% of review flow currently requires intervention.`}
					direction={insights.flaggedRate > 18 ? "down" : "flat"}
					icon={ShieldAlert}
					title="Moderation Risk"
					trend={isLoading ? "Loading..." : `Average rating ${insights.avgRating}/5`}
					value={
						isLoading
							? "..."
							: insights.platformFlaggedReviews.toLocaleString("en-NP")
					}
				/>
				<AdminMetricCard
					description={`${insights.agedQueueCount} approvals are older than ${QUEUE_ALERT_HOURS}h.`}
					direction={insights.agedQueueCount > 0 ? "down" : "up"}
					icon={AlertTriangle}
					title="Approval Queue Pressure"
					trend={isLoading ? "Loading..." : `Queue value ${nprCompact(insights.queueValue)}`}
					value={isLoading ? "..." : insights.pendingListings.toLocaleString("en-NP")}
				/>
				<AdminMetricCard
					description={`${insights.inactiveUsers.toLocaleString("en-NP")} inactive users in sampled roster.`}
					direction={insights.activeUsers > insights.inactiveUsers ? "up" : "flat"}
					icon={Users}
					title="Active Accounts"
					trend={isLoading ? "Loading..." : `Total users ${insights.totalUsers.toLocaleString("en-NP")}`}
					value={isLoading ? "..." : insights.activeUsers.toLocaleString("en-NP")}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/97 via-card/93 to-secondary/18">
					<div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-chart-2/18 blur-3xl" />
					<CardHeader className="relative flex-row items-start justify-between gap-3 pb-4">
						<div className="space-y-2">
							<CardTitle className="text-xl">8-Week Operations Flow</CardTitle>
							<CardDescription>
								Tracks onboarding, commerce flow, moderation workload, and approval
								intake every week.
							</CardDescription>
						</div>
						<Badge variant="secondary">{formatDeltaCopy(insights.thisWeekChange)}</Badge>
					</CardHeader>
					<CardContent className="relative h-[330px] pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading weekly operations flow..." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={insights.weeklySeries}
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
									<Tooltip content={<AdminChartTooltip />} cursor={false} />
									<Area
										type="monotone"
										dataKey="users"
										name="New Users"
										stroke="var(--color-chart-2)"
										fill="var(--color-chart-2)"
										fillOpacity={0.2}
										strokeWidth={2.2}
									/>
									<Area
										type="monotone"
										dataKey="transactions"
										name="Transactions"
										stroke="var(--color-chart-1)"
										fill="var(--color-chart-1)"
										fillOpacity={0.2}
										strokeWidth={2.2}
									/>
									<Area
										type="monotone"
										dataKey="pending"
										name="Pending Listings"
										stroke="var(--color-chart-4)"
										fill="var(--color-chart-4)"
										fillOpacity={0.18}
										strokeWidth={2.2}
									/>
									<Area
										type="monotone"
										dataKey="reviews"
										name="Reviews"
										stroke="var(--color-chart-5)"
										fill="var(--color-chart-5)"
										fillOpacity={0.18}
										strokeWidth={2.2}
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/93 to-accent/15">
					<div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-chart-4/15 blur-3xl" />
					<CardHeader className="relative space-y-2 pb-4">
						<CardTitle className="text-xl">Transaction Lifecycle</CardTitle>
						<CardDescription>
							Status mix of the recent transaction stream and amount currently in
							flight.
						</CardDescription>
					</CardHeader>
					<CardContent className="relative space-y-5 pb-6">
						<div className="h-[210px]">
							{isLoading ? (
								<DashboardPlaceholder label="Loading transaction lifecycle..." />
							) : insights.txStatusData.length === 0 ? (
								<DashboardPlaceholder label="No transactions yet." />
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={insights.txStatusData}
											dataKey="value"
											innerRadius={56}
											outerRadius={90}
											paddingAngle={3}
											strokeWidth={0}
										>
											{insights.txStatusData.map((segment) => (
												<Cell key={segment.label} fill={segment.color} />
											))}
										</Pie>
										<Tooltip content={<AdminChartTooltip />} cursor={false} />
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="space-y-3">
							{insights.txStatusData.slice(0, 4).map((segment) => (
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
						<div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
							<p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								In-Flight Transaction Value
							</p>
							<p className="mt-1 text-lg font-semibold">
								{isLoading ? "..." : nprCompact(insights.inFlightVolume)}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1.1fr]">
				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/94 to-chart-3/10">
					<CardHeader className="space-y-2 pb-4">
						<CardTitle className="text-xl">Role and Moderation Matrix</CardTitle>
						<CardDescription>
							Account mix by role, plus the moderation status distribution of review
							content.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 pb-6">
						<div className="h-[210px]">
							{isLoading ? (
								<DashboardPlaceholder label="Loading role distribution..." />
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={insights.roleData}
										margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
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
											allowDecimals={false}
											axisLine={false}
											tickLine={false}
											width={32}
											stroke="var(--color-muted-foreground)"
											fontSize={12}
										/>
										<Tooltip content={<AdminChartTooltip />} cursor={false} />
										<Bar dataKey="count" radius={[8, 8, 0, 0]}>
											{insights.roleData.map((row) => (
												<Cell key={row.key} fill={row.color} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="space-y-2">
							{insights.reviewStatusData.map((item) => (
								<div
									key={item.key}
									className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-3 py-2"
								>
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span
											className="size-2.5 rounded-full"
											style={{ backgroundColor: item.color }}
										/>
										{item.label}
									</div>
									<span className="text-sm font-semibold">{item.count}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/94 to-chart-1/12">
					<CardHeader className="space-y-2 pb-4">
						<CardTitle className="text-xl">Queue Hotspots</CardTitle>
						<CardDescription>
							Where pending approvals are concentrated by district and listing share.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading queue hotspots..." />
						) : insights.districtData.length === 0 ? (
							<DashboardPlaceholder label="No pending queue data yet." />
						) : (
							insights.districtData.map((district) => (
								<div
									key={district.name}
									className="rounded-2xl border border-border/70 bg-background/62 px-3 py-2.5"
								>
									<div className="flex items-center justify-between gap-2 text-sm">
										<p className="font-medium">{district.name}</p>
										<p className="text-muted-foreground">
											{district.count} listings
										</p>
									</div>
									<div className="mt-2 h-1.5 rounded-full bg-muted/75">
										<span
											className="block h-full rounded-full bg-chart-1"
											style={{ width: `${district.percent}%` }}
										/>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{district.percent}% of queue • Avg {nprCompact(district.avgValue)}
									</p>
								</div>
							))
						)}
						<div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
							<p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Pending Share (Live + Pending)
							</p>
							<p className="mt-1 text-lg font-semibold">
								{isLoading ? "..." : `${insights.pendingShare}%`}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/94 to-primary/12">
					<CardHeader className="space-y-2 pb-4">
						<CardTitle className="text-xl">Oldest Pending Approvals</CardTitle>
						<CardDescription>
							Prioritized queue by age so high-risk approvals are addressed first.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading queue priorities..." />
						) : insights.oldestQueue.length === 0 ? (
							<DashboardPlaceholder label="No pending approvals in queue." />
						) : (
							insights.oldestQueue.map((listing) => (
								<Link
									key={listing._id}
									to="/admin/listings/$listingId"
									params={{ listingId: listing._id }}
									className="block rounded-2xl border border-border/70 bg-background/62 px-3 py-3 transition-colors hover:bg-accent/45"
								>
									<div className="flex items-start justify-between gap-2">
										<p className="line-clamp-2 text-sm font-semibold">
											{listing.title}
										</p>
										<Badge
											variant={listing.ageHours >= QUEUE_ALERT_HOURS ? "destructive" : "outline"}
										>
											{formatQueueAge(listing.ageHours)}
										</Badge>
									</div>
									<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
										<span>
											{listing.make} {listing.model} • {listing.locationDistrict}
										</span>
										<span>{nprCompact(listing.priceNpr)}</span>
									</div>
								</Link>
							))
						)}
						<div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
							<p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Average Queue Wait
							</p>
							<p className="mt-1 inline-flex items-center gap-1 text-base font-semibold">
								<Clock3 className="size-4 text-muted-foreground" />
								{isLoading ? "..." : `${insights.avgQueueHours}h`}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

		</PageShell>
	);
}

function AdminMetricCard({
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
				<TrendPill direction={direction}>{trend}</TrendPill>
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

type TooltipDatum = {
	color?: string;
	dataKey?: string | number;
	name?: string;
	value?: number | string;
};

function AdminChartTooltip({
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

function buildWeeklyOperationsSeries(
	users: AdminUserLike[],
	transactions: AdminTransactionLike[],
	reviews: AdminReviewLike[],
	pendingListings: PendingListingLike[],
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
			pending: 0,
			reviews: 0,
			transactions: 0,
			users: 0,
		};
	});

	const add = (
		timestamp: number,
		key: "users" | "transactions" | "reviews" | "pending",
	) => {
		const bucketIndex = Math.floor((timestamp - windowStart) / WEEK_MS);
		if (bucketIndex < 0 || bucketIndex >= buckets.length) {
			return;
		}
		buckets[bucketIndex][key] += 1;
	};

	for (const user of users) {
		add(user.createdAt, "users");
	}
	for (const transaction of transactions) {
		add(transaction.createdAt, "transactions");
	}
	for (const review of reviews) {
		add(review.createdAt, "reviews");
	}
	for (const listing of pendingListings) {
		add(listing.createdAt, "pending");
	}

	return buckets;
}

function buildTopDistricts(listings: PendingListingLike[], limit: number) {
	const map = new Map<
		string,
		{
			count: number;
			totalValue: number;
		}
	>();

	for (const listing of listings) {
		const key = listing.locationDistrict || "Unknown";
		const current = map.get(key) ?? { count: 0, totalValue: 0 };
		current.count += 1;
		current.totalValue += listing.priceNpr;
		map.set(key, current);
	}

	return Array.from(map.entries())
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, limit)
		.map(([name, value]) => ({
			avgValue: Math.round(value.totalValue / value.count),
			count: value.count,
			name,
			percent: listings.length
				? Math.max(8, Math.round((value.count / listings.length) * 100))
				: 0,
		}));
}

function getAgeHours(timestamp: number) {
	return Math.max(1, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));
}

function formatQueueAge(hours: number) {
	if (hours < 24) {
		return `${hours}h`;
	}
	return `${Math.round(hours / 24)}d`;
}

function calculatePercentChange(current: number, previous: number) {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return Math.round(((current - previous) / previous) * 100);
}

function formatDeltaCopy(delta: number) {
	if (delta > 0) {
		return `+${delta}% vs last week`;
	}
	if (delta < 0) {
		return `${delta}% vs last week`;
	}
	return "Stable week over week";
}
