import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, CalendarDays, Clock3, MoveRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/news/$slug")({
	component: NewsDetailPage,
});

function formatPublishedDate(timestamp?: number) {
	if (!timestamp) {
		return "Draft";
	}

	return new Intl.DateTimeFormat("en-NP", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date(timestamp));
}

function estimateReadTime(text: string) {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 190));
}

function splitParagraphs(text: string) {
	return text
		.split(/\n+/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);
}

function NewsDetailPage() {
	const { slug } = Route.useParams();
	const story = useQuery(api.news.getPublishedBySlug, { slug });
	const allStories = useQuery(api.news.listPublished, { limit: 16 });

	if (story === undefined) {
		return (
			<PageShell
				title="Loading article..."
				description="Fetching the latest newsroom brief."
			/>
		);
	}

	if (!story) {
		return (
			<PageShell
				title="Story not found"
				description="This article may have been unpublished or the link is no longer valid."
			>
				<Link to="/news" className="news-read-link">
					<ArrowLeft size={15} />
					Back to newsroom
				</Link>
			</PageShell>
		);
	}

	const relatedStories = (allStories ?? [])
		.filter((item) => item.slug !== story.slug)
		.slice(0, 4);
	const paragraphs = splitParagraphs(story.content);

	return (
		<PageShell
			title={story.title}
			description="Full report from the Titeet market desk."
		>
			<section className="news-detail-shell">
				<Link to="/news" className="news-back-link">
					<ArrowLeft size={15} />
					Back to all stories
				</Link>

				<div className="news-detail-grid">
					<article className="news-article-card">
						<header className="news-article-header">
							<p className="news-story-eyebrow">Full Brief</p>
							<h2 className="news-article-title">{story.title}</h2>
							<p className="news-article-summary">{story.summary}</p>
							<div className="news-meta-row">
								<span>
									<CalendarDays size={14} />
									{formatPublishedDate(story.publishedAt)}
								</span>
								<span>
									<Clock3 size={14} />
									{estimateReadTime(story.content)} min read
								</span>
							</div>
						</header>

						<div className="news-article-hero">
							{story.imageUrl ? (
								<img
									src={story.imageUrl}
									alt={story.title}
									className="news-article-image"
								/>
							) : (
								<div className="news-featured-pattern" />
							)}
						</div>

						<div className="news-article-body">
							{paragraphs.length > 0 ? (
								paragraphs.map((paragraph, index) => (
									<p key={`${story._id}-${index}`}>{paragraph}</p>
								))
							) : (
								<p>{story.content}</p>
							)}
						</div>
					</article>

					<aside className="news-detail-sidebar">
						<div className="news-sidebar-card">
							<p className="news-masthead-label">STORY SNAPSHOT</p>
							<div className="news-sidebar-stats">
								<div>
									<p className="news-sidebar-value">
										{estimateReadTime(story.content)}m
									</p>
									<p className="news-sidebar-label">Read time</p>
								</div>
								<div>
									<p className="news-sidebar-value">
										{Math.max(1, paragraphs.length)}
									</p>
									<p className="news-sidebar-label">Sections</p>
								</div>
							</div>
							<p className="news-sidebar-note">
								Use related briefs to compare signals across districts and
								demand segments.
							</p>
						</div>

						<div className="news-sidebar-card">
							<p className="news-masthead-label">RELATED BRIEFS</p>
							{relatedStories.length === 0 ? (
								<p className="news-sidebar-note">
									No related stories available yet.
								</p>
							) : (
								<div className="news-related-list">
									{relatedStories.map((item) => (
										<Link
											key={item._id}
											to="/news/$slug"
											params={{ slug: item.slug }}
											className="news-related-link"
										>
											<span>{item.title}</span>
											<MoveRight size={14} />
										</Link>
									))}
								</div>
							)}
						</div>
					</aside>
				</div>
			</section>
		</PageShell>
	);
}
