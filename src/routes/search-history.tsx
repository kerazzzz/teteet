import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/search-history")({
	component: SearchHistoryPage,
});

function SearchHistoryPage() {
	return (
		<RequireAuth>
			<SearchHistoryContent />
		</RequireAuth>
	);
}

function SearchHistoryContent() {
	const history = useQuery(api.search.getRecentSearches, { limit: 100 });

	return (
		<PageShell title="Search History" description="Your recent saved searches.">
			{!history ? (
				<p>Loading history...</p>
			) : history.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No search history yet.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{history.map((entry) => (
						<Card key={entry._id}>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									{entry.query || "(empty query)"}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-1 text-sm">
								<p className="text-muted-foreground break-all">
									{entry.filters}
								</p>
								<p className="text-xs text-muted-foreground">
									{new Date(entry.createdAt).toLocaleString("en-NP")}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</PageShell>
	);
}
