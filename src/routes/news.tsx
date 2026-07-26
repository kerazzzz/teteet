import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, CalendarDays, Clock3, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/news")({
	component: NewsPage,
});

const INITIAL_VISIBLE_STORIES = 8;
const LOAD_MORE_STORIES = 8;

function formatPublishedDate(timestamp?: number) {
	if (!timestamp) {
		return "Draft";
	}
	return new Intl.DateTimeFormat("en-NP", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(timestamp));
}

function estimateReadTime(text: string) {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 190));
}

function toPreview(text: string, maxLength: number) {
	const trimmed = text.trim();
	if (trimmed.length <= maxLength) {
		return trimmed;
	}

	return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}

function NewsPage() {
	const items = useQuery(api.news.listPublished, { limit: 100 });
	const [search, setSearch] = useState("");
	const [visibleStories, setVisibleStories] = useState(INITIAL_VISIBLE_STORIES);

	const filteredItems = useMemo(() => {
		if (!items) {
			return [];
		}

		const keyword = search.trim().toLowerCase();
		if (!keyword) {
			return items;
		}

		return items.filter((item) =>
			`${item.title} ${item.summary} ${item.content}`
				.toLowerCase()
				.includes(keyword),
		);
	}, [items, search]);

	const featured = filteredItems[0];
	const listStories = filteredItems.slice(1, visibleStories + 1);
	const hasMore = filteredItems.length > listStories.length + 1;

	return (
		<PageShell
			title="Market Newsroom"
			description="Track policy updates, market signals, and buying trends with a flow designed for fast scanning and deep reading."
		>
			{!items ? (
				<section className="news-loading-grid">
					<div className="news-loading-block" />
					<div className="news-loading-cards">
						<div className="news-loading-block h-56" />
						<div className="news-loading-block h-56" />
						<div className="news-loading-block h-56" />
					</div>
				</section>
			) : filteredItems.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No stories match your search. Try another keyword.
					</CardContent>
				</Card>
			) : (
				<section className="news-hub-shell">
					<div className="news-masthead">
						<div>
							<p className="news-masthead-label">AUTO INTELLIGENCE DESK</p>
							<h2 className="news-masthead-title">
								Daily signals from Nepal&apos;s mobility market
							</h2>
							<p className="news-masthead-copy">
								Start with the lead brief, then open any story for the full
								breakdown.
							</p>
						</div>
						<div className="news-search-wrap">
							<Search className="news-search-icon" size={16} />
							<input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setVisibleStories(INITIAL_VISIBLE_STORIES);
								}}
								placeholder="Search stories, trends, and policy updates"
								className="news-search-input"
								aria-label="Search news"
							/>
						</div>
					</div>

					{featured ? (
						<article className="news-featured-card">
							<div className="news-featured-media">
								{featured.imageUrl ? (
									<img
										src={featured.imageUrl}
										alt={featured.title}
										className="news-featured-image"
									/>
								) : (
									<div className="news-featured-pattern" />
								)}
							</div>
							<div className="news-featured-content">
								<p className="news-story-eyebrow">Lead Brief</p>
								<h3 className="news-featured-title">{featured.title}</h3>
								<p className="news-featured-summary">{featured.summary}</p>
								<p className="news-featured-preview">
									{toPreview(featured.content, 280)}
								</p>
								<div className="news-meta-row">
									<span>
										<CalendarDays size={14} />
										{formatPublishedDate(featured.publishedAt)}
									</span>
									<span>
										<Clock3 size={14} />
										{estimateReadTime(featured.content)} min read
									</span>
								</div>
								<Link
									to="/news/$slug"
									params={{ slug: featured.slug }}
									className="news-read-link"
								>
									Read full story
									<ArrowRight size={15} />
								</Link>
							</div>
						</article>
					) : null}

					<div className="news-story-grid">
						{listStories.map((item, index) => (
							<article
								key={item._id}
								className="news-story-card"
								style={{ animationDelay: `${index * 65}ms` }}
							>
								<CardHeader className="p-0">
									<p className="news-story-eyebrow">Market Watch</p>
									<CardTitle className="news-story-title">
										{item.title}
									</CardTitle>
									<p className="news-story-summary">{item.summary}</p>
								</CardHeader>
								<CardContent className="space-y-4 p-0">
									<p className="news-story-preview">
										{toPreview(item.content, 170)}
									</p>
									<div className="news-meta-row">
										<span>
											<CalendarDays size={13} />
											{formatPublishedDate(item.publishedAt)}
										</span>
										<span>
											<Clock3 size={13} />
											{estimateReadTime(item.content)} min
										</span>
									</div>
									<Link
										to="/news/$slug"
										params={{ slug: item.slug }}
										className="news-story-link"
									>
										Open details
										<ArrowRight size={14} />
									</Link>
								</CardContent>
							</article>
						))}
					</div>

					<div className="news-footer-row">
						<p className="news-count-label">
							Showing {Math.min(filteredItems.length, listStories.length + 1)}{" "}
							of {filteredItems.length} stories
						</p>
						{hasMore ? (
							<button
								type="button"
								className="news-load-more"
								onClick={() =>
									setVisibleStories((current) => current + LOAD_MORE_STORIES)
								}
							>
								Load more stories
							</button>
						) : null}
					</div>
				</section>
			)}
		</PageShell>
	);
}
