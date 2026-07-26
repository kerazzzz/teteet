import { useAuth } from "@clerk/clerk-react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProviderWithAuth } from "convex/react";
import { useCallback, useMemo } from "react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
	throw new Error("Missing VITE_CONVEX_URL");
}

const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

function useAuthFromClerkWithFallbackToken() {
	const { isLoaded, isSignedIn, getToken } = useAuth();

	const fetchAccessToken = useCallback(
		async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
			try {
				const sessionToken = await getToken({ skipCache: forceRefreshToken });
				if (sessionToken) {
					return sessionToken;
				}
			} catch {
				// Fall back to template token path.
			}

			try {
				return await getToken({
					template: "convex",
					skipCache: forceRefreshToken,
				});
			} catch {
				return null;
			}
		},
		[getToken],
	);

	return useMemo(
		() => ({
			isLoading: !isLoaded,
			isAuthenticated: isSignedIn ?? false,
			fetchAccessToken,
		}),
		[isLoaded, isSignedIn, fetchAccessToken],
	);
}

export default function AppConvexProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ConvexProviderWithAuth
			client={convexQueryClient.convexClient}
			useAuth={useAuthFromClerkWithFallbackToken}
		>
			{children}
		</ConvexProviderWithAuth>
	);
}
