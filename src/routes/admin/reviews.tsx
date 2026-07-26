import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/reviews")({
	component: AdminReviewsPage,
});

function AdminReviewsPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminReviewsContent />
		</RequireRole>
	);
}

function AdminReviewsContent() {
	const reviews = useQuery(api.admin.listReviews, {
		moderationStatus: "flagged",
		limit: 300,
	});
	const moderate = useMutation(api.reviews.moderateReview);

	return (
		<PageShell
			title="Review Moderation"
			description="Flagged reviews requiring admin action."
		>
			{!reviews ? (
				<p>Loading reviews...</p>
			) : reviews.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No flagged reviews.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{reviews.map((review) => (
						<Card key={review._id}>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									Rating {review.rating}/5
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<p>{review.comment || "No comment"}</p>
								<div className="flex gap-2">
									<Button
										size="sm"
										onClick={() =>
											moderate({
												reviewId: review._id,
												moderationStatus: "visible",
											})
										}
									>
										Keep visible
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() =>
											moderate({
												reviewId: review._id,
												moderationStatus: "hidden",
											})
										}
									>
										Hide review
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</PageShell>
	);
}
