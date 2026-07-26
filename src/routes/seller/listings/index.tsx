import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/seller/listings/")({
	component: SellerListingsPage,
});

function SellerListingsPage() {
	return (
		<RequireRole roles={["seller", "admin"]}>
			<SellerListingsContent />
		</RequireRole>
	);
}

function SellerListingsContent() {
	const listings = useQuery(api.vehicles.getSellerListings, {});
	const submit = useMutation(api.vehicles.submitForApproval);
	const remove = useMutation(api.vehicles.deleteDraft);

	return (
		<PageShell
			title="My Listings"
			description="Create, edit, submit, and track listing moderation status."
		>
			<div className="flex justify-end">
				<Link to="/seller/listings/new">
					<Button>Create listing</Button>
				</Link>
			</div>

			{!listings ? (
				<p>Loading listings...</p>
			) : listings.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No listings yet.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{listings.map((listing) => (
						<Card key={listing._id}>
							<CardHeader className="flex-row items-center justify-between pb-2">
								<CardTitle className="text-base">
									{listing.make} {listing.model} ({listing.year})
								</CardTitle>
								<Badge
									variant={listing.status === "live" ? "secondary" : "outline"}
								>
									{listing.status.replace(/_/g, " ")}
								</Badge>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-2">
								<Link
									to="/seller/listings/$listingId/edit"
									params={{ listingId: listing._id }}
								>
									<Button variant="outline" size="sm">
										Edit
									</Button>
								</Link>
								<Button
									size="sm"
									onClick={() => submit({ vehicleId: listing._id })}
									disabled={
										listing.status !== "draft" && listing.status !== "rejected"
									}
								>
									Submit for approval
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => remove({ vehicleId: listing._id })}
									disabled={listing.status === "sold"}
								>
									Delete
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</PageShell>
	);
}
