import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/seller/listings/$listingId/edit")({
	component: EditSellerListingPage,
});

function EditSellerListingPage() {
	const { listingId } = Route.useParams();
	return (
		<RequireRole roles={["seller", "admin"]}>
			<EditSellerListingContent listingId={listingId as Id<"vehicles">} />
		</RequireRole>
	);
}

function EditSellerListingContent({
	listingId,
}: {
	listingId: Id<"vehicles">;
}) {
	const detail = useQuery(api.vehicles.getById, { listingId });
	const updateDraft = useMutation(api.vehicles.updateDraft);
	const submitForApproval = useMutation(api.vehicles.submitForApproval);
	const generateUploadUrl = useMutation(api.vehicles.generateImageUploadUrl);
	const attachUploadedImage = useMutation(api.vehicles.attachUploadedImage);
	const addInspectionReport = useMutation(api.vehicles.addInspectionReport);

	const [description, setDescription] = useState("");
	const [priceNpr, setPriceNpr] = useState(0);
	const [inspectionSummary, setInspectionSummary] = useState("");
	const fileRef = useRef<HTMLInputElement | null>(null);

	if (!detail) {
		return <PageShell title="Edit Listing" description="Loading listing..." />;
	}

	const listing = detail.listing;

	const onSave = async () => {
		await updateDraft({
			vehicleId: listingId,
			description: description || listing.description,
			priceNpr: priceNpr || listing.priceNpr,
		});
	};

	const onSubmitForApproval = async () => {
		await submitForApproval({ vehicleId: listingId });
	};

	const onUploadImage = async () => {
		const file = fileRef.current?.files?.[0];
		if (!file) return;

		const uploadUrl = await generateUploadUrl({});
		const response = await fetch(uploadUrl, {
			method: "POST",
			headers: { "Content-Type": file.type },
			body: file,
		});

		const { storageId } = await response.json();

		await attachUploadedImage({
			vehicleId: listingId,
			storageId,
			isPrimary: true,
		});
	};

	const onAttachInspection = async () => {
		await addInspectionReport({
			vehicleId: listingId,
			summary: inspectionSummary,
			conditionScore: 75,
			issuedAt: Date.now(),
		});
	};

	const isEditable =
		listing.status === "draft" || listing.status === "rejected";

	return (
		<PageShell
			title="Edit Listing"
			description={`Status: ${listing.status.replace(/_/g, " ")}`}
		>
			<Card>
				<CardHeader>
					<CardTitle>
						{listing.make} {listing.model} ({listing.year})
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-1">
						<Label>Price (NPR)</Label>
						<Input
							type="number"
							value={priceNpr || listing.priceNpr}
							onChange={(e) => setPriceNpr(Number(e.target.value))}
							disabled={!isEditable}
						/>
					</div>
					<div className="space-y-1">
						<Label>Description</Label>
						<Textarea
							value={description || listing.description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={!isEditable}
						/>
					</div>
					<Button onClick={onSave} disabled={!isEditable}>
						Save draft changes
					</Button>
					<Button
						variant="secondary"
						onClick={onSubmitForApproval}
						disabled={!isEditable}
					>
						Submit for admin approval
					</Button>
					{!isEditable ? (
						<p className="text-xs text-muted-foreground">
							Listing is immutable after submission until rejected by admin.
						</p>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Upload Primary Image</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Input
						ref={fileRef}
						type="file"
						accept="image/*"
						disabled={!isEditable}
					/>
					<Button onClick={onUploadImage} disabled={!isEditable}>
						Upload image
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Inspection Report</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Textarea
						value={inspectionSummary}
						onChange={(e) => setInspectionSummary(e.target.value)}
						placeholder="Inspection summary"
						disabled={!isEditable}
					/>
					<Button
						onClick={onAttachInspection}
						disabled={!isEditable || !inspectionSummary}
					>
						Attach report summary
					</Button>
				</CardContent>
			</Card>
		</PageShell>
	);
}
