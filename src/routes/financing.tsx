import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useId, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNpr } from "@/lib/localization/nepal";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/financing")({
	component: FinancingPage,
});

function FinancingPage() {
	return (
		<RequireAuth>
			<FinancingContent />
		</RequireAuth>
	);
}

function FinancingContent() {
	const options = useQuery(api.financing.listOptions);
	const submitLead = useMutation(api.financing.submitLead);

	const [principal, setPrincipal] = useState(1500000);
	const [annualRate, setAnnualRate] = useState(11);
	const [tenureMonths, setTenureMonths] = useState(48);
	const [selectedOptionId, setSelectedOptionId] = useState("");
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [monthlyIncomeNpr, setMonthlyIncomeNpr] = useState(80000);
	const [notes, setNotes] = useState("");
	const idPrefix = useId();
	const ids = {
		principal: `${idPrefix}-loan-amount-npr`,
		annualRate: `${idPrefix}-annual-interest-rate`,
		tenureMonths: `${idPrefix}-tenure-months`,
		financingOptionId: `${idPrefix}-financing-option-id`,
		fullName: `${idPrefix}-lead-full-name`,
		phone: `${idPrefix}-lead-phone`,
		email: `${idPrefix}-lead-email`,
		monthlyIncomeNpr: `${idPrefix}-monthly-income-npr`,
		notes: `${idPrefix}-lead-notes`,
	};

	const emiResult = useQuery(api.financing.calculateEmi, {
		principalNpr: principal,
		annualRatePct: annualRate,
		tenureMonths,
	});

	const selectedOption = useMemo(
		() => options?.find((item) => item._id === selectedOptionId),
		[options, selectedOptionId],
	);

	const onSubmit = async () => {
		await submitLead({
			financingOptionId: selectedOptionId
				? (selectedOptionId as Id<"financingOptions">)
				: undefined,
			requestedAmountNpr: principal,
			tenureMonths,
			monthlyIncomeNpr,
			fullName,
			phone,
			email,
			notes,
		});

		setNotes("");
	};

	return (
		<PageShell
			title="Financing"
			description="EMI calculator and loan lead submission for local lenders."
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>EMI Calculator</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<Label htmlFor={ids.principal}>Loan amount (NPR)</Label>
							<Input
								id={ids.principal}
								name="principal"
								autoComplete="off"
								type="number"
								value={principal}
								onChange={(e) => setPrincipal(Number(e.target.value))}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={ids.annualRate}>Annual interest (%)</Label>
							<Input
								id={ids.annualRate}
								name="annualRate"
								autoComplete="off"
								type="number"
								step="0.01"
								value={annualRate}
								onChange={(e) => setAnnualRate(Number(e.target.value))}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={ids.tenureMonths}>Tenure (months)</Label>
							<Input
								id={ids.tenureMonths}
								name="tenureMonths"
								autoComplete="off"
								type="number"
								value={tenureMonths}
								onChange={(e) => setTenureMonths(Number(e.target.value))}
							/>
						</div>

						{emiResult ? (
							<div className="rounded-md border p-3 text-sm">
								<p>Monthly EMI: {formatNpr(emiResult.monthlyInstallmentNpr)}</p>
								<p>Total repayment: {formatNpr(emiResult.totalRepaymentNpr)}</p>
								<p>Total interest: {formatNpr(emiResult.totalInterestNpr)}</p>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Submit Financing Lead</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<Label htmlFor={ids.financingOptionId}>
								Choose financing option
							</Label>
							<Select
								id={ids.financingOptionId}
								name="financingOptionId"
								autoComplete="off"
								value={selectedOptionId}
								onChange={(e) => setSelectedOptionId(e.target.value)}
							>
								<option value="">No specific lender</option>
								{options?.map((option) => (
									<option key={option._id} value={option._id}>
										{option.institutionName} ({option.interestRateAnnual}% p.a.)
									</option>
								))}
							</Select>
							{selectedOption ? (
								<p className="text-xs text-muted-foreground">
									{selectedOption.eligibilityCriteria}
								</p>
							) : null}
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<Label htmlFor={ids.fullName}>Full name</Label>
								<Input
									id={ids.fullName}
									name="fullName"
									autoComplete="name"
									value={fullName}
									onChange={(e) => setFullName(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={ids.phone}>Phone</Label>
								<Input
									id={ids.phone}
									name="phone"
									type="tel"
									autoComplete="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={ids.email}>Email</Label>
								<Input
									id={ids.email}
									name="email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={ids.monthlyIncomeNpr}>
									Monthly income (NPR)
								</Label>
								<Input
									id={ids.monthlyIncomeNpr}
									name="monthlyIncomeNpr"
									autoComplete="off"
									type="number"
									value={monthlyIncomeNpr}
									onChange={(e) => setMonthlyIncomeNpr(Number(e.target.value))}
								/>
							</div>
						</div>

						<Label htmlFor={ids.notes}>Additional notes</Label>
						<Textarea
							id={ids.notes}
							name="notes"
							autoComplete="off"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Additional notes"
						/>

						<Button onClick={onSubmit}>Submit lead</Button>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
