import { useAuth } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	useCurrentUserProfile,
	useSyncUserProfile,
} from "@/hooks/use-user-profile";

export function RequireAuth({ children }: { children: React.ReactNode }) {
	const { isLoaded, isSignedIn, userId, getToken } = useAuth();
	const profile = useCurrentUserProfile();
	const [hasConvexToken, setHasConvexToken] = useState<boolean | null>(null);
	const [showTroubleshooting, setShowTroubleshooting] = useState(false);

	useSyncUserProfile();

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !userId) {
			setHasConvexToken(null);
			return;
		}

		let cancelled = false;
		setHasConvexToken(null);

		void (async () => {
			try {
				const sessionToken = await getToken();
				if (sessionToken) {
					if (!cancelled) {
						setHasConvexToken(true);
					}
					return;
				}
			} catch {
				// Fall through to template path.
			}

			try {
				const templateToken = await getToken({ template: "convex" });
				if (!cancelled) {
					setHasConvexToken(!!templateToken);
				}
			} catch {
				if (!cancelled) {
					setHasConvexToken(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [getToken, isLoaded, isSignedIn, userId]);

	useEffect(() => {
		if (!isSignedIn || (hasConvexToken !== false && profile !== null)) {
			setShowTroubleshooting(false);
			return;
		}

		const timeout = window.setTimeout(() => {
			setShowTroubleshooting(true);
		}, 4000);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [hasConvexToken, isSignedIn, profile]);

	if (!isLoaded) {
		return <div className="p-6">Loading account...</div>;
	}

	if (!isSignedIn) {
		return (
			<div className="p-6 max-w-xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Sign in required</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-sm text-muted-foreground">
							You need an account to access this page.
						</p>
						<Link className="text-primary underline" to="/sign-in">
							Go to sign in
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (hasConvexToken === null) {
		return <div className="p-6">Establishing secure session...</div>;
	}

	if (!hasConvexToken) {
		return (
			<div className="p-6 max-w-xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Secure session unavailable</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>We could not obtain a valid Clerk token for Convex.</p>
						{showTroubleshooting ? (
							<p className="text-destructive">
								Verify Convex `CLERK_JWT_ISSUER_DOMAIN` and Clerk session or JWT
								template configuration.
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		);
	}

	if (profile === undefined) {
		return <div className="p-6">Connecting your account...</div>;
	}

	if (!profile) {
		return (
			<div className="p-6 max-w-xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Finalizing account setup</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>We are syncing your Clerk session with Convex.</p>
						{showTroubleshooting ? (
							<p className="text-destructive">
								This is taking longer than expected. Verify Convex
								`CLERK_JWT_ISSUER_DOMAIN` and Clerk token configuration.
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!profile.isActive) {
		return (
			<div className="p-6 max-w-xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Account unavailable</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						Your account is currently deactivated. Contact support for access.
					</CardContent>
				</Card>
			</div>
		);
	}

	return <>{children}</>;
}
