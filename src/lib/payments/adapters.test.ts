import { describe, expect, it } from "vitest";

import { esewaAdapter } from "./esewa";
import { khaltiAdapter } from "./khalti";

describe("payment adapters", () => {
	it("normalizes paid statuses", () => {
		expect(esewaAdapter.normalizeStatus("SUCCESS")).toBe("paid");
		expect(khaltiAdapter.normalizeStatus("paid")).toBe("paid");
	});

	it("normalizes failed statuses", () => {
		expect(esewaAdapter.normalizeStatus("failed")).toBe("failed");
		expect(khaltiAdapter.normalizeStatus("cancelled")).toBe("failed");
	});

	it("builds checkout URLs with query params", () => {
		const esewaUrl = esewaAdapter.createIntent({
			amountNpr: 1000,
			transactionId: "tx1",
			intentId: "in1",
		});

		const khaltiUrl = khaltiAdapter.createIntent({
			amountNpr: 2000,
			transactionId: "tx2",
			intentId: "in2",
		});

		expect(esewaUrl).toContain("transaction_id=tx1");
		expect(khaltiUrl).toContain("transaction_id=tx2");
	});
});
