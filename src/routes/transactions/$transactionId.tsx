import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/transactions/$transactionId")({
	component: TransactionDetailPage,
});

function TransactionDetailPage() {
	const { transactionId } = Route.useParams();
	return (
		<RequireAuth>
			<TransactionDetailContent
				transactionId={transactionId as Id<"transactions">}
			/>
		</RequireAuth>
	);
}

function TransactionDetailContent({
	transactionId,
}: {
	transactionId: Id<"transactions">;
}) {
	const ratingInputId = useId();
	const [rating, setRating] = useState(5);
	const [comment, setComment] = useState("");

	const bundle = useQuery(api.transactions.getTransaction, {
		transactionId,
	});
	const docs = useQuery(api.documents.getDocumentsForTransaction, {
		transactionId,
	});

	const generateDocs = useMutation(api.documents.generateSaleDocuments);
	const createReview = useMutation(api.reviews.createReview);

	if (!bundle) {
		return (
			<PageShell title="Transaction" description="Loading transaction..." />
		);
	}

	const onGenerateDocs = async () => {
		await generateDocs({ transactionId });
	};

	const onSubmitReview = async () => {
		const tx = bundle.transaction;
		const recipientId =
			tx.buyerId === bundle.buyer?._id ? tx.sellerId : tx.buyerId;

		await createReview({
			transactionId,
			toUserId: recipientId,
			rating,
			comment,
		});

		setComment("");
	};

	return (
		<PageShell
			title="Transaction Detail"
			description="Payment, legal docs, and feedback."
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>{formatNpr(bundle.transaction.amountNpr)}</span>
							<Badge>{bundle.transaction.status.replace(/_/g, " ")}</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<p>
							Vehicle: {bundle.vehicle?.make} {bundle.vehicle?.model} (
							{bundle.vehicle?.year})
						</p>
						<p>Buyer: {bundle.buyer?.name}</p>
						<p>Seller: {bundle.seller?.name}</p>
						<p>
							Payment Provider:{" "}
							{bundle.transaction.paymentProvider ?? "Not selected"}
						</p>
						<Button onClick={onGenerateDocs}>Generate Documents</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Documents</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						{!docs || docs.length === 0 ? (
							<p className="text-muted-foreground">
								No generated documents yet.
							</p>
						) : (
							docs.map((doc) => (
								<a
									className="block rounded-md border px-3 py-2 hover:bg-accent"
									key={doc._id}
									href={doc.url ?? "#"}
									target="_blank"
									rel="noreferrer"
								>
									{doc.documentType.replace(/_/g, " ")}
								</a>
							))
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Leave a Review</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="max-w-xs">
						<Label htmlFor={ratingInputId} className="mb-1 block text-sm">
							Rating (1-5)
						</Label>
						<Input
							id={ratingInputId}
							type="number"
							min={1}
							max={5}
							value={rating}
							onChange={(e) => setRating(Number(e.target.value))}
						/>
					</div>
					<Textarea
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Share your transaction experience"
					/>
					<Button onClick={onSubmitReview}>Submit review</Button>
				</CardContent>
			</Card>
		</PageShell>
	);
}
