import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Award,
	Calendar,
	CarFront,
	Coins,
	Crown,
	Fuel,
	Gauge,
	type LucideIcon,
	MapPin,
	Medal,
	Scale,
	Settings2,
	Sparkles,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatNpr } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/compare")({
	component: ComparePage,
});

type ComparedVehicle = {
	_id: string;
	title: string;
	make: string;
	model: string;
	year: number;
	priceNpr: number;
	mileage: number;
	fuelType: string;
	transmission: string;
	locationDistrict: string;
};

type NumericMetricKey = "priceNpr" | "mileage" | "year";
type MetricDirection = "low" | "high";
type CategoricalMetricKey = "fuelType" | "transmission" | "locationDistrict";

type NumericMetricDefinition = {
	key: NumericMetricKey;
	label: string;
	note: string;
	direction: MetricDirection;
	icon: LucideIcon;
	formatValue: (value: number) => string;
};

type CategoricalMetricDefinition = {
	key: CategoricalMetricKey;
	label: string;
	icon: LucideIcon;
};

type MetricScore = {
	vehicleId: string;
	value: number;
	score: number;
	isLowest: boolean;
	isHighest: boolean;
};

type MetricGroup = {
	definition: NumericMetricDefinition;
	minValue: number;
	maxValue: number;
	scores: MetricScore[];
};

type RankedVehicle = {
	vehicle: ComparedVehicle;
	score: number;
	scoreOutOf100: number;
};

type ComparisonInsights = {
	metricGroups: MetricGroup[];
	rankedVehicles: RankedVehicle[];
	rankByVehicleId: Map<string, number>;
	valueLeader: RankedVehicle;
	cheapestVehicle: ComparedVehicle;
	lowestMileageVehicle: ComparedVehicle;
	newestVehicle: ComparedVehicle;
};

const NUMERIC_METRICS: NumericMetricDefinition[] = [
	{
		key: "priceNpr",
		label: "Price",
		note: "Lower is better",
		direction: "low",
		icon: Coins,
		formatValue: (value) => formatNpr(value),
	},
	{
		key: "mileage",
		label: "Mileage",
		note: "Lower is better",
		direction: "low",
		icon: Gauge,
		formatValue: (value) => `${value.toLocaleString()} km`,
	},
	{
		key: "year",
		label: "Model Year",
		note: "Higher is better",
		direction: "high",
		icon: Calendar,
		formatValue: (value) => `${value}`,
	},
];

const CATEGORICAL_METRICS: CategoricalMetricDefinition[] = [
	{ key: "fuelType", label: "Fuel Type", icon: Fuel },
	{ key: "transmission", label: "Transmission", icon: Settings2 },
	{ key: "locationDistrict", label: "Location", icon: MapPin },
];

function ComparePage() {
	return (
		<RequireAuth>
			<CompareContent />
		</RequireAuth>
	);
}

function CompareContent() {
	const comparison = useQuery(api.compare.getCurrentComparison);
	const clearComparison = useMutation(api.compare.clearComparison);
	const vehicles = (comparison?.vehicles ?? []) as ComparedVehicle[];
	const insights = useMemo(() => buildComparisonInsights(vehicles), [vehicles]);

	return (
		<PageShell
			title="Vehicle Comparison"
			description="Compare up to five saved vehicles with visual ranking and metric clarity."
		>
			{!comparison || comparison.vehicles.length === 0 ? (
				<Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/12 via-card/95 to-card/75">
					<div className="pointer-events-none absolute -left-12 -top-12 size-44 rounded-full bg-primary/28 blur-3xl" />
					<div className="pointer-events-none absolute -right-14 bottom-0 size-44 rounded-full bg-accent/28 blur-3xl" />
					<CardHeader className="relative">
						<Badge variant="secondary" className="w-fit">
							Comparison Hub
						</Badge>
						<CardTitle className="mt-2 text-2xl">
							No saved comparison yet
						</CardTitle>
						<CardDescription>
							Start from listings: add vehicles, save comparison, then return
							here.
						</CardDescription>
					</CardHeader>
					<CardContent className="relative flex flex-wrap items-center gap-3">
						<Link to="/listings">
							<Button>Browse listings</Button>
						</Link>
						<p className="text-sm text-muted-foreground">
							Need help? Use the Comparison Builder at the top of the listings
							page.
						</p>
					</CardContent>
				</Card>
			) : insights ? (
				<div className="space-y-6">
					<section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
						<Card className="relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/16 via-card/95 to-card/78">
							<div className="pointer-events-none absolute -left-8 top-6 size-36 rounded-full bg-primary/30 blur-3xl" />
							<div className="pointer-events-none absolute -right-6 bottom-2 size-36 rounded-full bg-accent/30 blur-3xl" />
							<CardHeader className="relative space-y-4">
								<Badge variant="secondary" className="w-fit">
									Visual Intelligence
								</Badge>
								<div className="space-y-2">
									<CardTitle className="text-2xl sm:text-3xl">
										See winners at a glance
									</CardTitle>
									<CardDescription className="max-w-2xl">
										Each metric row marks highest and lowest values clearly.
										Green tones are stronger for that metric rule, red tones are
										weaker.
									</CardDescription>
								</div>
								<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
									<Badge variant="outline">
										{comparison.vehicles.length} vehicle
										{comparison.vehicles.length === 1 ? "" : "s"} compared
									</Badge>
									<Badge variant="outline">Highest / Lowest tags</Badge>
									<Badge variant="outline">Ranked overall score</Badge>
								</div>
							</CardHeader>
						</Card>

						<Card className="border-border/70 bg-card/70">
							<CardHeader className="space-y-1">
								<CardTitle className="flex items-center gap-2 text-lg">
									<Sparkles className="size-4 text-primary" />
									Quick Signals
								</CardTitle>
								<CardDescription>
									Fast snapshot of what stands out.
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3">
								<SignalCard
									icon={Crown}
									label="Value Leader"
									value={labelForVehicle(insights.valueLeader.vehicle)}
									subText={`${insights.valueLeader.scoreOutOf100}/100 composite score`}
									tone="emerald"
								/>
								<SignalCard
									icon={TrendingDown}
									label="Lowest Price"
									value={labelForVehicle(insights.cheapestVehicle)}
									subText={formatNpr(insights.cheapestVehicle.priceNpr)}
									tone="sky"
								/>
								<SignalCard
									icon={Gauge}
									label="Lowest Mileage"
									value={labelForVehicle(insights.lowestMileageVehicle)}
									subText={`${insights.lowestMileageVehicle.mileage.toLocaleString()} km`}
									tone="amber"
								/>
								<SignalCard
									icon={TrendingUp}
									label="Newest Model"
									value={labelForVehicle(insights.newestVehicle)}
									subText={`${insights.newestVehicle.year} model year`}
									tone="rose"
								/>
							</CardContent>
						</Card>
					</section>

					<section className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-xl font-semibold">Ranked Vehicles</h2>
								<p className="text-sm text-muted-foreground">
									Score combines price, mileage, and model year.
								</p>
							</div>
							<Button variant="outline" onClick={() => clearComparison({})}>
								Clear comparison
							</Button>
						</div>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{insights.rankedVehicles.map((entry, index) => (
								<RankedVehicleCard
									key={entry.vehicle._id}
									entry={entry}
									rank={index + 1}
								/>
							))}
						</div>
					</section>

					<section>
						<Card className="overflow-hidden border-border/70 bg-card/75">
							<CardHeader className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<CardTitle className="flex items-center gap-2 text-xl">
											<Scale className="size-4 text-primary" />
											Metric Heatmap
										</CardTitle>
										<CardDescription>
											Each row compares one metric. Labels show highest and
											lowest values directly.
										</CardDescription>
									</div>
									<div className="flex flex-wrap gap-2 text-xs">
										<Badge
											variant="outline"
											className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
										>
											Stronger
										</Badge>
										<Badge
											variant="outline"
											className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200"
										>
											Weaker
										</Badge>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="overflow-x-auto pb-1">
									<div
										className="grid min-w-[920px] gap-px rounded-2xl border border-border/65 bg-border/65 p-px"
										style={{
											gridTemplateColumns: `minmax(220px, 1.18fr) repeat(${vehicles.length}, minmax(176px, 1fr))`,
										}}
									>
										<div className="bg-muted/55 px-4 py-3">
											<p className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
												Metric
											</p>
										</div>
										{vehicles.map((vehicle) => (
											<div
												key={`metric-header-${vehicle._id}`}
												className="space-y-1 bg-muted/55 px-4 py-3"
											>
												<p className="text-xs text-muted-foreground">
													{vehicle.make} {vehicle.model}
												</p>
												<p className="text-sm font-semibold">{vehicle.year}</p>
												<Badge variant="outline" className="w-fit">
													Rank #{insights.rankByVehicleId.get(vehicle._id)}
												</Badge>
											</div>
										))}

										{insights.metricGroups.map((metricGroup) => (
											<MetricRow
												key={metricGroup.definition.key}
												metricGroup={metricGroup}
												vehicles={vehicles}
											/>
										))}

										{CATEGORICAL_METRICS.map((metric) => (
											<CategoricalRow
												key={metric.key}
												metric={metric}
												vehicles={vehicles}
											/>
										))}
									</div>
								</div>
							</CardContent>
						</Card>
					</section>
				</div>
			) : null}
		</PageShell>
	);
}

function SignalCard({
	icon: Icon,
	label,
	value,
	subText,
	tone,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	subText: string;
	tone: "emerald" | "sky" | "amber" | "rose";
}) {
	const toneClasses: Record<typeof tone, string> = {
		emerald:
			"border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
		sky: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-100",
		amber:
			"border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
		rose: "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-100",
	};

	return (
		<div className="rounded-2xl border border-border/70 bg-background/55 p-3">
			<div className="flex items-start gap-3">
				<div
					className={cn(
						"inline-flex size-8 shrink-0 items-center justify-center rounded-xl border",
						toneClasses[tone],
					)}
				>
					<Icon className="size-4" />
				</div>
				<div className="min-w-0 space-y-0.5">
					<p className="text-[0.66rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
						{label}
					</p>
					<p className="truncate text-sm font-semibold">{value}</p>
					<p className="text-xs text-muted-foreground">{subText}</p>
				</div>
			</div>
		</div>
	);
}

function RankedVehicleCard({
	entry,
	rank,
}: {
	entry: RankedVehicle;
	rank: number;
}) {
	const rankVisual =
		rank === 1
			? {
					icon: Crown,
					badge:
						"border-yellow-500/40 bg-yellow-500/15 text-yellow-800 dark:text-yellow-100",
					card: "border-yellow-500/35 bg-gradient-to-br from-yellow-500/10 via-card/95 to-card/80",
				}
			: rank === 2
				? {
						icon: Medal,
						badge:
							"border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-100",
						card: "border-sky-500/30 bg-gradient-to-br from-sky-500/8 via-card/95 to-card/80",
					}
				: rank === 3
					? {
							icon: Award,
							badge:
								"border-amber-600/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
							card: "border-amber-500/30 bg-gradient-to-br from-amber-500/8 via-card/95 to-card/80",
						}
					: {
							icon: CarFront,
							badge: "border-border/70 bg-background/60 text-foreground",
							card: "border-border/70 bg-card/75",
						};

	const RankIcon = rankVisual.icon;

	return (
		<Card className={cn("overflow-hidden", rankVisual.card)}>
			<CardContent className="space-y-4 p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">
							{entry.vehicle.make} {entry.vehicle.model} • {entry.vehicle.year}
						</p>
						<h3 className="font-display text-lg leading-tight font-semibold">
							{entry.vehicle.title}
						</h3>
					</div>
					<Badge variant="outline" className={rankVisual.badge}>
						<RankIcon className="size-3.5" />#{rank}
					</Badge>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Overall score</span>
						<span className="font-semibold">{entry.scoreOutOf100}/100</span>
					</div>
					<div className="h-2 rounded-full bg-muted/85">
						<div
							className={cn(
								"h-full rounded-full bg-gradient-to-r",
								entry.score >= 0.67
									? "from-emerald-500 to-lime-400"
									: entry.score >= 0.4
										? "from-amber-500 to-orange-400"
										: "from-rose-500 to-red-500",
							)}
							style={{ width: `${entry.scoreOutOf100}%` }}
						/>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 text-xs">
					<InfoChip icon={Coins} label={formatNpr(entry.vehicle.priceNpr)} />
					<InfoChip
						icon={Gauge}
						label={`${entry.vehicle.mileage.toLocaleString()} km`}
					/>
					<InfoChip
						icon={Fuel}
						label={formatCategoryLabel(entry.vehicle.fuelType)}
					/>
					<InfoChip
						icon={Settings2}
						label={formatCategoryLabel(entry.vehicle.transmission)}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

function InfoChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
	return (
		<div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1.5">
			<Icon className="size-3 text-muted-foreground" />
			<span className="font-medium">{label}</span>
		</div>
	);
}

function MetricRow({
	metricGroup,
	vehicles,
}: {
	metricGroup: MetricGroup;
	vehicles: ComparedVehicle[];
}) {
	const Icon = metricGroup.definition.icon;
	const hasSpread = metricGroup.minValue !== metricGroup.maxValue;

	return (
		<>
			<div className="bg-card/80 px-4 py-3">
				<div className="flex items-start gap-3">
					<div className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/65">
						<Icon className="size-4 text-primary" />
					</div>
					<div className="space-y-0.5">
						<p className="text-sm font-semibold">
							{metricGroup.definition.label}
						</p>
						<p className="text-xs text-muted-foreground">
							{metricGroup.definition.note}
						</p>
					</div>
				</div>
			</div>

			{vehicles.map((vehicle) => {
				const score = metricGroup.scores.find(
					(entry) => entry.vehicleId === vehicle._id,
				);

				if (!score) {
					return (
						<div
							key={`${metricGroup.definition.key}-${vehicle._id}`}
							className="bg-card/80 px-4 py-3 text-sm text-muted-foreground"
						>
							Not available
						</div>
					);
				}

				const strength = Math.round(score.score * 100);
				const toneClass =
					score.score >= 0.67
						? "border-emerald-500/25 bg-emerald-500/10"
						: score.score >= 0.4
							? "border-amber-500/22 bg-amber-500/10"
							: "border-rose-500/25 bg-rose-500/10";
				const barClass =
					score.score >= 0.67
						? "from-emerald-500 to-lime-400"
						: score.score >= 0.4
							? "from-amber-500 to-orange-400"
							: "from-rose-500 to-red-500";
				const label = hasSpread
					? score.isLowest
						? "Lowest"
						: score.isHighest
							? "Highest"
							: "Middle"
					: "Same";

				return (
					<div
						key={`${metricGroup.definition.key}-${vehicle._id}`}
						className={cn("space-y-2 border px-4 py-3", toneClass)}
					>
						<div className="flex items-start justify-between gap-2">
							<p className="text-sm font-semibold">
								{metricGroup.definition.formatValue(score.value)}
							</p>
							<Badge variant="outline" className="w-fit">
								{label}
							</Badge>
						</div>
						<div className="space-y-1">
							<div className="h-1.5 rounded-full bg-background/80">
								<div
									className={cn(
										"h-full rounded-full bg-gradient-to-r",
										barClass,
									)}
									style={{
										width: `${hasSpread ? Math.max(8, strength) : 50}%`,
									}}
								/>
							</div>
							<p className="text-[0.66rem] tracking-[0.12em] text-muted-foreground uppercase">
								{hasSpread ? `${strength}% metric strength` : "Equal values"}
							</p>
						</div>
					</div>
				);
			})}
		</>
	);
}

function CategoricalRow({
	metric,
	vehicles,
}: {
	metric: CategoricalMetricDefinition;
	vehicles: ComparedVehicle[];
}) {
	const Icon = metric.icon;
	const valueCount = new Map<string, number>();

	for (const vehicle of vehicles) {
		const rawValue = String(vehicle[metric.key]);
		valueCount.set(rawValue, (valueCount.get(rawValue) ?? 0) + 1);
	}

	return (
		<>
			<div className="bg-card/80 px-4 py-3">
				<div className="flex items-start gap-3">
					<div className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/65">
						<Icon className="size-4 text-primary" />
					</div>
					<div className="space-y-0.5">
						<p className="text-sm font-semibold">{metric.label}</p>
						<p className="text-xs text-muted-foreground">
							Category match check
						</p>
					</div>
				</div>
			</div>

			{vehicles.map((vehicle) => {
				const rawValue = String(vehicle[metric.key]);
				const count = valueCount.get(rawValue) ?? 1;
				const isSharedByAll = count === vehicles.length;
				const isUnique = count === 1;
				const toneClass = isSharedByAll
					? "border-emerald-500/25 bg-emerald-500/10"
					: isUnique
						? "border-sky-500/25 bg-sky-500/10"
						: "border-amber-500/22 bg-amber-500/10";

				return (
					<div
						key={`${metric.key}-${vehicle._id}`}
						className={cn("space-y-2 border px-4 py-3", toneClass)}
					>
						<p className="text-sm font-semibold">
							{formatCategoryLabel(rawValue)}
						</p>
						<p className="text-[0.66rem] tracking-[0.12em] text-muted-foreground uppercase">
							{isSharedByAll
								? "All same"
								: isUnique
									? "Unique"
									: `Shared by ${count}`}
						</p>
					</div>
				);
			})}
		</>
	);
}

function buildComparisonInsights(
	vehicles: ComparedVehicle[],
): ComparisonInsights | null {
	if (vehicles.length === 0) {
		return null;
	}

	const metricGroups: MetricGroup[] = NUMERIC_METRICS.map((definition) => {
		const values = vehicles.map((vehicle) => vehicle[definition.key]);
		const minValue = Math.min(...values);
		const maxValue = Math.max(...values);
		const hasSpread = minValue !== maxValue;

		const scores = vehicles.map((vehicle) => {
			const value = vehicle[definition.key];
			const normalized = hasSpread
				? (value - minValue) / (maxValue - minValue)
				: 0.5;
			const score =
				definition.direction === "high" ? normalized : 1 - normalized;

			return {
				vehicleId: vehicle._id,
				value,
				score,
				isLowest: value === minValue,
				isHighest: value === maxValue,
			};
		});

		return {
			definition,
			minValue,
			maxValue,
			scores,
		};
	});

	const totalScoreByVehicle = new Map<string, number>();
	for (const vehicle of vehicles) {
		totalScoreByVehicle.set(vehicle._id, 0);
	}

	for (const group of metricGroups) {
		for (const score of group.scores) {
			totalScoreByVehicle.set(
				score.vehicleId,
				(totalScoreByVehicle.get(score.vehicleId) ?? 0) + score.score,
			);
		}
	}

	const rankedVehicles = vehicles
		.map((vehicle) => {
			const score =
				(totalScoreByVehicle.get(vehicle._id) ?? 0) / metricGroups.length;
			return {
				vehicle,
				score,
				scoreOutOf100: Math.round(score * 100),
			};
		})
		.sort(
			(a, b) =>
				b.score - a.score ||
				a.vehicle.priceNpr - b.vehicle.priceNpr ||
				a.vehicle.mileage - b.vehicle.mileage,
		);

	const rankByVehicleId = new Map<string, number>();
	for (const [index, ranked] of rankedVehicles.entries()) {
		rankByVehicleId.set(ranked.vehicle._id, index + 1);
	}

	const cheapestVehicle = pickVehicleBy(vehicles, "priceNpr", "min");
	const lowestMileageVehicle = pickVehicleBy(vehicles, "mileage", "min");
	const newestVehicle = pickVehicleBy(vehicles, "year", "max");

	return {
		metricGroups,
		rankedVehicles,
		rankByVehicleId,
		valueLeader: rankedVehicles[0],
		cheapestVehicle,
		lowestMileageVehicle,
		newestVehicle,
	};
}

function pickVehicleBy(
	vehicles: ComparedVehicle[],
	key: NumericMetricKey,
	direction: "min" | "max",
) {
	return vehicles.reduce((selected, current) => {
		if (direction === "min") {
			return current[key] < selected[key] ? current : selected;
		}
		return current[key] > selected[key] ? current : selected;
	});
}

function formatCategoryLabel(value: string) {
	return value
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function labelForVehicle(vehicle: ComparedVehicle) {
	return `${vehicle.make} ${vehicle.model} (${vehicle.year})`;
}
