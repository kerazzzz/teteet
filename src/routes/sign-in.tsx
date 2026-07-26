import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	return (
		<PageShell
			title="Sign In"
			description="Access buyer, seller, and admin features."
		>
			<div className="flex justify-center">
				<SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
			</div>
		</PageShell>
	);
}
