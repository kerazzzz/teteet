import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/transactions/")({
	component: TransactionsPage,
});

function TransactionsPage() {
	return (
		<RequireAuth>
			<TransactionsContent />
		</RequireAuth>
	);
}

function TransactionsContent() {
	const transactions = useQuery(api.transactions.listMyTransactions, {
		limit: 100,
	});

	return (
		<PageShell
			title="Transactions"
			description="Track payment and document status."
		>
			{!transactions ? (
				<p>Loading transactions...</p>
			) : transactions.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No transactions yet.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{transactions.map((tx) => (
						<Link
							key={tx._id}
							to="/transactions/$transactionId"
							params={{ transactionId: tx._id }}
						>
							<Card className="hover:bg-muted/40">
								<CardHeader className="flex-row items-center justify-between pb-2">
									<CardTitle className="text-base">
										{formatNpr(tx.amountNpr)}
									</CardTitle>
									<Badge
										variant={tx.status === "paid" ? "secondary" : "outline"}
									>
										{tx.status.replace(/_/g, " ")}
									</Badge>
								</CardHeader>
								<CardContent className="text-sm text-muted-foreground">
									<p>Transaction ID: {tx._id}</p>
									<p>
										Created: {new Date(tx.createdAt).toLocaleString("en-NP")}
									</p>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</PageShell>
	);
}
