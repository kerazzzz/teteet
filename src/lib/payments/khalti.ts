import type { PaymentProviderAdapter } from "./types";

const DEFAULT_URL = "https://khalti.com/pay";

const normalize = (raw: string) => {
	const status = raw.trim().toLowerCase();
	if (status.includes("success") || status === "paid") return "paid" as const;
	if (status.includes("fail") || status.includes("cancel"))
		return "failed" as const;
	return "payment_pending" as const;
};

export const khaltiAdapter: PaymentProviderAdapter = {
	provider: "khalti",
	isConfigured() {
		return Boolean(
			import.meta.env.VITE_KHALTI_PUBLIC_KEY &&
				import.meta.env.VITE_KHALTI_SECRET_KEY,
		);
	},
	createIntent(input) {
		const base = import.meta.env.VITE_KHALTI_SANDBOX_URL ?? DEFAULT_URL;
		const params = new URLSearchParams({
			amount: String(input.amountNpr),
			transaction_id: input.transactionId,
			intent_id: input.intentId,
		});
		return `${base}?${params.toString()}`;
	},
	verifyCallback(payload) {
		return {
			eventId: String(payload.eventId ?? payload.pidx ?? Date.now()),
			statusRaw: String(payload.status ?? payload.state ?? "pending"),
			paymentReference: String(payload.pidx ?? ""),
		};
	},
	normalizeStatus: normalize,
};
