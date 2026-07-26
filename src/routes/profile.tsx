import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useId, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	return (
		<RequireAuth>
			<ProfileContent />
		</RequireAuth>
	);
}

function ProfileContent() {
	const user = useCurrentUserProfile();
	const updateProfile = useMutation(api.users.updateProfile);

	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [formInitialized, setFormInitialized] = useState(false);
	const idPrefix = useId();
	const ids = {
		name: `${idPrefix}-profile-name`,
		phone: `${idPrefix}-profile-phone`,
		address: `${idPrefix}-profile-address`,
	};

	useEffect(() => {
		if (!user || formInitialized) {
			return;
		}

		setName(user.name ?? "");
		setPhone(user.phone ?? "");
		setAddress(user.address ?? "");
		setFormInitialized(true);
	}, [user, formInitialized]);

	const onSave = async () => {
		await updateProfile({
			name,
			phone,
			address,
		});
	};

	return (
		<PageShell title="Profile" description="Update your account information.">
			<Card>
				<CardHeader>
					<CardTitle>Account</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Role: {user?.role ?? "..."}
					</p>
					<div className="space-y-1">
						<Label htmlFor={ids.name}>Name</Label>
						<Input
							id={ids.name}
							name="name"
							autoComplete="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
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
						<Label htmlFor={ids.address}>Address</Label>
						<Input
							id={ids.address}
							name="address"
							autoComplete="street-address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
						/>
					</div>
					<Button onClick={onSave}>Save changes</Button>
				</CardContent>
			</Card>
		</PageShell>
	);
}
