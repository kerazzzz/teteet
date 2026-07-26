import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";

import { api } from "../../convex/_generated/api";

let lastSyncedUserId: string | null = null;

export function useSyncUserProfile() {
	const { isLoaded, isSignedIn, userId } = useAuth();
	const upsert = useMutation(api.users.upsertFromClerk);

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !userId) {
			lastSyncedUserId = null;
			return;
		}

		if (lastSyncedUserId === userId) {
			return;
		}

		lastSyncedUserId = userId;
		void upsert({}).catch(() => {
			if (lastSyncedUserId === userId) {
				lastSyncedUserId = null;
			}
		});
	}, [isLoaded, isSignedIn, userId, upsert]);
}

export function useCurrentUserProfile() {
	return useQuery(api.users.getCurrent);
}
