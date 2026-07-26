import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/seller/inquiries")({
	component: SellerInquiriesPage,
});

function SellerInquiriesPage() {
	return (
		<RequireRole roles={["seller", "admin"]}>
			<SellerInquiriesContent />
		</RequireRole>
	);
}

function SellerInquiriesContent() {
	const chats = useQuery(api.chats.listMyChats);

	return (
		<PageShell
			title="Buyer Inquiries"
			description="Respond to incoming buyer messages."
		>
			{!chats ? (
				<p>Loading inquiries...</p>
			) : chats.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No inquiries yet.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{chats.map((chat) => (
						<Link
							key={chat._id}
							to="/messages/$chatId"
							params={{ chatId: chat._id }}
						>
							<Card className="hover:bg-muted/40">
								<CardHeader className="flex-row items-center justify-between pb-2">
									<CardTitle className="text-base">
										{chat.partner?.name ?? "Unknown buyer"}
									</CardTitle>
									{chat.unreadCount > 0 ? (
										<Badge>{chat.unreadCount} unread</Badge>
									) : null}
								</CardHeader>
								<CardContent className="text-sm text-muted-foreground">
									{chat.listing?.make} {chat.listing?.model}
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</PageShell>
	);
}
