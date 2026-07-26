import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Building2,
	CalendarClock,
	CarFront,
	ChevronDown,
	Eye,
	Heart,
	MapPin,
	Search,
	Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNpr, nprCompact } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

const sellerLoadingSkeletonKeys = [
	"seller-skeleton-1",
	"seller-skeleton-2",
	"seller-skeleton-3",
	"seller-skeleton-4",
	"seller-skeleton-5",
	"seller-skeleton-6",
] as const;

export const Route = createFileRoute("/sellers")({
	component: SellersPage,
});

function SellersPage() {
	const sellers = useQuery(api.users.listSellersPublic, {
		limit: 100,
		listingPreviewLimit: 3,
	});
	const [searchText, setSearchText] = useState("");
	const [activeSellerId, setActiveSellerId] = useState<string | null>(null);

	const filteredSellers = useMemo(() => {
		if (!sellers) {
			return [];
		}

		const normalizedQuery = searchText.trim().toLowerCase();
		if (!normalizedQuery) {
			return sellers;
		}

		return sellers.filter((seller) => {
			const listingSnapshot = seller.previewListings
				.map((listing) => {
					return `${listing.make} ${listing.model} ${listing.locationDistrict} ${listing.title}`;
				})
				.join(" ");
			const haystack =
				`${seller.name} ${seller.email} ${seller.address ?? ""} ${listingSnapshot}`.toLowerCase();
			return haystack.includes(normalizedQuery);
		});
	}, [sellers, searchText]);

	useEffect(() => {
		if (filteredSellers.length === 0) {
			setActiveSellerId(null);
			return;
		}

		if (
			activeSellerId &&
			filteredSellers.some((seller) => seller._id === activeSellerId)
		) {
			return;
		}

		const firstSellerWithInventory =
			filteredSellers.find((seller) => seller.liveListingCount > 0) ??
			filteredSellers[0];
		setActiveSellerId(firstSellerWithInventory._id);
	}, [filteredSellers, activeSellerId]);

	const overview = useMemo(() => {
		const totalLiveListings = filteredSellers.reduce(
			(sum, seller) => sum + seller.liveListingCount,
			0,
		);
		const totalViews = filteredSellers.reduce(
			(sum, seller) => sum + seller.totalListingViews,
			0,
		);

		return {
			totalSellers: filteredSellers.length,
			totalLiveListings,
			totalViews,
			avgListingsPerSeller:
				filteredSellers.length > 0
					? totalLiveListings / filteredSellers.length
					: 0,
		};
	}, [filteredSellers]);

	return (
		<PageShell
			title="Seller Directory"
			description="Tap into each seller to inspect live inventory, pricing posture, and recent publishing activity."
		>
			{!sellers ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{sellerLoadingSkeletonKeys.map((key) => (
						<Card key={key} className="h-56 animate-pulse bg-card/55" />
					))}
				</div>
			) : sellers.length === 0 ? (
				<Card>
					<CardContent className="pt-6 text-sm text-muted-foreground">
						No sellers found yet.
					</CardContent>
				</Card>
			) : (
				<>
					<section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-card/95 via-card/78 to-accent/18 p-5 shadow-[0_34px_78px_-56px_rgba(8,15,28,0.95)] sm:p-7">
						<div className="pointer-events-none absolute -left-20 top-2 size-40 rounded-full bg-primary/20 blur-3xl" />
						<div className="pointer-events-none absolute -right-14 top-12 size-44 rounded-full bg-accent/25 blur-3xl" />
						<div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
							<div className="space-y-5">
								<Badge variant="secondary" className="w-fit">
									<Sparkles className="mr-1 size-3.5" />
									Seller Atlas
								</Badge>
								<div className="space-y-2">
									<h2 className="text-2xl leading-tight font-semibold sm:text-3xl">
										Inspect seller activity before you start a conversation.
									</h2>
									<p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
										Every card opens a quick dossier with the seller&apos;s live
										listings, price pattern, and recent publish momentum.
									</p>
								</div>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<div className="relative min-w-0 flex-1">
										<Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											value={searchText}
											onChange={(event) => setSearchText(event.target.value)}
											placeholder="Search seller, district, make, or model"
											className="h-11 rounded-2xl border-border/70 bg-background/75 pl-11"
										/>
									</div>
									<p className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3 text-xs font-medium text-muted-foreground sm:max-w-64">
										Tap any seller card below to expand published inventory
										without leaving this page.
									</p>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
								<StatTile
									label="Active sellers"
									value={overview.totalSellers.toLocaleString("en-NP")}
								/>
								<StatTile
									label="Live listings"
									value={overview.totalLiveListings.toLocaleString("en-NP")}
								/>
								<StatTile
									label="Avg inventory/seller"
									value={overview.avgListingsPerSeller.toFixed(1)}
								/>
								<StatTile
									label="Combined listing views"
									value={overview.totalViews.toLocaleString("en-NP")}
									className="sm:col-span-3 lg:col-span-1"
								/>
							</div>
						</div>
					</section>

					{filteredSellers.length === 0 ? (
						<Card>
							<CardContent className="space-y-3 pt-6">
								<p className="text-sm text-muted-foreground">
									No sellers match this search yet.
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setSearchText("")}
								>
									Clear search
								</Button>
							</CardContent>
						</Card>
					) : (
						<section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
							{filteredSellers.map((seller) => {
								const isActive = seller._id === activeSellerId;
								const hiddenLiveCount =
									seller.liveListingCount - seller.previewListings.length;

								return (
									<Card
										key={seller._id}
										className={cn(
											"self-start overflow-hidden border-border/70 bg-gradient-to-b from-card/90 to-card/70",
											isActive &&
												"border-primary/45 shadow-[0_36px_82px_-58px_oklch(0.35_0.11_45)]",
										)}
									>
										<button
											type="button"
											onClick={() => setActiveSellerId(seller._id)}
											aria-expanded={isActive}
											className="w-full p-5 text-left"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className="relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-secondary/45 text-base font-semibold text-secondary-foreground">
														{seller.avatarUrl ? (
															<img
																src={seller.avatarUrl}
																alt={seller.name}
																className="size-full object-cover"
															/>
														) : (
															seller.name.charAt(0).toUpperCase()
														)}
													</div>
													<div className="space-y-1">
														<p className="text-lg leading-tight font-semibold">
															{seller.name}
														</p>
														<p className="text-xs text-muted-foreground">
															{seller.email}
														</p>
														<p className="flex items-center gap-1 text-[0.69rem] text-muted-foreground">
															<CalendarClock className="size-3.5" />
															{formatPublishedDate(seller.mostRecentPublishAt)}
														</p>
													</div>
												</div>
												<ChevronDown
													className={cn(
														"mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300",
														isActive && "rotate-180 text-primary",
													)}
												/>
											</div>

											<div className="mt-4 grid grid-cols-3 gap-2">
												<MetricTile
													icon={CarFront}
													label="Live"
													value={seller.liveListingCount.toString()}
												/>
												<MetricTile
													icon={Eye}
													label="Views"
													value={seller.totalListingViews.toLocaleString(
														"en-NP",
													)}
												/>
												<MetricTile
													icon={Building2}
													label="Avg price"
													value={
														seller.averageLivePriceNpr
															? nprCompact(seller.averageLivePriceNpr)
															: "N/A"
													}
												/>
											</div>
										</button>

										<div
											className={cn(
												"grid transition-[grid-template-rows] duration-500",
												isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
											)}
										>
											<div className="overflow-hidden">
												<div className="space-y-4 border-t border-border/70 px-5 pb-5 pt-4">
													{seller.liveListingCount === 0 ? (
														<p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
															This seller has no live listings right now. Check
															back soon for new inventory.
														</p>
													) : (
														<>
															<div className="grid gap-3">
																{seller.previewListings.map((listing) => (
																	<article
																		key={listing._id}
																		className="group rounded-2xl border border-border/70 bg-background/55 p-3"
																	>
																		<div className="flex gap-3">
																			<div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/45">
																				{listing.coverImageUrl ? (
																					<img
																						src={listing.coverImageUrl}
																						alt={listing.title}
																						className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
																					/>
																				) : (
																					<div className="flex size-full items-center justify-center bg-gradient-to-br from-secondary/35 to-primary/20 text-primary/80">
																						<CarFront className="size-5" />
																					</div>
																				)}
																			</div>

																			<div className="min-w-0 flex-1 space-y-1.5">
																				<p className="text-sm leading-snug font-semibold">
																					{listing.title}
																				</p>
																				<p className="text-xs text-muted-foreground">
																					{listing.make} {listing.model} •{" "}
																					{listing.year}
																				</p>
																				<p className="flex items-center gap-1 text-[0.69rem] text-muted-foreground">
																					<MapPin className="size-3.5" />
																					{listing.locationDistrict}
																				</p>
																				<div className="flex items-center justify-between gap-2 pt-1">
																					<p className="text-xs font-semibold text-primary">
																						{formatNpr(listing.priceNpr)}
																					</p>
																					<Link
																						to="/listings/$listingId"
																						params={{ listingId: listing._id }}
																					>
																						<Button
																							type="button"
																							size="sm"
																							variant="secondary"
																							className="h-7 px-3 text-[0.68rem]"
																						>
																							View
																						</Button>
																					</Link>
																				</div>
																			</div>
																		</div>

																		<div className="mt-2 flex flex-wrap items-center gap-2 text-[0.66rem] text-muted-foreground">
																			<span className="inline-flex items-center gap-1 rounded-full border border-border/65 bg-background/60 px-2.5 py-1">
																				<Eye className="size-3.5" />
																				{listing.views.toLocaleString("en-NP")}
																			</span>
																			<span className="inline-flex items-center gap-1 rounded-full border border-border/65 bg-background/60 px-2.5 py-1">
																				<Heart className="size-3.5" />
																				{listing.likes.toLocaleString("en-NP")}
																			</span>
																			<span className="rounded-full border border-border/65 bg-background/60 px-2.5 py-1">
																				{listing.mileage.toLocaleString(
																					"en-NP",
																				)}{" "}
																				km
																			</span>
																		</div>
																	</article>
																))}
															</div>

															{hiddenLiveCount > 0 ? (
																<p className="rounded-xl border border-border/65 bg-background/35 px-3 py-2 text-[0.68rem] text-muted-foreground">
																	+{hiddenLiveCount} more live listing
																	{hiddenLiveCount > 1 ? "s" : ""} from this
																	seller.
																</p>
															) : null}
														</>
													)}

													<div className="flex flex-wrap gap-2 pt-1">
														<a
															href={`mailto:${seller.email}`}
															className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[0.68rem] font-semibold tracking-wide text-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
														>
															Email seller
														</a>
														{seller.phone ? (
															<a
																href={`tel:${seller.phone}`}
																className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[0.68rem] font-semibold tracking-wide text-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
															>
																Call {seller.phone}
															</a>
														) : null}
													</div>
												</div>
											</div>
										</div>
									</Card>
								);
							})}
						</section>
					)}
				</>
			)}
		</PageShell>
	);
}

function StatTile({
	label,
	value,
	className,
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-border/70 bg-background/60 px-4 py-3 backdrop-blur",
				className,
			)}
		>
			<p className="text-xl font-semibold text-primary">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

function MetricTile({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof CarFront;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl border border-border/70 bg-background/55 p-2.5">
			<p className="flex items-center gap-1 text-[0.68rem] font-medium text-muted-foreground">
				<Icon className="size-3.5" />
				{label}
			</p>
			<p className="mt-1 truncate text-sm font-semibold">{value}</p>
		</div>
	);
}

function formatPublishedDate(timestamp: number | null) {
	if (!timestamp) {
		return "No live publish yet";
	}

	return new Date(timestamp).toLocaleDateString("en-NP", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}
