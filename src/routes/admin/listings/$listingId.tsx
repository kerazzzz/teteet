import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	ArrowLeft,
	BadgeCheck,
	CalendarDays,
	CheckCircle2,
	CircleDollarSign,
	Clock3,
	Gauge,
	ImageIcon,
	Mail,
	MapPin,
	Phone,
	ShieldCheck,
	UserRound,
	XCircle,
} from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/listings/$listingId")({
	component: AdminListingReviewPage,
});

const REJECTION_TEMPLATES = [
	"Please add a complete photo set (exterior, interior, odometer, and tires).",
	"Description is incomplete. Please include ownership history and service records.",
	"Price seems outside market expectations. Provide condition details to justify valuation.",
	"Attach a valid inspection report before requesting publication.",
] as const;

function AdminListingReviewPage() {
	const { listingId } = Route.useParams();
	return (
		<RequireRole roles={["admin"]}>
			<AdminListingReviewContent listingId={listingId as Id<"vehicles">} />
		</RequireRole>
	);
}

function AdminListingReviewContent({
	listingId,
}: {
	listingId: Id<"vehicles">;
}) {
	const navigate = useNavigate();
	const [reason, setReason] = useState(REJECTION_TEMPLATES[0]);
	const [activeDecision, setActiveDecision] = useState<
		"approve" | "reject" | null
	>(null);
	const [error, setError] = useState<string | null>(null);

	const detail = useQuery(api.vehicles.getById, { listingId });
	const publish = useMutation(api.vehicles.publishByAdmin);
	const reject = useMutation(api.vehicles.rejectByAdmin);

	if (detail === undefined) {
		return (
			<PageShell
				title="Listing Approval Workspace"
				description="Loading listing context and moderation controls..."
			>
				<Card className="approval-panel-card animate-pulse">
					<CardHeader className="space-y-3">
						<div className="h-5 w-32 rounded-full bg-muted/70" />
						<div className="h-9 w-3/4 rounded bg-muted/70" />
						<div className="h-4 w-2/3 rounded bg-muted/70" />
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="h-4 w-full rounded bg-muted/60" />
						<div className="h-4 w-5/6 rounded bg-muted/60" />
						<div className="h-24 w-full rounded-2xl bg-muted/60" />
					</CardContent>
				</Card>
			</PageShell>
		);
	}

	if (!detail) {
		return (
			<PageShell
				title="Listing not found"
				description="This listing may have been removed or is no longer available for moderation."
			>
				<Link to="/admin/listings/pending">
					<Button variant="outline" size="sm">
						<ArrowLeft className="size-4" />
						Back to Approval Queue
					</Button>
				</Link>
			</PageShell>
		);
	}

	const { listing, seller, inspectionReport } = detail;
	const marketEvaluation = detail.latestEvaluation;
	const imageCount = detail.images.length;

	const hasInspection = Boolean(inspectionReport);
	const photosStatus =
		imageCount >= 4 ? "pass" : imageCount > 0 ? "warn" : "fail";
	const priceInRange = marketEvaluation
		? listing.priceNpr >= marketEvaluation.minPriceNpr &&
			listing.priceNpr <= marketEvaluation.maxPriceNpr
		: null;

	const checklist = [
		{
			title: "Inspection report attached",
			description: hasInspection
				? `Condition score ${inspectionReport?.conditionScore}/100`
				: "No inspection report attached.",
			status: hasInspection ? "pass" : "warn",
		},
		{
			title: "Sufficient photo evidence",
			description: `${imageCount} image${imageCount === 1 ? "" : "s"} uploaded.`,
			status: photosStatus,
		},
		{
			title: "Price aligned with market range",
			description: marketEvaluation
				? `Expected ${formatNpr(marketEvaluation.minPriceNpr)} - ${formatNpr(marketEvaluation.maxPriceNpr)}`
				: "No market evaluation generated yet.",
			status: priceInRange === null ? "warn" : priceInRange ? "pass" : "fail",
		},
	] as const;

	const approvedSignals = checklist.filter(
		(item) => item.status === "pass",
	).length;

	const marketSignal = marketEvaluation
		? {
				inRange:
					listing.priceNpr >= marketEvaluation.minPriceNpr &&
					listing.priceNpr <= marketEvaluation.maxPriceNpr,
				percentDelta:
					((listing.priceNpr - marketEvaluation.averagePriceNpr) /
						marketEvaluation.averagePriceNpr) *
					100,
				confidence: Math.round(marketEvaluation.confidence * 100),
			}
		: null;

	const handleApprove = async () => {
		setError(null);
		setActiveDecision("approve");
		try {
			await publish({ vehicleId: listingId });
			await navigate({ to: "/admin/listings/pending" });
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to approve listing.",
			);
		} finally {
			setActiveDecision(null);
		}
	};

	const handleReject = async () => {
		const trimmedReason = reason.trim();
		if (!trimmedReason) {
			setError("A rejection reason is required before rejecting this listing.");
			return;
		}

		setError(null);
		setActiveDecision("reject");
		try {
			await reject({ vehicleId: listingId, reason: trimmedReason });
			await navigate({ to: "/admin/listings/pending" });
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Unable to reject listing.",
			);
		} finally {
			setActiveDecision(null);
		}
	};

	return (
		<PageShell
			title="Listing Approval Workspace"
			description="Review seller context, listing quality, and market signals before deciding."
			className="pb-16"
		>
			<div className="flex flex-wrap items-center gap-2">
				<Link to="/admin/listings/pending">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="size-4" />
						Back to Queue
					</Button>
				</Link>
				<Link to="/listings/$listingId" params={{ listingId }}>
					<Button variant="outline" size="sm">
						Open Buyer Preview
					</Button>
				</Link>
			</div>

			<section className="approval-command-hero p-6 sm:p-8">
				<div className="relative z-10 space-y-5">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Moderation Workspace</Badge>
						<Badge variant="outline" className="inline-flex items-center gap-1">
							<BadgeCheck className="size-3.5" />
							{listing.status.replace(/_/g, " ")}
						</Badge>
					</div>
					<div className="space-y-2">
						<h2 className="max-w-3xl text-2xl leading-tight font-semibold sm:text-3xl">
							{listing.make} {listing.model} ({listing.year})
						</h2>
						<p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
							{listing.title}
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<DetailMetric
							icon={CircleDollarSign}
							label="Listing Price"
							value={formatNpr(listing.priceNpr)}
						/>
						<DetailMetric
							icon={Clock3}
							label="Queue Age"
							value={formatQueueAge(listing.createdAt)}
						/>
						<DetailMetric
							icon={ImageIcon}
							label="Uploaded Images"
							value={imageCount.toString()}
						/>
						<DetailMetric
							icon={Gauge}
							label="Valuation Confidence"
							value={
								marketSignal ? `${marketSignal.confidence}%` : "Not available"
							}
						/>
					</div>
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
				<div className="space-y-5">
					<Card className="approval-panel-card">
						<CardHeader>
							<CardTitle>Vehicle Dossier</CardTitle>
							<CardDescription>
								Key facts buyers will see first. Validate accuracy before
								publishing.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="grid gap-3 rounded-2xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
								<DetailItem label="Make" value={listing.make} />
								<DetailItem label="Model" value={listing.model} />
								<DetailItem label="Year" value={listing.year.toString()} />
								<DetailItem label="Condition" value={listing.condition} />
								<DetailItem label="Fuel Type" value={listing.fuelType} />
								<DetailItem label="Transmission" value={listing.transmission} />
								<DetailItem
									label="Mileage"
									value={`${listing.mileage.toLocaleString()} km`}
								/>
								<DetailItem label="District" value={listing.locationDistrict} />
								<DetailItem
									label="Submitted"
									value={formatDateTime(listing.createdAt)}
								/>
							</div>
							<div className="rounded-2xl border border-border/70 bg-background/55 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
									Description
								</p>
								<p className="mt-2 text-sm leading-relaxed">
									{listing.description}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="approval-panel-card">
						<CardHeader>
							<CardTitle>Seller Context</CardTitle>
							<CardDescription>
								Contact identity and listing metadata for escalation decisions.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-3 sm:grid-cols-2">
								<SellerFact
									icon={UserRound}
									label="Seller Name"
									value={seller?.name ?? "Unknown seller"}
								/>
								<SellerFact
									icon={Mail}
									label="Email"
									value={seller?.email ?? "-"}
								/>
								<SellerFact
									icon={Phone}
									label="Phone"
									value={seller?.phone ?? "Unavailable"}
								/>
								<SellerFact
									icon={MapPin}
									label="Listing District"
									value={listing.locationDistrict}
								/>
								<SellerFact
									icon={CalendarDays}
									label="Submitted At"
									value={formatDateTime(listing.createdAt)}
								/>
								<SellerFact
									icon={Clock3}
									label="Queue Duration"
									value={formatQueueAge(listing.createdAt)}
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="approval-panel-card">
						<CardHeader>
							<CardTitle>Inspection and Market Signals</CardTitle>
							<CardDescription>
								Use structured quality and valuation data to reduce decision
								variance across moderators.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{inspectionReport ? (
								<div className="space-y-3 rounded-2xl border border-border/70 bg-background/55 p-4">
									<p className="text-sm">{inspectionReport.summary}</p>
									<div className="space-y-1.5">
										<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
											Condition Score {inspectionReport.conditionScore}/100
										</p>
										<div className="h-2 overflow-hidden rounded-full bg-muted">
											<div
												className="h-full rounded-full bg-primary transition-all"
												style={{
													width: `${Math.max(
														0,
														Math.min(inspectionReport.conditionScore, 100),
													)}%`,
												}}
											/>
										</div>
									</div>
								</div>
							) : (
								<div className="rounded-2xl border border-destructive/40 bg-destructive/8 p-4 text-sm text-destructive">
									Inspection report is missing. Consider rejecting until
									inspection evidence is attached.
								</div>
							)}

							{marketEvaluation ? (
								<div className="space-y-3 rounded-2xl border border-border/70 bg-background/55 p-4">
									<div className="flex flex-wrap items-center gap-2">
										<Badge
											variant={
												marketSignal?.inRange ? "secondary" : "destructive"
											}
										>
											{marketSignal?.inRange
												? "Price in expected range"
												: "Price outside expected range"}
										</Badge>
										<p className="text-xs text-muted-foreground">
											Confidence {marketSignal?.confidence ?? 0}%
										</p>
									</div>
									<p className="text-sm">
										Fair range: {formatNpr(marketEvaluation.minPriceNpr)} -{" "}
										{formatNpr(marketEvaluation.maxPriceNpr)}
									</p>
									<p className="text-sm text-muted-foreground">
										Listing is{" "}
										<span className="font-semibold text-foreground">
											{Math.abs(marketSignal?.percentDelta ?? 0).toFixed(1)}%
										</span>{" "}
										{(marketSignal?.percentDelta ?? 0) >= 0 ? "above" : "below"}{" "}
										the evaluation average.
									</p>
								</div>
							) : (
								<div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
									No market evaluation generated for this listing yet.
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="approval-panel-card">
						<CardHeader>
							<CardTitle>Photo Evidence</CardTitle>
							<CardDescription>
								Check that visual quality and coverage are sufficient for
								buyers.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{detail.images.length === 0 ? (
								<div className="rounded-2xl border border-destructive/35 bg-destructive/8 p-4 text-sm text-destructive">
									No images uploaded. Reject listing until image evidence is
									provided.
								</div>
							) : (
								<div className="grid gap-3 sm:grid-cols-2">
									{detail.images.map((image) => (
										<div
											key={image._id}
											className="group relative overflow-hidden rounded-2xl border border-border/70 bg-muted/40"
										>
											{image.url ? (
												<img
													src={image.url}
													alt="Vehicle evidence"
													className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
												/>
											) : (
												<div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
													Image unavailable
												</div>
											)}
											{image.isPrimary ? (
												<span className="absolute left-3 top-3 rounded-full border border-primary/40 bg-primary/95 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground">
													Primary
												</span>
											) : null}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-5 xl:sticky xl:top-7 xl:self-start">
					<Card className="approval-decision-card">
						<CardHeader>
							<CardTitle>Final Decision</CardTitle>
							<CardDescription>
								Approvals publish immediately. Rejections should include a clear
								actionable reason.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{error ? (
								<p className="inline-flex w-fit items-center gap-2 rounded-full border border-destructive/35 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
									<XCircle className="size-3.5" />
									{error}
								</p>
							) : null}

							<div className="space-y-2">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
									Rejection Reason
								</p>
								<Textarea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="Tell the seller exactly what to change before resubmitting."
									className="min-h-24"
								/>
								<div className="flex flex-wrap gap-2">
									{REJECTION_TEMPLATES.map((template) => (
										<button
											type="button"
											key={template}
											onClick={() => setReason(template)}
											className={`approval-reason-chip ${
												reason === template ? "is-active" : ""
											}`}
										>
											{template}
										</button>
									))}
								</div>
							</div>

							<div className="grid gap-2">
								<Button
									onClick={() => void handleApprove()}
									disabled={activeDecision !== null}
								>
									<ShieldCheck className="size-4" />
									{activeDecision === "approve"
										? "Publishing..."
										: "Approve and Publish"}
								</Button>
								<Button
									variant="destructive"
									onClick={() => void handleReject()}
									disabled={
										activeDecision !== null || reason.trim().length === 0
									}
								>
									<XCircle className="size-4" />
									{activeDecision === "reject"
										? "Rejecting..."
										: "Reject with Feedback"}
								</Button>
							</div>

							<p className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
								This action updates listing status immediately and records an
								admin moderation event in the audit log.
							</p>
						</CardContent>
					</Card>

					<Card className="approval-panel-card">
						<CardHeader>
							<CardTitle>Readiness Checklist</CardTitle>
							<CardDescription>
								{approvedSignals}/{checklist.length} quality signals currently
								passing.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{checklist.map((item) => (
								<ChecklistRow
									key={item.title}
									title={item.title}
									description={item.description}
									status={item.status}
								/>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</PageShell>
	);
}

function DetailMetric({
	icon,
	label,
	value,
}: {
	icon: typeof CircleDollarSign;
	label: string;
	value: string;
}) {
	const Icon = icon;

	return (
		<div className="approval-metric-tile tone-muted">
			<div className="flex items-center gap-3">
				<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-primary">
					<Icon className="size-4" />
				</span>
				<div className="space-y-1">
					<p className="text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
						{label}
					</p>
					<p className="text-base font-semibold">{value}</p>
				</div>
			</div>
		</div>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-0.5 rounded-xl border border-border/60 bg-background/55 p-3">
			<p className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</p>
			<p className="text-sm font-medium text-foreground">{value}</p>
		</div>
	);
}

function SellerFact({
	icon,
	label,
	value,
}: {
	icon: typeof UserRound;
	label: string;
	value: string;
}) {
	const Icon = icon;

	return (
		<div className="rounded-xl border border-border/65 bg-background/55 p-3">
			<p className="mb-2 inline-flex items-center gap-2 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				<Icon className="size-3.5" />
				{label}
			</p>
			<p className="text-sm font-medium">{value}</p>
		</div>
	);
}

function ChecklistRow({
	title,
	description,
	status,
}: {
	title: string;
	description: string;
	status: "pass" | "warn" | "fail";
}) {
	const icon =
		status === "pass"
			? CheckCircle2
			: status === "warn"
				? AlertTriangle
				: XCircle;
	const Icon = icon;

	return (
		<div className={`approval-check-item is-${status}`}>
			<div className="mt-0.5 shrink-0">
				<Icon className="size-4" />
			</div>
			<div className="space-y-0.5">
				<p className="text-sm font-semibold">{title}</p>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

function formatQueueAge(createdAt: number) {
	const hours = Math.max(
		0,
		Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)),
	);
	if (hours < 1) {
		return "Just submitted";
	}
	if (hours < 24) {
		return `${hours}h`;
	}
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

function formatDateTime(timestamp: number) {
	return new Intl.DateTimeFormat("en-NP", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(timestamp);
}
