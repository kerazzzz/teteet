import { Link } from "@tanstack/react-router";
import { Eye, Gauge, Heart, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatNpr } from "@/lib/localization/nepal";
import { cn } from "@/lib/utils";

type ListingCardItem = {
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
	status: string;
	views?: number;
	likes?: number;
	coverImageUrl?: string | null;
};

export function ListingCard({
	item,
	selected,
	saved,
	compareDisabled,
	onSelect,
}: {
	item: ListingCardItem;
	selected?: boolean;
	saved?: boolean;
	compareDisabled?: boolean;
	onSelect?: (item: ListingCardItem) => void;
}) {
	return (
		<Card
			className={cn(
				"group h-full overflow-hidden border transition-all duration-300",
				selected
					? "border-primary/70 bg-primary/5 shadow-[0_30px_60px_-50px_oklch(0.3_0.08_45)]"
					: "border-border/70",
			)}
		>
			<div className="relative h-44 overflow-hidden border-b border-border/70">
				{item.coverImageUrl ? (
					<img
						src={item.coverImageUrl}
						alt={item.title}
						className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
					/>
				) : (
					<div className="h-full w-full bg-[radial-gradient(circle_at_10%_10%,oklch(0.74_0.12_52_/_0.35),transparent_50%),linear-gradient(130deg,oklch(0.94_0.05_220_/_0.45),oklch(0.9_0.07_48_/_0.35))]" />
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
				<div className="absolute left-3 top-3 flex flex-wrap gap-2">
					<Badge variant={item.status === "live" ? "secondary" : "outline"}>
						{item.status.replace(/_/g, " ")}
					</Badge>
					<Badge variant="outline" className="bg-background/80">
						{item.year}
					</Badge>
				</div>
				<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-white/80">
							{item.make} {item.model}
						</p>
						<p className="text-lg font-semibold">{formatNpr(item.priceNpr)}</p>
					</div>
					<div className="rounded-full border border-white/30 bg-black/35 px-2.5 py-1 text-xs">
						{item.mileage.toLocaleString()} km
					</div>
				</div>
			</div>

			<CardHeader className="space-y-2 pb-2">
				<CardTitle className="line-clamp-2 text-base leading-tight">
					{item.title}
				</CardTitle>
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<MapPin className="size-3.5" />
					<span>{item.locationDistrict}</span>
				</div>
			</CardHeader>

			<CardContent className="space-y-3 pt-0 text-sm">
				<div className="flex flex-wrap gap-2">
					<Chip>{item.fuelType}</Chip>
					<Chip>{item.transmission}</Chip>
					<Chip>
						<Gauge className="size-3.5" />
						{item.mileage.toLocaleString()} km
					</Chip>
				</div>

				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1">
						<Eye className="size-3.5" />
						{item.views?.toLocaleString("en-NP") ?? "0"}
					</span>
					<span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1">
						<Heart className="size-3.5" />
						{item.likes?.toLocaleString("en-NP") ?? "0"}
					</span>
				</div>
			</CardContent>

			<CardFooter className="flex flex-col items-stretch gap-2">
				<div className="flex gap-2">
					<Link to="/listings/$listingId" params={{ listingId: item._id }}>
						<Button size="sm">View details</Button>
					</Link>
					{onSelect ? (
						<Button
							type="button"
							variant={selected ? "secondary" : "outline"}
							size="sm"
							disabled={compareDisabled && !selected}
							onClick={() => onSelect(item)}
						>
							{selected
								? "Added"
								: compareDisabled
									? "Compare full"
									: "Add to compare"}
						</Button>
					) : null}
				</div>
				{onSelect ? (
					<p className="text-xs text-muted-foreground">
						{selected
							? 'Selected for comparison. Use the floating "Compare these" button.'
							: saved
								? "Already in your saved comparison."
								: "Pick up to five vehicles to compare side-by-side."}
					</p>
				) : null}
				{saved && !selected ? (
					<Badge variant="outline" className="w-fit">
						Saved in comparison
					</Badge>
				) : null}
				{selected ? (
					<Badge variant="secondary" className="w-fit">
						Selected for compare
					</Badge>
				) : null}
			</CardFooter>
		</Card>
	);
}

function Chip({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-[0.68rem] font-medium text-muted-foreground">
			{children}
		</span>
	);
}
