import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useId, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/listings/$listingId")({
	component: ListingDetailPage,
});

function ListingDetailPage() {
	const { listingId } = Route.useParams();
	const navigate = useNavigate();
	const { isSignedIn } = useAuth();
	const profile = useCurrentUserProfile();
	const listingDocId = listingId as Id<"vehicles">;
	const providerSelectId = useId();
	const [provider, setProvider] = useState<"esewa" | "khalti">("esewa");
	const [error, setError] = useState<string | null>(null);

	const detail = useQuery(api.vehicles.getById, {
		listingId: listingDocId,
	});
	const reviews = useQuery(api.reviews.listForListingPublic, {
		listingId: listingDocId,
	});
	const gateways = useQuery(api.payments.getGatewayAvailability);

	const incrementView = useMutation(api.vehicles.incrementView);
	const createOrGetChat = useMutation(api.chats.createOrGetChat);
	const createTransaction = useMutation(api.transactions.createTransaction);
	const createPaymentIntent = useMutation(api.payments.createPaymentIntent);
	const canUsePrivateActions = isSignedIn && !!profile;

	useEffect(() => {
		if (!listingId) return;
		void incrementView({ vehicleId: listingDocId });
	}, [incrementView, listingId, listingDocId]);

	const onMessageSeller = async () => {
		setError(null);
		if (!canUsePrivateActions) {
			setError("Please wait while your account connection is finalized.");
			return;
		}
		try {
			const chatId = await createOrGetChat({ listingId: listingDocId });
			await navigate({ to: "/messages/$chatId", params: { chatId } });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to start chat");
		}
	};

	const onBuyNow = async () => {
		setError(null);
		if (!canUsePrivateActions) {
			setError("Please wait while your account connection is finalized.");
			return;
		}
		try {
			const txId = await createTransaction({
				vehicleId: listingDocId,
				paymentProvider: provider,
			});
			const intent = await createPaymentIntent({
				transactionId: txId,
				provider,
			});
			window.open(intent.checkoutUrl, "_blank", "noopener,noreferrer");
			await navigate({
				to: "/transactions/$transactionId",
				params: { transactionId: txId },
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Checkout failed");
		}
	};

	if (detail === undefined) {
		return <PageShell title="Listing" description="Loading listing..." />;
	}

	if (!detail) {
		return (
			<PageShell
				title="Listing not found"
				description="This listing does not exist or is no longer available."
			/>
		);
	}

	const { listing, seller, images, inspectionReport, latestEvaluation } =
		detail;

	return (
		<PageShell
			title={listing.title}
			description={`${listing.make} ${listing.model} • ${listing.year}`}
		>
			<div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<div className="flex flex-wrap items-center gap-2">
								<Badge>{listing.status.replace(/_/g, " ")}</Badge>
								<span className="text-sm text-muted-foreground">
									{listing.locationDistrict}
								</span>
							</div>
							<CardTitle className="text-2xl">
								{formatNpr(listing.priceNpr)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<p>{listing.description}</p>
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div>Mileage: {listing.mileage.toLocaleString()} km</div>
								<div>Fuel: {listing.fuelType}</div>
								<div>Transmission: {listing.transmission}</div>
								<div>Condition: {listing.condition}</div>
							</div>
						</CardContent>
					</Card>

					{images.length > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle>Vehicle Images</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-3 sm:grid-cols-2">
								{images.map((image) => (
									<div
										key={image._id}
										className="overflow-hidden rounded-lg border bg-muted"
									>
										{image.url ? (
											<img
												src={image.url}
												alt="Vehicle"
												className="h-44 w-full object-cover"
											/>
										) : (
											<div className="flex h-44 items-center justify-center text-xs text-muted-foreground">
												Image unavailable
											</div>
										)}
									</div>
								))}
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardHeader>
							<CardTitle>Inspection & Price Evaluation</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							{inspectionReport ? (
								<>
									<p>{inspectionReport.summary}</p>
									<p>Condition score: {inspectionReport.conditionScore}/100</p>
								</>
							) : (
								<p className="text-muted-foreground">
									No inspection report attached.
								</p>
							)}
							<Separator />
							{latestEvaluation ? (
								<div className="space-y-1">
									<p>
										Estimated fair range:{" "}
										{formatNpr(latestEvaluation.minPriceNpr)} -{" "}
										{formatNpr(latestEvaluation.maxPriceNpr)}
									</p>
									<p className="text-muted-foreground">
										Confidence: {(latestEvaluation.confidence * 100).toFixed(0)}
										%
									</p>
								</div>
							) : (
								<p className="text-muted-foreground">
									No price evaluation available yet.
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Buyer Reviews</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{!reviews || reviews.length === 0 ? (
								<p className="text-sm text-muted-foreground">No reviews yet.</p>
							) : (
								reviews.map((review) => (
									<div
										key={review._id}
										className="rounded-lg border p-3 text-sm"
									>
										<p className="font-medium">Rating: {review.rating}/5</p>
										<p className="text-muted-foreground">
											{review.comment || "No comment"}
										</p>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Seller</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<p className="font-medium">{seller?.name ?? "Unknown seller"}</p>
							<p className="text-muted-foreground">{seller?.email ?? "-"}</p>
							<p className="text-muted-foreground">
								{seller?.phone ?? "Phone unavailable"}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<Button
								className="w-full"
								disabled={!canUsePrivateActions}
								onClick={onMessageSeller}
							>
								Message seller
							</Button>

							<div className="space-y-1">
								<Label
									htmlFor={providerSelectId}
									className="text-sm font-medium"
								>
									Payment Provider
								</Label>
								<Select
									id={providerSelectId}
									value={provider}
									onChange={(e) =>
										setProvider(e.target.value as "esewa" | "khalti")
									}
								>
									<option value="esewa">eSewa</option>
									<option value="khalti">Khalti</option>
								</Select>
							</div>

							<Button
								className="w-full"
								onClick={onBuyNow}
								disabled={
									!canUsePrivateActions ||
									!gateways ||
									(provider === "esewa" ? !gateways.esewa : !gateways.khalti)
								}
							>
								Buy now
							</Button>
							<p className="text-xs text-muted-foreground">
								Checkout is enabled after account sync and gateway
								configuration.
							</p>
							{error ? (
								<p className="text-xs text-destructive">{error}</p>
							) : null}
						</CardContent>
					</Card>
				</div>
			</div>
		</PageShell>
	);
}
