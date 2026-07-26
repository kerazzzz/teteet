import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import {
	CircleGauge,
	Layers3,
	MessageCircleWarning,
	ReceiptText,
} from "lucide-react";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nprCompact } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/seller/dashboard")({
	component: SellerDashboardPage,
});

type ListingLike = {
	createdAt: number;
	likes: number;
	priceNpr: number;
	status: string;
	title: string;
	views: number;
};

type TransactionLike = {
	amountNpr: number;
	createdAt: number;
	status: string;
};

type ChatLike = {
	lastMessageAt: number;
	unreadCount: number;
};

type TrendDirection = "up" | "down" | "flat";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const CLOSED_TRANSACTION_STATUSES = new Set([
	"paid",
	"document_generated",
	"completed",
]);

const LISTING_STATUS_META = [
	{ key: "live", label: "Live", color: "var(--color-chart-3)" },
	{
		key: "pending_approval",
		label: "Pending Approval",
		color: "var(--color-chart-4)",
	},
	{ key: "draft", label: "Draft", color: "var(--color-chart-2)" },
	{ key: "sold", label: "Sold", color: "var(--color-chart-1)" },
	{ key: "rejected", label: "Rejected", color: "var(--color-destructive)" },
	{ key: "archived", label: "Archived", color: "var(--color-muted-foreground)" },
] as const;

const chartTooltipStyle = {
	backgroundColor: "var(--color-card)",
	border: "1px solid var(--color-border)",
	borderRadius: "12px",
	color: "var(--color-foreground)",
	boxShadow: "0 20px 45px -38px rgba(7, 14, 31, 0.95)",
};

function SellerDashboardPage() {
	return (
		<RequireRole roles={["seller", "admin"]}>
			<SellerDashboardContent />
		</RequireRole>
	);
}

function SellerDashboardContent() {
	const listings = useQuery(api.vehicles.getSellerListings, {});
	const transactions = useQuery(api.transactions.listMyTransactions, {
		limit: 80,
	});
	const chats = useQuery(api.chats.listMyChats);
	const isLoading =
		listings === undefined || transactions === undefined || chats === undefined;

	const insights = useMemo(() => {
		const listingRows = (listings ?? []) as ListingLike[];
		const transactionRows = (transactions ?? []) as TransactionLike[];
		const chatRows = (chats ?? []) as ChatLike[];

		const statusCount = new Map<string, number>();
		for (const meta of LISTING_STATUS_META) {
			statusCount.set(meta.key, 0);
		}
		for (const listing of listingRows) {
			statusCount.set(
				listing.status,
				(statusCount.get(listing.status) ?? 0) + 1,
			);
		}

		const listingMix = LISTING_STATUS_META.map((meta) => ({
			color: meta.color,
			label: meta.label,
			value: statusCount.get(meta.key) ?? 0,
		})).filter((item) => item.value > 0);

		const totalListings = listingRows.length;
		const liveListings = statusCount.get("live") ?? 0;
		const pendingListings = statusCount.get("pending_approval") ?? 0;
		const soldListings = statusCount.get("sold") ?? 0;
		const draftListings = statusCount.get("draft") ?? 0;

		const totalPrice = listingRows.reduce((sum, row) => sum + row.priceNpr, 0);
		const avgPrice = totalListings ? Math.round(totalPrice / totalListings) : 0;
		const totalViews = listingRows.reduce((sum, row) => sum + row.views, 0);
		const totalLikes = listingRows.reduce((sum, row) => sum + row.likes, 0);
		const engagementRate = totalViews
			? Number(((totalLikes / totalViews) * 100).toFixed(1))
			: 0;

		const closedRevenue = transactionRows
			.filter((tx) => CLOSED_TRANSACTION_STATUSES.has(tx.status))
			.reduce((sum, tx) => sum + tx.amountNpr, 0);
		const pendingRevenue = transactionRows
			.filter(
				(tx) => tx.status === "initiated" || tx.status === "payment_pending",
			)
			.reduce((sum, tx) => sum + tx.amountNpr, 0);

		const unreadInquiries = chatRows.reduce(
			(sum, row) => sum + row.unreadCount,
			0,
		);
		const recentInquiries = chatRows.filter(
			(row) => row.lastMessageAt >= Date.now() - 1000 * 60 * 60 * 48,
		).length;

		const weeklyPipeline = buildWeeklySellerPipeline(
			listingRows,
			transactionRows,
			chatRows,
			8,
		);
		const thisWeek = weeklyPipeline.at(-1);
		const lastWeek = weeklyPipeline.at(-2);
		const thisWeekThroughput = thisWeek
			? thisWeek.newListings + thisWeek.sales + thisWeek.inquiries
			: 0;
		const lastWeekThroughput = lastWeek
			? lastWeek.newListings + lastWeek.sales + lastWeek.inquiries
			: 0;

		const priceBandDistribution = buildPriceBandDistribution(listingRows);
		const topListings = listingRows
			.map((row, index) => ({
				id: `listing-${index}-${row.createdAt}`,
				likes: row.likes,
				score: row.views + row.likes * 8,
				status: row.status,
				title: row.title,
				views: row.views,
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, 5);
		const maxTopScore = Math.max(1, ...topListings.map((item) => item.score));

		return {
			avgPrice,
			closedRevenue,
			draftListings,
			engagementRate,
			liveListings,
			listingMix,
			maxTopScore,
			pendingListings,
			pendingRevenue,
			priceBandDistribution,
			recentInquiries,
			soldListings,
			topListings,
			totalListings,
			totalViews,
			throughputChange: calculatePercentChange(
				thisWeekThroughput,
				lastWeekThroughput,
			),
			unreadInquiries,
			weeklyPipeline,
		};
	}, [listings, transactions, chats]);

	return (
		<PageShell
			title="Seller Dashboard"
			description="An operations cockpit for inventory health, pipeline movement, and buyer demand."
		>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<SellerMetricCard
					description={`${insights.totalListings} total listings`}
					direction={insights.liveListings >= insights.pendingListings ? "up" : "flat"}
					icon={Layers3}
					title="Live Inventory"
					trend={
						isLoading
							? "Loading..."
							: `${insights.pendingListings} waiting approval`
					}
					value={
						isLoading
							? "..."
							: `${insights.liveListings}/${insights.totalListings}`
					}
				/>
				<SellerMetricCard
					description={`Pending revenue ${nprCompact(insights.pendingRevenue)}`}
					direction={insights.closedRevenue > 0 ? "up" : "flat"}
					icon={ReceiptText}
					title="Closed Revenue"
					trend={
						isLoading
							? "Loading..."
							: `${insights.soldListings} sold listings so far`
					}
					value={isLoading ? "..." : nprCompact(insights.closedRevenue)}
				/>
				<SellerMetricCard
					description={`${insights.totalViews} total listing views`}
					direction={insights.engagementRate >= 5 ? "up" : "flat"}
					icon={CircleGauge}
					title="Engagement Rate"
					trend={
						isLoading
							? "Loading..."
							: `${insights.draftListings} drafts still unpublished`
					}
					value={isLoading ? "..." : `${insights.engagementRate}%`}
				/>
				<SellerMetricCard
					description={`${insights.recentInquiries} active threads in 48h`}
					direction={insights.unreadInquiries > 8 ? "down" : "flat"}
					icon={MessageCircleWarning}
					title="Inquiry Load"
					trend={
						isLoading
							? "Loading..."
							: `${insights.unreadInquiries} unread customer messages`
					}
					value={isLoading ? "..." : String(insights.unreadInquiries)}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/97 via-card/93 to-secondary/16">
					<CardHeader className="flex-row items-start justify-between gap-3 pb-4">
						<div className="space-y-2">
							<CardTitle className="text-xl">Weekly Pipeline</CardTitle>
							<p className="text-sm text-muted-foreground">
								New listings, sales closure, and inquiry movement across 8 weeks.
							</p>
						</div>
						<Badge variant="secondary">
							{formatDeltaCopy(insights.throughputChange)}
						</Badge>
					</CardHeader>
					<CardContent className="h-[320px] pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading weekly pipeline..." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart
									data={insights.weeklyPipeline}
									margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
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
									<Tooltip contentStyle={chartTooltipStyle} />
									<Line
										type="monotone"
										dataKey="newListings"
										name="New Listings"
										stroke="var(--color-chart-2)"
										strokeWidth={2.5}
										dot={{ r: 2.5 }}
									/>
									<Line
										type="monotone"
										dataKey="sales"
										name="Sales"
										stroke="var(--color-chart-3)"
										strokeWidth={2.5}
										dot={{ r: 2.5 }}
									/>
									<Line
										type="monotone"
										dataKey="inquiries"
										name="Inquiries"
										stroke="var(--color-chart-4)"
										strokeWidth={2.5}
										dot={{ r: 2.5 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/97 via-card/93 to-primary/12">
					<CardHeader className="space-y-2 pb-4">
						<CardTitle className="text-xl">Inventory Lifecycle</CardTitle>
						<p className="text-sm text-muted-foreground">
							Distribution of listings by current workflow stage.
						</p>
					</CardHeader>
					<CardContent className="space-y-5 pb-6">
						<div className="h-[210px]">
							{isLoading ? (
								<DashboardPlaceholder label="Loading status mix..." />
							) : insights.listingMix.length === 0 ? (
								<DashboardPlaceholder label="No listings found." />
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={insights.listingMix}
											dataKey="value"
											innerRadius={56}
											outerRadius={90}
											paddingAngle={3}
											strokeWidth={0}
										>
											{insights.listingMix.map((segment) => (
												<Cell key={segment.label} fill={segment.color} />
											))}
										</Pie>
										<Tooltip contentStyle={chartTooltipStyle} />
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
						<div className="space-y-3">
							{insights.listingMix.slice(0, 4).map((segment) => (
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

			<div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/97 via-card/93 to-accent/16">
					<CardHeader className="flex-row items-start justify-between gap-3 pb-4">
						<div className="space-y-2">
							<CardTitle className="text-xl">Price Band Coverage</CardTitle>
							<p className="text-sm text-muted-foreground">
								Where your inventory concentration sits by pricing tier.
							</p>
						</div>
						<Badge variant="outline">
							Avg: {isLoading ? "..." : nprCompact(insights.avgPrice)}
						</Badge>
					</CardHeader>
					<CardContent className="h-[300px] pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading price distribution..." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={insights.priceBandDistribution}
									margin={{ left: 2, right: 8, top: 8, bottom: 0 }}
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
									<Tooltip contentStyle={chartTooltipStyle} />
									<Bar
										dataKey="count"
										radius={[10, 10, 0, 0]}
										fill="var(--color-chart-2)"
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border-border/75 bg-gradient-to-br from-card/98 via-card/92 to-chart-3/10">
					<CardHeader className="space-y-2 pb-4">
						<CardTitle className="text-xl">Top Listings</CardTitle>
						<p className="text-sm text-muted-foreground">
							Ranked by combined visibility and buyer engagement score.
						</p>
					</CardHeader>
					<CardContent className="space-y-3 pb-6">
						{isLoading ? (
							<DashboardPlaceholder label="Loading listing leaders..." />
						) : insights.topListings.length === 0 ? (
							<DashboardPlaceholder label="No listings available yet." />
						) : (
							insights.topListings.map((listing) => (
								<div
									key={listing.id}
									className="rounded-2xl border border-border/70 bg-background/65 px-3 py-3"
								>
									<div className="flex items-start justify-between gap-2">
										<p className="line-clamp-2 text-sm font-semibold">
											{listing.title}
										</p>
										<Badge variant="outline">{formatStatusLabel(listing.status)}</Badge>
									</div>
									<div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
										<span>{listing.views} views</span>
										<span>{listing.likes} likes</span>
									</div>
									<div className="mt-2 h-1.5 rounded-full bg-muted/70">
										<span
											className="block h-full rounded-full bg-primary"
											style={{
												width: `${Math.min(
													100,
													(listing.score / insights.maxTopScore) * 100,
												)}%`,
											}}
										/>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>

			<div className="flex gap-2">
				<Link to="/seller/listings">
					<Button variant="outline">Manage Listings</Button>
				</Link>
				<Link to="/seller/listings/new">
					<Button>Create New Listing</Button>
				</Link>
				<Link to="/seller/inquiries">
					<Button variant="outline">Buyer Inquiries</Button>
				</Link>
			</div>
		</PageShell>
	);
}

function SellerMetricCard({
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

function buildWeeklySellerPipeline(
	listings: ListingLike[],
	transactions: TransactionLike[],
	chats: ChatLike[],
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
			newListings: 0,
			sales: 0,
			inquiries: 0,
		};
	});

	const add = (timestamp: number, key: "newListings" | "sales" | "inquiries") => {
		const bucketIndex = Math.floor((timestamp - windowStart) / WEEK_MS);
		if (bucketIndex < 0 || bucketIndex >= buckets.length) {
			return;
		}
		buckets[bucketIndex][key] += 1;
	};

	for (const listing of listings) {
		add(listing.createdAt, "newListings");
	}
	for (const transaction of transactions) {
		if (CLOSED_TRANSACTION_STATUSES.has(transaction.status)) {
			add(transaction.createdAt, "sales");
		}
	}
	for (const chat of chats) {
		add(chat.lastMessageAt, "inquiries");
	}

	return buckets;
}

function buildPriceBandDistribution(listings: ListingLike[]) {
	const bands = [
		{ label: "Under 20L", count: 0, max: 2_000_000, min: 0 },
		{ label: "20L - 40L", count: 0, max: 4_000_000, min: 2_000_000 },
		{ label: "40L - 60L", count: 0, max: 6_000_000, min: 4_000_000 },
		{ label: "60L+", count: 0, max: Number.POSITIVE_INFINITY, min: 6_000_000 },
	];

	for (const listing of listings) {
		const band = bands.find(
			(candidate) =>
				listing.priceNpr >= candidate.min && listing.priceNpr < candidate.max,
		);
		if (band) {
			band.count += 1;
		}
	}

	return bands.map(({ label, count }) => ({ label, count }));
}

function calculatePercentChange(current: number, previous: number) {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return Math.round(((current - previous) / previous) * 100);
}

function formatDeltaCopy(delta: number) {
	if (delta > 0) {
		return `+${delta}% throughput`;
	}
	if (delta < 0) {
		return `${delta}% throughput`;
	}
	return "Stable throughput";
}

function formatStatusLabel(status: string) {
	const match = LISTING_STATUS_META.find((meta) => meta.key === status);
	return match ? match.label : status;
}
