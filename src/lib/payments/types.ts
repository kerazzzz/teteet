export type PaymentProvider = "esewa" | "khalti";

export type PaymentIntentInput = {
	amountNpr: number;
	transactionId: string;
	intentId: string;
};

export type NormalizedPaymentStatus = "payment_pending" | "paid" | "failed";

export interface PaymentProviderAdapter {
	provider: PaymentProvider;
	isConfigured(): boolean;
	createIntent(input: PaymentIntentInput): string;
	verifyCallback(payload: Record<string, unknown>): {
		eventId: string;
		statusRaw: string;
		paymentReference?: string;
	};
	normalizeStatus(rawStatus: string): NormalizedPaymentStatus;
}
