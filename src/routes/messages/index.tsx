import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/messages/")({
	component: MessagesPage,
});

function MessagesPage() {
	return (
		<RequireAuth>
			<MessagesContent />
		</RequireAuth>
	);
}

function MessagesContent() {
	const chats = useQuery(api.chats.listMyChats);

	return (
		<PageShell title="Messages" description="Buyer-seller conversations.">
			{!chats ? (
				<p>Loading conversations...</p>
			) : chats.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No messages yet. Start from a listing detail page.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{chats.map((chat) => (
						<Link
							key={chat._id}
							to="/messages/$chatId"
							params={{ chatId: chat._id }}
							className="block"
						>
							<Card className="hover:bg-muted/40">
								<CardHeader className="flex-row items-center justify-between pb-2">
									<CardTitle className="text-base">
										{chat.partner?.name ?? "Unknown partner"}
									</CardTitle>
									{chat.unreadCount > 0 ? (
										<Badge>{chat.unreadCount} unread</Badge>
									) : null}
								</CardHeader>
								<CardContent className="text-sm text-muted-foreground">
									<p>
										Listing: {chat.listing?.make} {chat.listing?.model} (
										{chat.listing?.year})
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
