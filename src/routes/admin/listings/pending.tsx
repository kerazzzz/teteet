import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	CalendarClock,
	CheckCircle2,
	Clock3,
	type LucideIcon,
	MapPin,
	Search,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/listings/pending")({
	component: AdminPendingListingsPage,
});

const REJECTION_TEMPLATES = [
	"Please add 4+ clear exterior and interior photos for buyer verification.",
	"Listing description is too short. Please include service history and ownership details.",
	"Price appears high versus market range. Please provide supporting condition details.",
	"Inspection report is required before publication. Please attach inspection evidence.",
] as const;

const ESCALATION_THRESHOLD_HOURS = 48;

function AdminPendingListingsPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminPendingListingsContent />
		</RequireRole>
	);
}

function AdminPendingListingsContent() {
	const [search, setSearch] = useState("");
	const [defaultReason, setDefaultReason] = useState(REJECTION_TEMPLATES[0]);
	const [reasonById, setReasonById] = useState<Record<string, string>>({});
	const [activeAction, setActiveAction] = useState<{
		listingId: Id<"vehicles">;
		type: "approve" | "reject";
	} | null>(null);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const pending = useQuery(api.admin.listPendingListings, { limit: 200 });
	const publish = useMutation(api.vehicles.publishByAdmin);
	const reject = useMutation(api.vehicles.rejectByAdmin);

	const filteredListings = useMemo(() => {
		if (!pending) {
			return [];
		}
		const query = search.trim().toLowerCase();
		if (!query) {
			return pending;
		}

		return pending.filter((listing) => {
			const haystack =
				`${listing.title} ${listing.make} ${listing.model} ${listing.year} ${listing.locationDistrict} ${listing.condition}`.toLowerCase();
			return haystack.includes(query);
		});
	}, [pending, search]);

	const queueStats = useMemo(() => {
		if (!pending || pending.length === 0) {
			return {
				total: 0,
				aged: 0,
				avgQueueHours: 0,
				totalValue: 0,
			};
		}

		const totalValue = pending.reduce(
			(sum, listing) => sum + listing.priceNpr,
			0,
		);
		const totalQueueHours = pending.reduce(
			(sum, listing) => sum + getQueueAgeHours(listing.createdAt),
			0,
		);
		const aged = pending.filter(
			(listing) =>
				getQueueAgeHours(listing.createdAt) >= ESCALATION_THRESHOLD_HOURS,
		).length;

		return {
			total: pending.length,
			aged,
			avgQueueHours: Math.round(totalQueueHours / pending.length),
			totalValue,
		};
	}, [pending]);

	const getReason = (listingId: Id<"vehicles">) =>
		reasonById[listingId] ?? defaultReason;

	const updateReason = (listingId: Id<"vehicles">, value: string) => {
		setReasonById((current) => ({
			...current,
			[listingId]: value,
		}));
	};

	const onApprove = async ({
		listingId,
		listingLabel,
	}: {
		listingId: Id<"vehicles">;
		listingLabel: string;
	}) => {
		setError(null);
		setFeedback(null);
		setActiveAction({ listingId, type: "approve" });
		try {
			await publish({ vehicleId: listingId });
			setFeedback(`${listingLabel} was approved and published.`);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to approve listing.",
			);
		} finally {
			setActiveAction(null);
		}
	};

	const onReject = async ({
		listingId,
		listingLabel,
	}: {
		listingId: Id<"vehicles">;
		listingLabel: string;
	}) => {
		const reason = getReason(listingId).trim();
		if (!reason) {
			setError("A rejection reason is required before rejecting a listing.");
			return;
		}

		setError(null);
		setFeedback(null);
		setActiveAction({ listingId, type: "reject" });
		try {
			await reject({ vehicleId: listingId, reason });
			setFeedback(`${listingLabel} was rejected with feedback.`);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to reject listing.",
			);
		} finally {
			setActiveAction(null);
		}
	};

	return (
		<PageShell
			title="Approval Command Center"
			description="Triage incoming listings fast, spot risk signals early, and publish only buyer-ready inventory."
			className="pb-16"
		>
			<section className="approval-command-hero p-6 sm:p-8">
				<div className="relative z-10 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-end">
					<div className="space-y-4">
						<Badge variant="secondary" className="w-fit">
							Admin Listing Approval
						</Badge>
						<div className="space-y-2">
							<h2 className="max-w-2xl text-2xl leading-tight font-semibold sm:text-3xl">
								Process the queue without losing decision quality.
							</h2>
							<p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
								Use queue age, pricing context, and listing completeness to make
								consistent publish or reject decisions.
							</p>
						</div>
						{feedback ? (
							<p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
								<CheckCircle2 className="size-3.5" />
								{feedback}
							</p>
						) : null}
						{error ? (
							<p className="inline-flex w-fit items-center gap-2 rounded-full border border-destructive/35 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
								<XCircle className="size-3.5" />
								{error}
							</p>
						) : null}
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
						<QueueMetric
							icon={CalendarClock}
							label="Pending Listings"
							value={queueStats.total.toString()}
							tone="primary"
						/>
						<QueueMetric
							icon={Clock3}
							label="Average Queue Wait"
							value={`${queueStats.avgQueueHours}h`}
							tone="muted"
						/>
						<QueueMetric
							icon={AlertTriangle}
							label={`Aging ${ESCALATION_THRESHOLD_HOURS}+ Hours`}
							value={queueStats.aged.toString()}
							tone={queueStats.aged > 0 ? "warning" : "muted"}
						/>
						<QueueMetric
							icon={MapPin}
							label="Queue Value"
							value={formatNpr(queueStats.totalValue)}
							tone="muted"
						/>
					</div>
				</div>
			</section>

			<Card className="approval-panel-card">
				<CardHeader className="pb-4">
					<CardTitle className="text-xl">Queue Filters and Defaults</CardTitle>
					<CardDescription>
						Search by title, make, model, year, or location. Use a default
						reason that can be overridden per listing.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 lg:grid-cols-2">
						<div className="space-y-2">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
								Search Queue
							</p>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Find by title, make, model, year, or district"
									className="pl-9"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
								Default Rejection Reason
							</p>
							<Input
								value={defaultReason}
								onChange={(e) => setDefaultReason(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						{REJECTION_TEMPLATES.map((template) => (
							<button
								type="button"
								key={template}
								onClick={() => setDefaultReason(template)}
								className={`approval-reason-chip ${
									defaultReason === template ? "is-active" : ""
								}`}
							>
								{template}
							</button>
						))}
					</div>
				</CardContent>
			</Card>

			{!pending ? (
				<div className="grid gap-4 md:grid-cols-2">
					{["loading-a", "loading-b", "loading-c", "loading-d"].map((key) => (
						<Card key={key} className="approval-listing-card animate-pulse">
							<CardHeader className="space-y-3">
								<div className="h-4 w-24 rounded-full bg-muted/70" />
								<div className="h-7 w-2/3 rounded bg-muted/70" />
								<div className="h-4 w-1/2 rounded bg-muted/70" />
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="h-4 w-full rounded bg-muted/60" />
								<div className="h-4 w-5/6 rounded bg-muted/60" />
								<div className="h-10 w-40 rounded-full bg-muted/60" />
							</CardContent>
						</Card>
					))}
				</div>
			) : pending.length === 0 ? (
				<Card className="approval-listing-card">
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No pending listings. New submissions will appear here instantly.
					</CardContent>
				</Card>
			) : filteredListings.length === 0 ? (
				<Card className="approval-listing-card">
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No pending listings match your current search query.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{filteredListings.map((listing, index) => {
						const reason = getReason(listing._id);
						const queueAgeHours = getQueueAgeHours(listing.createdAt);
						const isEscalated = queueAgeHours >= ESCALATION_THRESHOLD_HOURS;
						const isBusy = activeAction?.listingId === listing._id;
						const blockingAction = activeAction !== null;
						const listingLabel = `${listing.make} ${listing.model} (${listing.year})`;

						return (
							<Card key={listing._id} className="approval-listing-card">
								<CardHeader className="pb-3">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div className="space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<Badge variant="secondary">Queue #{index + 1}</Badge>
												<Badge
													variant={isEscalated ? "destructive" : "outline"}
												>
													{formatQueueAge(listing.createdAt)}
												</Badge>
											</div>
											<CardTitle className="text-xl">{listingLabel}</CardTitle>
											<CardDescription>{listing.title}</CardDescription>
										</div>

										<div className="min-w-[10.5rem] space-y-1 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-right">
											<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
												Listing Price
											</p>
											<p className="text-lg font-semibold text-primary">
												{formatNpr(listing.priceNpr)}
											</p>
											<p className="text-xs text-muted-foreground">
												Submitted {formatSubmittedAt(listing.createdAt)}
											</p>
										</div>
									</div>
								</CardHeader>

								<CardContent className="space-y-4">
									<div className="grid gap-2 rounded-2xl border border-border/70 bg-background/60 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
										<Spec label="Location" value={listing.locationDistrict} />
										<Spec label="Condition" value={listing.condition} />
										<Spec label="Transmission" value={listing.transmission} />
										<Spec
											label="Mileage"
											value={`${listing.mileage.toLocaleString()} km`}
										/>
									</div>

									<div className="space-y-2">
										<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
											Rejection Reason
										</p>
										<Textarea
											value={reason}
											onChange={(e) =>
												updateReason(listing._id, e.target.value)
											}
											placeholder="Explain what the seller needs to fix before resubmitting."
											className="min-h-20"
										/>
										<div className="flex flex-wrap gap-2">
											{REJECTION_TEMPLATES.map((template) => (
												<button
													type="button"
													key={`${listing._id}-${template}`}
													onClick={() => updateReason(listing._id, template)}
													className={`approval-reason-chip ${
														reason === template ? "is-active" : ""
													}`}
												>
													{template}
												</button>
											))}
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2">
										<Link
											to="/admin/listings/$listingId"
											params={{ listingId: listing._id }}
										>
											<Button variant="outline" size="sm">
												Review Details
											</Button>
										</Link>
										<Button
											size="sm"
											onClick={() =>
												void onApprove({
													listingId: listing._id,
													listingLabel,
												})
											}
											disabled={blockingAction}
										>
											{isBusy && activeAction?.type === "approve"
												? "Approving..."
												: "Approve and Publish"}
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() =>
												void onReject({
													listingId: listing._id,
													listingLabel,
												})
											}
											disabled={blockingAction || reason.trim().length === 0}
										>
											{isBusy && activeAction?.type === "reject"
												? "Rejecting..."
												: "Reject with Feedback"}
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</PageShell>
	);
}

function QueueMetric({
	icon,
	label,
	value,
	tone,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	tone: "primary" | "warning" | "muted";
}) {
	const Icon = icon;

	return (
		<div className={`approval-metric-tile tone-${tone}`}>
			<div className="flex items-center gap-3">
				<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-primary">
					<Icon className="size-4" />
				</span>
				<div className="space-y-1">
					<p className="text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
						{label}
					</p>
					<p className="text-lg font-semibold">{value}</p>
				</div>
			</div>
		</div>
	);
}

function Spec({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-0.5">
			<p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</p>
			<p className="font-medium text-foreground">{value}</p>
		</div>
	);
}

function getQueueAgeHours(createdAt: number) {
	return Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)));
}

function formatQueueAge(createdAt: number) {
	const hours = getQueueAgeHours(createdAt);
	if (hours < 1) {
		return "Just submitted";
	}
	if (hours < 24) {
		return `${hours}h in queue`;
	}
	const days = Math.floor(hours / 24);
	return `${days}d in queue`;
}

function formatSubmittedAt(createdAt: number) {
	return new Intl.DateTimeFormat("en-NP", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(createdAt);
}
