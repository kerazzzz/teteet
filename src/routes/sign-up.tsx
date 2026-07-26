import { SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";

export const Route = createFileRoute("/sign-up")({
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<PageShell
			title="Create Account"
			description="Register as a buyer first. Admin can later change your role to seller."
		>
			<div className="flex justify-center">
				<SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
			</div>
		</PageShell>
	);
}
