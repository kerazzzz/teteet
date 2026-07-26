import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/transactions")({
	component: AdminTransactionsPage,
});

function AdminTransactionsPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminTransactionsContent />
		</RequireRole>
	);
}

function AdminTransactionsContent() {
	const transactions = useQuery(api.admin.listTransactions, { limit: 300 });

	return (
		<PageShell
			title="All Transactions"
			description="Monitor transaction and payment lifecycle."
		>
			{!transactions ? (
				<p>Loading transactions...</p>
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
									<p>{tx._id}</p>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</PageShell>
	);
}
