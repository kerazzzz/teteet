import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Clock3, Sparkles, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { NEPAL_DISTRICTS } from "@/lib/localization/nepal";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/seller/apply")({
	component: SellerApplicationPage,
});

function SellerApplicationPage() {
	return (
		<RequireAuth>
			<SellerApplicationContent />
		</RequireAuth>
	);
}

function SellerApplicationContent() {
	const user = useCurrentUserProfile();
	const application = useQuery(api.users.getMySellerApplication);
	const submitApplication = useMutation(api.users.submitSellerApplication);

	const [businessName, setBusinessName] = useState("");
	const [operatingDistrict, setOperatingDistrict] = useState("Kathmandu");
	const [contactPhone, setContactPhone] = useState("");
	const [address, setAddress] = useState("");
	const [experienceSummary, setExperienceSummary] = useState("");
	const [inventoryPlan, setInventoryPlan] = useState("");
	const [motivation, setMotivation] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const isSeller = user?.role === "seller" || user?.role === "admin";
	const hasPending = application?.status === "pending";
	const canSubmit = !isSeller && !hasPending;

	const statusMeta = useMemo(() => {
		if (isSeller) {
			return {
				icon: CheckCircle2,
				label: "Seller access is active",
				copy: "Your account already has seller permissions. Open Seller Hub to start publishing listings.",
				tone: "success" as const,
			};
		}

		if (!application) {
			return {
				icon: Sparkles,
				label: "No application submitted yet",
				copy: "Fill the form once. Admins can review and decide directly from their queue.",
				tone: "neutral" as const,
			};
		}

		if (application.status === "pending") {
			return {
				icon: Clock3,
				label: "Application under review",
				copy: "Your application is waiting in the admin queue. You will be notified after a decision.",
				tone: "pending" as const,
			};
		}

		if (application.status === "approved") {
			return {
				icon: CheckCircle2,
				label: "Application approved",
				copy: "You can now access seller tools and submit listings for moderation.",
				tone: "success" as const,
			};
		}

		return {
			icon: XCircle,
			label: "Application needs revision",
			copy:
				application.reviewNotes ??
				"The admin requested more details. Update your form and submit again.",
			tone: "danger" as const,
		};
	}, [application, isSeller]);

	const onSubmit = async () => {
		const trimmedBusinessName = businessName.trim();
		const trimmedPhone = contactPhone.trim();
		const trimmedExperience = experienceSummary.trim();
		const trimmedInventory = inventoryPlan.trim();
		const trimmedMotivation = motivation.trim();

		if (
			!trimmedBusinessName ||
			!trimmedPhone ||
			!trimmedExperience ||
			!trimmedInventory ||
			!trimmedMotivation
		) {
			setError("Complete all required fields before submitting.");
			return;
		}

		setError(null);
		setFeedback(null);
		setIsSubmitting(true);
		try {
			await submitApplication({
				businessName: trimmedBusinessName,
				operatingDistrict,
				contactPhone: trimmedPhone,
				experienceSummary: trimmedExperience,
				inventoryPlan: trimmedInventory,
				motivation: trimmedMotivation,
				address: address.trim() || undefined,
			});
			setFeedback("Application submitted. Admin review is now in progress.");
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Unable to submit application.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const StatusIcon = statusMeta.icon;

	return (
		<PageShell
			title="Become a Seller"
			description="One form, one review queue, and transparent admin feedback."
		>
			<section className="seller-apply-hero rounded-3xl border border-border/75 bg-gradient-to-br from-card via-card/95 to-secondary/20 p-6 sm:p-8">
				<div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-end">
					<div className="space-y-3">
						<Badge variant="secondary" className="w-fit">
							Seller Onboarding
						</Badge>
						<h2 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
							Apply once and let admins review everything in one place.
						</h2>
						<p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
							Share your dealership details, sales plan, and operating area. If rejected,
							you can revise and re-apply with clearer information.
						</p>
					</div>
					<div className="rounded-2xl border border-border/70 bg-background/60 p-4">
						<div className="flex items-start gap-3">
							<StatusIcon className={statusIconTone(statusMeta.tone)} />
							<div className="space-y-1">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
									Current Status
								</p>
								<p className="text-sm font-semibold">{statusMeta.label}</p>
								<p className="text-xs text-muted-foreground">{statusMeta.copy}</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{feedback ? (
				<p className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
					<CheckCircle2 className="size-3.5" />
					{feedback}
				</p>
			) : null}
			{error ? (
				<p className="inline-flex items-center gap-2 rounded-full border border-destructive/35 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
					<AlertCircle className="size-3.5" />
					{error}
				</p>
			) : null}

			<Card className="border-border/75">
				<CardHeader>
					<CardTitle>Seller Application Form</CardTitle>
					<CardDescription>
						All fields are reviewed by admins before role approval.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<Field label="Business or dealership name">
						<Input
							value={businessName}
							onChange={(event) => setBusinessName(event.target.value)}
							disabled={!canSubmit || isSubmitting}
							placeholder="Example: Valley Auto Point"
						/>
					</Field>
					<Field label="Primary phone">
						<Input
							value={contactPhone}
							onChange={(event) => setContactPhone(event.target.value)}
							disabled={!canSubmit || isSubmitting}
							placeholder="98XXXXXXXX"
						/>
					</Field>
					<Field label="Operating district">
						<Select
							value={operatingDistrict}
							onChange={(event) => setOperatingDistrict(event.target.value)}
							disabled={!canSubmit || isSubmitting}
						>
							{NEPAL_DISTRICTS.map((district) => (
								<option key={district} value={district}>
									{district}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Address (optional)">
						<Input
							value={address}
							onChange={(event) => setAddress(event.target.value)}
							disabled={!canSubmit || isSubmitting}
							placeholder="Street, area, city"
						/>
					</Field>
					<div className="space-y-1 sm:col-span-2">
						<Label>Experience summary</Label>
						<Textarea
							value={experienceSummary}
							onChange={(event) => setExperienceSummary(event.target.value)}
							disabled={!canSubmit || isSubmitting}
							placeholder="Tell us your selling history, verification process, and after-sales support."
						/>
					</div>
					<div className="space-y-1 sm:col-span-2">
						<Label>Initial inventory plan</Label>
						<Textarea
							value={inventoryPlan}
							onChange={(event) => setInventoryPlan(event.target.value)}
							disabled={!canSubmit || isSubmitting}
							placeholder="Describe the types of vehicles you plan to list in the first month."
						/>
					</div>
					<div className="space-y-1 sm:col-span-2">
						<Label>Why should buyers trust your listings?</Label>
						<Textarea
							value={motivation}
							onChange={(event) => setMotivation(event.target.value)}
							disabled={!canSubmit || isSubmitting}
							placeholder="Explain your quality standards, documentation readiness, and response speed."
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-wrap items-center gap-2">
				<Button onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
					{isSubmitting ? "Submitting..." : "Submit seller application"}
				</Button>
				{isSeller ? (
					<Link to="/seller/dashboard">
						<Button variant="outline">Open Seller Hub</Button>
					</Link>
				) : (
					<Button variant="outline" disabled>
						Open Seller Hub
					</Button>
				)}
			</div>

			{application?.status === "rejected" ? (
				<Card className="border-destructive/30 bg-destructive/5">
					<CardHeader>
						<CardTitle className="text-base">Latest rejection feedback</CardTitle>
						<CardDescription>
							Use this to revise your next submission.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-destructive">
							{application.reviewNotes ?? "No review note provided."}
						</p>
					</CardContent>
				</Card>
			) : null}
		</PageShell>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label>{label}</Label>
			{children}
		</div>
	);
}

function statusIconTone(tone: "neutral" | "pending" | "success" | "danger") {
	if (tone === "pending") {
		return "mt-0.5 size-5 text-chart-4";
	}

	if (tone === "success") {
		return "mt-0.5 size-5 text-chart-3";
	}

	if (tone === "danger") {
		return "mt-0.5 size-5 text-destructive";
	}

	return "mt-0.5 size-5 text-primary";
}
