export const NEPAL_DISTRICTS = [
	"Kathmandu",
	"Lalitpur",
	"Bhaktapur",
	"Pokhara",
	"Biratnagar",
	"Butwal",
	"Dharan",
	"Chitwan",
	"Hetauda",
	"Janakpur",
	"Nepalgunj",
	"Dhangadhi",
	"Itahari",
	"Birgunj",
	"Mahendranagar",
] as const;

export function formatNpr(value: number) {
	return new Intl.NumberFormat("en-NP", {
		style: "currency",
		currency: "NPR",
		maximumFractionDigits: 0,
	}).format(value);
}

export function nprCompact(value: number) {
	return new Intl.NumberFormat("en-NP", {
		style: "currency",
		currency: "NPR",
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
}
