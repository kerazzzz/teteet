import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useId, useState } from "react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NEPAL_DISTRICTS } from "@/lib/localization/nepal";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/seller/listings/new")({
	component: NewSellerListingPage,
});

function NewSellerListingPage() {
	return (
		<RequireRole roles={["seller", "admin"]}>
			<NewSellerListingContent />
		</RequireRole>
	);
}

function NewSellerListingContent() {
	const navigate = useNavigate();
	const createDraft = useMutation(api.vehicles.createDraft);

	const [title, setTitle] = useState("");
	const [make, setMake] = useState("");
	const [model, setModel] = useState("");
	const [year, setYear] = useState(new Date().getFullYear());
	const [fuelType, setFuelType] = useState<
		"petrol" | "diesel" | "electric" | "hybrid"
	>("petrol");
	const [transmission, setTransmission] = useState<"manual" | "automatic">(
		"manual",
	);
	const [mileage, setMileage] = useState(0);
	const [engineCapacityCc, setEngineCapacityCc] = useState(1600);
	const [locationDistrict, setLocationDistrict] = useState("Kathmandu");
	const [condition, setCondition] = useState<"new" | "used">("used");
	const [priceNpr, setPriceNpr] = useState(1000000);
	const [description, setDescription] = useState("");
	const idPrefix = useId();
	const ids = {
		title: `${idPrefix}-listing-title`,
		make: `${idPrefix}-listing-make`,
		model: `${idPrefix}-listing-model`,
		year: `${idPrefix}-listing-year`,
		fuelType: `${idPrefix}-listing-fuel-type`,
		transmission: `${idPrefix}-listing-transmission`,
		mileage: `${idPrefix}-listing-mileage`,
		engineCapacity: `${idPrefix}-listing-engine-capacity`,
		district: `${idPrefix}-listing-district`,
		condition: `${idPrefix}-listing-condition`,
		price: `${idPrefix}-listing-price-npr`,
		description: `${idPrefix}-listing-description`,
	};

	const onCreate = async () => {
		const listingId = await createDraft({
			title,
			make,
			model,
			year,
			fuelType,
			transmission,
			mileage,
			engineCapacityCc,
			locationDistrict,
			condition,
			priceNpr,
			description,
		});

		await navigate({
			to: "/seller/listings/$listingId/edit",
			params: { listingId },
		});
	};

	return (
		<PageShell title="Create Listing" description="Start with a draft listing.">
			<Card>
				<CardHeader>
					<CardTitle>Vehicle Information</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<Field id={ids.title} label="Title">
						<Input
							id={ids.title}
							name="title"
							autoComplete="off"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</Field>
					<Field id={ids.make} label="Make">
						<Input
							id={ids.make}
							name="make"
							autoComplete="off"
							value={make}
							onChange={(e) => setMake(e.target.value)}
						/>
					</Field>
					<Field id={ids.model} label="Model">
						<Input
							id={ids.model}
							name="model"
							autoComplete="off"
							value={model}
							onChange={(e) => setModel(e.target.value)}
						/>
					</Field>
					<Field id={ids.year} label="Year">
						<Input
							id={ids.year}
							name="year"
							autoComplete="off"
							type="number"
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
						/>
					</Field>
					<Field id={ids.fuelType} label="Fuel">
						<Select
							id={ids.fuelType}
							name="fuelType"
							autoComplete="off"
							value={fuelType}
							onChange={(e) =>
								setFuelType(
									e.target.value as "petrol" | "diesel" | "electric" | "hybrid",
								)
							}
						>
							<option value="petrol">Petrol</option>
							<option value="diesel">Diesel</option>
							<option value="electric">Electric</option>
							<option value="hybrid">Hybrid</option>
						</Select>
					</Field>
					<Field id={ids.transmission} label="Transmission">
						<Select
							id={ids.transmission}
							name="transmission"
							autoComplete="off"
							value={transmission}
							onChange={(e) =>
								setTransmission(e.target.value as "manual" | "automatic")
							}
						>
							<option value="manual">Manual</option>
							<option value="automatic">Automatic</option>
						</Select>
					</Field>
					<Field id={ids.mileage} label="Mileage (km)">
						<Input
							id={ids.mileage}
							name="mileage"
							autoComplete="off"
							type="number"
							value={mileage}
							onChange={(e) => setMileage(Number(e.target.value))}
						/>
					</Field>
					<Field id={ids.engineCapacity} label="Engine capacity (cc)">
						<Input
							id={ids.engineCapacity}
							name="engineCapacityCc"
							autoComplete="off"
							type="number"
							value={engineCapacityCc}
							onChange={(e) => setEngineCapacityCc(Number(e.target.value))}
						/>
					</Field>
					<Field id={ids.district} label="District">
						<Select
							id={ids.district}
							name="locationDistrict"
							autoComplete="off"
							value={locationDistrict}
							onChange={(e) => setLocationDistrict(e.target.value)}
						>
							{NEPAL_DISTRICTS.map((district) => (
								<option key={district} value={district}>
									{district}
								</option>
							))}
						</Select>
					</Field>
					<Field id={ids.condition} label="Condition">
						<Select
							id={ids.condition}
							name="condition"
							autoComplete="off"
							value={condition}
							onChange={(e) => setCondition(e.target.value as "new" | "used")}
						>
							<option value="used">Used</option>
							<option value="new">New</option>
						</Select>
					</Field>
					<Field id={ids.price} label="Price (NPR)">
						<Input
							id={ids.price}
							name="priceNpr"
							autoComplete="off"
							type="number"
							value={priceNpr}
							onChange={(e) => setPriceNpr(Number(e.target.value))}
						/>
					</Field>
					<div className="sm:col-span-2 space-y-1">
						<Label htmlFor={ids.description}>Description</Label>
						<Textarea
							id={ids.description}
							name="description"
							autoComplete="off"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			<Button onClick={onCreate}>Create draft</Button>
		</PageShell>
	);
}

function Field({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label htmlFor={id}>{label}</Label>
			{children}
		</div>
	);
}
