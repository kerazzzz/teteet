import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { RequireAuth } from "./require-auth";

export function RequireRole({
	roles,
	children,
}: {
	roles: Array<"buyer" | "seller" | "admin">;
	children: React.ReactNode;
}) {
	return (
		<RequireAuth>
			<RoleGate roles={roles}>{children}</RoleGate>
		</RequireAuth>
	);
}

function RoleGate({
	roles,
	children,
}: {
	roles: Array<"buyer" | "seller" | "admin">;
	children: React.ReactNode;
}) {
	const user = useCurrentUserProfile();

	if (user === undefined) {
		return <div className="p-6">Loading role...</div>;
	}

	if (!user) {
		return <div className="p-6">Resolving your role...</div>;
	}

	if (!roles.includes(user.role)) {
		return (
			<div className="p-6 text-destructive">
				You do not have permission to access this page.
			</div>
		);
	}

	return <>{children}</>;
}
