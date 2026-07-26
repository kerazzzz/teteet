import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock3,
	type LucideIcon,
	Search,
	ShieldCheck,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/sellers/applications")({
	component: AdminSellerApplicationsPage,
});

function AdminSellerApplicationsPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminSellerApplicationsContent />
		</RequireRole>
	);
}

function AdminSellerApplicationsContent() {
	const applications = useQuery(api.admin.listSellerApplications, { limit: 250 });
	const globalStats = useQuery(api.admin.sellerApplicationStats);
	const approve = useMutation(api.users.approveSellerApplication);
	const reject = useMutation(api.users.rejectSellerApplication);

	const [search, setSearch] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [activeAction, setActiveAction] = useState<{
		applicationId: Id<"sellerApplications">;
		type: "approve" | "reject";
	} | null>(null);
	const [reasonById, setReasonById] = useState<Record<string, string>>({});

	const pendingOnly = useMemo(() => {
		if (!applications) {
			return [];
		}

		return applications.filter((application) => application.status === "pending");
	}, [applications]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) {
			return pendingOnly;
		}

		return pendingOnly.filter((application) => {
			const haystack = `${application.businessName} ${application.operatingDistrict} ${application.contactPhone} ${application.applicant?.name ?? ""} ${application.applicant?.email ?? ""}`.toLowerCase();
			return haystack.includes(query);
		});
	}, [pendingOnly, search]);

	const getReason = (applicationId: Id<"sellerApplications">) =>
		reasonById[applicationId] ?? "";

	const setReason = (applicationId: Id<"sellerApplications">, value: string) => {
		setReasonById((current) => ({
			...current,
			[applicationId]: value,
		}));
	};

	const onApprove = async (applicationId: Id<"sellerApplications">, label: string) => {
		setError(null);
		setFeedback(null);
		setActiveAction({ applicationId, type: "approve" });
		try {
			await approve({ applicationId });
			setFeedback(`${label} was approved and upgraded to seller.`);
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Unable to approve application.",
			);
		} finally {
			setActiveAction(null);
		}
	};

	const onReject = async (applicationId: Id<"sellerApplications">, label: string) => {
		const reason = getReason(applicationId).trim();
		if (!reason) {
			setError("Provide a rejection reason before rejecting this application.");
			return;
		}

		setError(null);
		setFeedback(null);
		setActiveAction({ applicationId, type: "reject" });
		try {
			await reject({ applicationId, reason });
			setFeedback(`${label} was rejected with feedback.`);
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Unable to reject application.",
			);
		} finally {
			setActiveAction(null);
		}
	};

	return (
		<PageShell
			title="Seller Application Queue"
			description="Review buyer onboarding requests and control seller access with clear decisions."
		>
			<section className="seller-approval-hero rounded-3xl border border-border/75 bg-gradient-to-br from-card via-card/95 to-chart-2/12 p-6 sm:p-8">
				<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-end">
					<div className="space-y-3">
						<Badge variant="secondary" className="w-fit">
							Seller Access Moderation
						</Badge>
						<h2 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
							Keep onboarding fast while preserving trust and listing quality.
						</h2>
						<p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
							Each request includes business profile, inventory strategy, and motivation.
							Approve trusted applicants, reject unclear submissions with actionable notes.
						</p>
						{feedback ? (
							<p className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
								<CheckCircle2 className="size-3.5" />
								{feedback}
							</p>
						) : null}
						{error ? (
							<p className="inline-flex items-center gap-2 rounded-full border border-destructive/35 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
								<AlertTriangle className="size-3.5" />
								{error}
							</p>
						) : null}
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
						<QueueMetric
							icon={Clock3}
							label="Pending"
							value={(globalStats?.pendingCount ?? 0).toString()}
						/>
						<QueueMetric
							icon={ShieldCheck}
							label="Approved"
							value={(globalStats?.approvedCount ?? 0).toString()}
						/>
						<QueueMetric
							icon={XCircle}
							label="Rejected"
							value={(globalStats?.rejectedCount ?? 0).toString()}
						/>
						<QueueMetric
							icon={AlertTriangle}
							label="Avg Pending Wait"
							value={`${globalStats?.avgPendingWaitHours ?? 0}h`}
						/>
					</div>
				</div>
			</section>

			<Card className="border-border/75">
				<CardHeader>
					<CardTitle className="text-xl">Search Pending Applications</CardTitle>
					<CardDescription>
						Filter by applicant name, email, business name, district, or phone.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search applicants and business details"
							className="pl-9"
						/>
					</div>
				</CardContent>
			</Card>

			{applications === undefined ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						Loading seller applications...
					</CardContent>
				</Card>
			) : filtered.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No pending applications match your current filter.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{filtered.map((application) => {
						const busy = activeAction?.applicationId === application._id;
						const applicantName = application.applicant?.name ?? "Unknown applicant";

						return (
							<Card key={application._id} className="border-border/75">
								<CardHeader className="space-y-3 pb-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div>
											<CardTitle className="text-lg">{applicantName}</CardTitle>
											<CardDescription>
												{application.applicant?.email ?? "No email"}
											</CardDescription>
										</div>
										<Badge variant="outline">Submitted {formatWhen(application.submittedAt)}</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										<Detail label="Business" value={application.businessName} />
										<Detail label="District" value={application.operatingDistrict} />
										<Detail label="Phone" value={application.contactPhone} />
									</div>

									<div className="grid gap-3 lg:grid-cols-3">
										<ReviewBlock
											title="Experience"
											value={application.experienceSummary}
										/>
										<ReviewBlock
											title="Inventory plan"
											value={application.inventoryPlan}
										/>
										<ReviewBlock title="Motivation" value={application.motivation} />
									</div>

									<div className="space-y-1">
										<Label>Rejection reason (required if rejecting)</Label>
										<Textarea
											value={getReason(application._id)}
											onChange={(event) => setReason(application._id, event.target.value)}
											placeholder="Explain what they should improve before reapplying."
											disabled={busy}
										/>
									</div>

									<div className="flex flex-wrap gap-2">
										<Button
											onClick={() => onApprove(application._id, applicantName)}
											disabled={busy}
										>
											Approve seller access
										</Button>
										<Button
											variant="destructive"
											onClick={() => onReject(application._id, applicantName)}
											disabled={busy}
										>
											Reject with reason
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
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/62 px-3 py-2.5">
			<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
				<Icon className="size-3.5" />
				{label}
			</div>
			<p className="mt-1 text-lg font-semibold">{value}</p>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
			<p className="text-[0.67rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium">{value}</p>
		</div>
	);
}

function ReviewBlock({ title, value }: { title: string; value: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/60 p-3">
			<p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
				{title}
			</p>
			<p className="mt-2 text-sm text-foreground/90">{value}</p>
		</div>
	);
}

function formatWhen(timestamp: number) {
	return new Intl.DateTimeFormat("en-NP", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(timestamp);
}
