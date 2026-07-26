import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/news")({
	component: AdminNewsPage,
});

function AdminNewsPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminNewsContent />
		</RequireRole>
	);
}

function AdminNewsContent() {
	const posts = useQuery(api.news.listAdmin, { limit: 100 });
	const createDraft = useMutation(api.news.createDraft);
	const publish = useMutation(api.news.publish);
	const unpublish = useMutation(api.news.unpublish);

	const [title, setTitle] = useState("");
	const [summary, setSummary] = useState("");
	const [content, setContent] = useState("");

	const onCreate = async () => {
		await createDraft({ title, summary, content });
		setTitle("");
		setSummary("");
		setContent("");
	};

	return (
		<PageShell
			title="Manage News"
			description="Create and publish market updates."
		>
			<Card>
				<CardHeader>
					<CardTitle>Create Draft</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Input
						placeholder="Title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<Input
						placeholder="Summary"
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
					/>
					<Textarea
						placeholder="Content"
						value={content}
						onChange={(e) => setContent(e.target.value)}
					/>
					<Button onClick={onCreate}>Create draft</Button>
				</CardContent>
			</Card>

			{!posts ? (
				<p>Loading posts...</p>
			) : (
				<div className="grid gap-3">
					{posts.map((post) => (
						<Card key={post._id}>
							<CardHeader className="flex-row items-center justify-between pb-2">
								<CardTitle className="text-base">{post.title}</CardTitle>
								<Badge
									variant={
										post.status === "published" ? "secondary" : "outline"
									}
								>
									{post.status}
								</Badge>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<p>{post.summary}</p>
								<div className="flex gap-2">
									{post.status === "published" ? (
										<Button
											size="sm"
											variant="outline"
											onClick={() => unpublish({ newsId: post._id })}
										>
											Unpublish
										</Button>
									) : (
										<Button
											size="sm"
											onClick={() => publish({ newsId: post._id })}
										>
											Publish
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</PageShell>
	);
}
