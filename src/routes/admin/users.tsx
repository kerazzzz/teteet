import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { RequireRole } from "@/components/auth/require-role";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/users")({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	return (
		<RequireRole roles={["admin"]}>
			<AdminUsersContent />
		</RequireRole>
	);
}

function AdminUsersContent() {
	const users = useQuery(api.admin.listUsers, { limit: 300 });
	const setRole = useMutation(api.users.setRole);

	return (
		<PageShell title="Users" description="Manage user roles and status.">
			{!users ? (
				<p>Loading users...</p>
			) : (
				<div className="grid gap-3">
					{users.map((user) => (
						<Card key={user._id}>
							<CardHeader className="flex-row items-center justify-between pb-2">
								<CardTitle className="text-base">{user.name}</CardTitle>
								<Badge>{user.role}</Badge>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<p>{user.email}</p>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setRole({ userId: user._id, role: "buyer" })}
									>
										Set Buyer
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setRole({ userId: user._id, role: "seller" })
										}
									>
										Set Seller
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setRole({ userId: user._id, role: "admin" })}
									>
										Set Admin
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</PageShell>
	);
}
