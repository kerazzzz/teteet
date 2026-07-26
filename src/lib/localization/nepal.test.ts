import { describe, expect, it } from "vitest";

import { formatNpr, NEPAL_DISTRICTS, nprCompact } from "./nepal";

describe("nepal localization", () => {
	it("contains Kathmandu in district list", () => {
		expect(NEPAL_DISTRICTS).toContain("Kathmandu");
	});

	it("formats NPR values", () => {
		const result = formatNpr(1500000);
		expect(result).toContain("NPR");
	});

	it("creates compact NPR values", () => {
		const result = nprCompact(2500000);
		expect(result).toContain("NPR");
	});
});
