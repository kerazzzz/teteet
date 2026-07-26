import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/messages/$chatId")({
	component: ChatDetailPage,
});

function ChatDetailPage() {
	const { chatId } = Route.useParams();
	return (
		<RequireAuth>
			<ChatDetailContent chatId={chatId as Id<"chats">} />
		</RequireAuth>
	);
}

function ChatDetailContent({ chatId }: { chatId: Id<"chats"> }) {
	const [text, setText] = useState("");

	const messages = useQuery(api.chats.listMessages, {
		chatId,
		limit: 200,
	});

	const sendMessage = useMutation(api.chats.sendMessage);
	const markRead = useMutation(api.chats.markRead);

	useEffect(() => {
		void markRead({ chatId });
	}, [chatId, markRead]);

	const onSend = async () => {
		if (!text.trim()) return;
		await sendMessage({ chatId, body: text });
		setText("");
	};

	return (
		<PageShell title="Chat" description="Secure buyer-seller chat.">
			<Card>
				<CardContent className="space-y-3 pt-6">
					<div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border p-3">
						{!messages ? (
							<p className="text-sm text-muted-foreground">
								Loading messages...
							</p>
						) : messages.length === 0 ? (
							<p className="text-sm text-muted-foreground">No messages yet.</p>
						) : (
							messages.map((message) => (
								<div
									key={message._id}
									className="rounded-md border p-2 text-sm"
								>
									<p>{message.body}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{new Date(message.createdAt).toLocaleString("en-NP")}
									</p>
								</div>
							))
						)}
					</div>

					<div className="flex gap-2">
						<Input
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Type your message"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									void onSend();
								}
							}}
						/>
						<Button onClick={() => void onSend()}>Send</Button>
					</div>
				</CardContent>
			</Card>
		</PageShell>
	);
}
