import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageShell } from "@/components/layout/page-shell";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { NEPAL_DISTRICTS } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const MAX_COMPARE_SELECTION = 5;

const SORT_LABELS = {
	newest: "Newest",
	priceAsc: "Price: Low to High",
	priceDesc: "Price: High to Low",
	mileageAsc: "Mileage: Low to High",
	yearDesc: "Model year: Newest first",
} as const;

type SortBy = keyof typeof SORT_LABELS;
type Notice = {
	kind: "info" | "success" | "error";
	text: string;
};

type SelectableListing = {
	_id: string;
	make: string;
	model: string;
	year: number;
};

function isSortBy(value: unknown): value is SortBy {
	return typeof value === "string" && Object.hasOwn(SORT_LABELS, value);
}

export const Route = createFileRoute("/listings/")({
	validateSearch: (search: Record<string, unknown>) => {
		const query =
			typeof search.query === "string" ? search.query.trim() : undefined;
		const district =
			typeof search.district === "string" ? search.district.trim() : undefined;
		const sortBy = isSortBy(search.sortBy) ? search.sortBy : undefined;
		const rawPage = Number(search.page);
		const page =
			Number.isFinite(rawPage) && rawPage > 1 ? Math.floor(rawPage) : undefined;

		return {
			query: query || undefined,
			district: district || undefined,
			sortBy,
			page,
		};
	},
	component: ListingsPage,
});

function ListingsPage() {
	const searchId = useId();
	const districtId = useId();
	const sortId = useId();
	const navigate = useNavigate();
	const search = Route.useSearch();
	const { isSignedIn } = useAuth();
	const profile = useCurrentUserProfile();
	const saveComparison = useMutation(api.compare.saveComparison);
	const recordSearch = useMutation(api.search.recordSearch);

	const [selected, setSelected] = useState<Array<Id<"vehicles">>>([]);
	const [didEditSelection, setDidEditSelection] = useState(false);
	const [compareNotice, setCompareNotice] = useState<Notice | null>(null);
	const [searchNotice, setSearchNotice] = useState<Notice | null>(null);
	const [isSavingComparison, setIsSavingComparison] = useState(false);
	const [isSavingSearch, setIsSavingSearch] = useState(false);
	const [isCompareWidgetMinimized, setIsCompareWidgetMinimized] =
		useState(false);

	const query = search.query ?? "";
	const district = search.district ?? "";
	const sortBy = search.sortBy ?? "newest";
	const page = search.page ?? 1;
	const canUsePrivateFeatures = isSignedIn && !!profile;
	const normalizedQuery = query.trim();

	const filters = useMemo(
		() => ({
			query: normalizedQuery || undefined,
			locationDistrict: district || undefined,
			sortBy,
			page,
			pageSize: 12,
		}),
		[normalizedQuery, district, sortBy, page],
	);

	const results = useQuery(api.search.searchVehicles, filters);
	const savedComparison = useQuery(
		api.compare.getCurrentComparison,
		canUsePrivateFeatures ? {} : "skip",
	);

	const savedVehicleIds = useMemo(
		() => savedComparison?.comparison.vehicleIds ?? [],
		[savedComparison],
	);

	const hasUnsavedComparisonChanges = useMemo(() => {
		const normalizedSelected = [...new Set(selected)].sort();
		const normalizedSaved = [...new Set(savedVehicleIds)].sort();

		if (normalizedSelected.length !== normalizedSaved.length) {
			return true;
		}

		return normalizedSelected.some(
			(value, index) => value !== normalizedSaved[index],
		);
	}, [selected, savedVehicleIds]);

	const activeFilterCount =
		Number(normalizedQuery.length > 0) +
		Number(district.length > 0) +
		Number(sortBy !== "newest");

	useEffect(() => {
		if (!canUsePrivateFeatures) {
			setSelected([]);
			setDidEditSelection(false);
			return;
		}

		if (savedComparison === undefined || didEditSelection) {
			return;
		}

		setSelected(savedComparison?.comparison.vehicleIds ?? []);
	}, [canUsePrivateFeatures, savedComparison, didEditSelection]);

	useEffect(() => {
		if (selected.length === 0) {
			setIsCompareWidgetMinimized(false);
		}
	}, [selected.length]);

	const resetFilters = () => {
		setSearchNotice(null);
		void navigate({
			to: "/listings",
			search: {
				query: undefined,
				district: undefined,
				sortBy: undefined,
				page: undefined,
			},
			replace: true,
		});
	};

	const toggleSelect = (item: SelectableListing) => {
		const typedId = item._id as Id<"vehicles">;
		const isCurrentlySelected = selected.includes(typedId);

		if (!isCurrentlySelected && selected.length >= MAX_COMPARE_SELECTION) {
			setCompareNotice({
				kind: "error",
				text: `You can compare up to ${MAX_COMPARE_SELECTION} vehicles at once.`,
			});
			return;
		}

		setCompareNotice(null);
		setDidEditSelection(true);
		setSelected((prev) => {
			if (isCurrentlySelected) {
				return prev.filter((value) => value !== typedId);
			}
			return [...prev, typedId];
		});
	};

	const clearLocalSelection = () => {
		setSelected([]);
		setDidEditSelection(true);
		setCompareNotice(null);
	};

	const onCompareNow = async () => {
		if (!canUsePrivateFeatures) {
			setCompareNotice({
				kind: "error",
				text: "Sign in to compare vehicles.",
			});
			return;
		}

		if (selected.length === 0) {
			setCompareNotice({
				kind: "error",
				text: "Select at least one vehicle before comparing.",
			});
			return;
		}

		setIsSavingComparison(true);
		try {
			if (hasUnsavedComparisonChanges) {
				await saveComparison({ vehicleIds: selected });
				setDidEditSelection(false);
			}
			setCompareNotice(null);
			await navigate({ to: "/compare" });
		} catch (error) {
			setCompareNotice({
				kind: "error",
				text:
					error instanceof Error
						? error.message
						: "Unable to open comparison. Try again.",
			});
		} finally {
			setIsSavingComparison(false);
		}
	};

	const onSaveSearch = async () => {
		if (!canUsePrivateFeatures) {
			setSearchNotice({
				kind: "error",
				text: "Sign in to save searches.",
			});
			return;
		}

		setIsSavingSearch(true);
		try {
			await recordSearch({
				query: normalizedQuery,
				filters: JSON.stringify({
					query: normalizedQuery || undefined,
					locationDistrict: district || undefined,
					sortBy,
				}),
			});
			setSearchNotice({
				kind: "success",
				text: "Search saved to history.",
			});
		} catch (error) {
			setSearchNotice({
				kind: "error",
				text:
					error instanceof Error
						? error.message
						: "Unable to save this search.",
			});
		} finally {
			setIsSavingSearch(false);
		}
	};

	const canRenderFloatingWidget = typeof window !== "undefined";

	return (
		<PageShell
			title="Vehicle Listings"
			description="Find used cars in Nepal with instant filters and quick comparison."
		>
			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="grid gap-4 md:grid-cols-4">
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor={searchId}>Search</Label>
							<Input
								id={searchId}
								value={query}
								onChange={(event) => {
									const nextQuery = event.target.value;
									void navigate({
										to: "/listings",
										search: (prev) => ({
											...prev,
											query: nextQuery || undefined,
											page: undefined,
										}),
										replace: true,
									});
								}}
								placeholder="Make, model, location"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={districtId}>District</Label>
							<Select
								id={districtId}
								value={district}
								onChange={(event) => {
									const nextDistrict = event.target.value;
									void navigate({
										to: "/listings",
										search: (prev) => ({
											...prev,
											district: nextDistrict || undefined,
											page: undefined,
										}),
										replace: true,
									});
								}}
							>
								<option value="">All districts</option>
								{NEPAL_DISTRICTS.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</Select>
						</div>
						<div className="space-y-1">
							<Label htmlFor={sortId}>Sort</Label>
							<Select
								id={sortId}
								value={sortBy}
								onChange={(event) => {
									const next = event.target.value;
									if (
										next === "newest" ||
										next === "priceAsc" ||
										next === "priceDesc" ||
										next === "mileageAsc" ||
										next === "yearDesc"
									) {
										void navigate({
											to: "/listings",
											search: (prev) => ({
												...prev,
												sortBy: next === "newest" ? undefined : next,
												page: undefined,
											}),
											replace: true,
										});
									}
								}}
							>
								{Object.entries(SORT_LABELS).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</Select>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							disabled={activeFilterCount === 0}
							onClick={resetFilters}
						>
							Clear filters
						</Button>
						<Button
							variant="secondary"
							disabled={!canUsePrivateFeatures || isSavingSearch}
							onClick={onSaveSearch}
						>
							{isSavingSearch ? "Saving..." : "Save this search"}
						</Button>
						<p className="text-xs text-muted-foreground">
							Filters apply instantly as you type.
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						{normalizedQuery ? (
							<Badge variant="outline">Search: {normalizedQuery}</Badge>
						) : null}
						{district ? (
							<Badge variant="outline">District: {district}</Badge>
						) : null}
						{sortBy !== "newest" ? (
							<Badge variant="outline">Sort: {SORT_LABELS[sortBy]}</Badge>
						) : null}
						{activeFilterCount === 0 ? (
							<p className="text-xs text-muted-foreground">
								No active filters.
							</p>
						) : null}
					</div>

					{searchNotice ? (
						<p
							className={cn(
								"text-xs",
								searchNotice.kind === "error"
									? "text-destructive"
									: searchNotice.kind === "success"
										? "text-primary"
										: "text-muted-foreground",
							)}
						>
							{searchNotice.text}
						</p>
					) : null}
				</CardContent>
			</Card>

			{!results ? (
				<p>Loading listings...</p>
			) : (
				<>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-sm text-muted-foreground">
							{results.total} result{results.total === 1 ? "" : "s"} - Page{" "}
							{results.page} of {Math.max(1, results.totalPages)}
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{results.items.map((item) => (
							<ListingCard
								key={item._id}
								item={item}
								selected={selected.includes(item._id)}
								saved={savedVehicleIds.includes(item._id)}
								compareDisabled={
									selected.length >= MAX_COMPARE_SELECTION &&
									!selected.includes(item._id)
								}
								onSelect={toggleSelect}
							/>
						))}
					</div>

					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">
							Page {results.page} of {Math.max(1, results.totalPages)}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								disabled={results.page <= 1}
								onClick={() =>
									void navigate({
										to: "/listings",
										search: (prev) => {
											const nextPage = Math.max(1, page - 1);
											return {
												...prev,
												page: nextPage > 1 ? nextPage : undefined,
											};
										},
									})
								}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								disabled={results.page >= Math.max(1, results.totalPages)}
								onClick={() =>
									void navigate({
										to: "/listings",
										search: (prev) => {
											const nextPage = Math.min(
												Math.max(1, results.totalPages),
												page + 1,
											);
											return {
												...prev,
												page: nextPage > 1 ? nextPage : undefined,
											};
										},
									})
								}
							>
								Next
							</Button>
						</div>
					</div>
				</>
			)}

			{selected.length > 0 && canRenderFloatingWidget
				? createPortal(
						<div className="pointer-events-none fixed bottom-4 right-4 z-[120] pl-2 pb-[env(safe-area-inset-bottom)] sm:bottom-6 sm:right-6">
							{isCompareWidgetMinimized ? (
								<Button
									type="button"
									size="sm"
									className="compare-widget-attention pointer-events-auto border-0 bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-5 text-white shadow-[0_24px_52px_-20px_rgba(239,68,68,0.95)] ring-2 ring-white/80 hover:brightness-110 dark:ring-white/35"
									onClick={() => setIsCompareWidgetMinimized(false)}
								>
									Compare these ({selected.length})
								</Button>
							) : (
								<div className="pointer-events-auto w-[min(26rem,calc(100vw-1rem))] rounded-3xl border border-orange-300/70 bg-gradient-to-br from-orange-50/96 via-card/98 to-rose-100/80 p-4 shadow-[0_30px_65px_-30px_rgba(239,68,68,0.9)] ring-1 ring-white/75 backdrop-blur-xl dark:border-orange-300/35 dark:from-orange-950/70 dark:via-card/96 dark:to-rose-950/55 dark:ring-white/15">
									<div className="flex items-start justify-between gap-3">
										<div className="space-y-1">
											<p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-300">
												Ready to compare
											</p>
											<p className="text-sm text-foreground/85">
												{selected.length} vehicle
												{selected.length === 1 ? "" : "s"} selected.{" "}
												{hasUnsavedComparisonChanges
													? "Tap compare to save and open the table."
													: "You can open your current comparison now."}
											</p>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setIsCompareWidgetMinimized(true)}
										>
											Minimize
										</Button>
									</div>

									{compareNotice ? (
										<p
											className={cn(
												"mt-2 text-xs",
												compareNotice.kind === "error"
													? "text-destructive"
													: compareNotice.kind === "success"
														? "text-primary"
														: "text-muted-foreground",
											)}
										>
											{compareNotice.text}
										</p>
									) : null}

									<div className="mt-3 flex flex-wrap items-center gap-2">
										{canUsePrivateFeatures ? (
											<Button
												className="w-full border-0 bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 text-white shadow-[0_20px_40px_-20px_rgba(239,68,68,1)] hover:brightness-110 sm:w-auto"
												disabled={isSavingComparison}
												onClick={onCompareNow}
											>
												{isSavingComparison
													? "Preparing comparison..."
													: `Compare these (${selected.length})`}
											</Button>
										) : (
											<Link to="/sign-in" className="w-full sm:w-auto">
												<Button className="w-full border-0 bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 text-white hover:brightness-110">
													Sign in to compare
												</Button>
											</Link>
										)}
										<Button
											variant="outline"
											size="sm"
											disabled={selected.length === 0}
											onClick={clearLocalSelection}
										>
											Clear
										</Button>
									</div>
								</div>
							)}
						</div>,
						document.body,
					)
				: null}
		</PageShell>
	);
}
