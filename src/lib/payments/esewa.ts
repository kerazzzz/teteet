import type { PaymentProviderAdapter } from "./types";

const DEFAULT_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

const normalize = (raw: string) => {
	const status = raw.trim().toLowerCase();
	if (status.includes("success") || status === "paid") return "paid" as const;
	if (status.includes("fail") || status.includes("cancel"))
		return "failed" as const;
	return "payment_pending" as const;
};

export const esewaAdapter: PaymentProviderAdapter = {
	provider: "esewa",
	isConfigured() {
		return Boolean(
			import.meta.env.VITE_ESEWA_MERCHANT_CODE &&
				import.meta.env.VITE_ESEWA_SECRET_KEY,
		);
	},
	createIntent(input) {
		const base = import.meta.env.VITE_ESEWA_SANDBOX_URL ?? DEFAULT_URL;
		const params = new URLSearchParams({
			amount: String(input.amountNpr),
			transaction_id: input.transactionId,
			intent_id: input.intentId,
		});
		return `${base}?${params.toString()}`;
	},
	verifyCallback(payload) {
		return {
			eventId: String(
				payload.eventId ?? payload.transaction_uuid ?? Date.now(),
			),
			statusRaw: String(payload.status ?? payload.result ?? "pending"),
			paymentReference: String(payload.refId ?? payload.reference ?? ""),
		};
	},
	normalizeStatus: normalize,
};
