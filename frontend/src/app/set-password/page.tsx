"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api-client";

function SetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const uid = searchParams.get("uid") ?? "";
	const token = searchParams.get("token") ?? "";

	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		try {
			await apiFetch("/auth/set-password/", {
				method: "POST",
				body: JSON.stringify({ uidb64: uid, token, password }),
			});
			toast.success("Password set. You can now log in.");
			router.push("/login");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not set password.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	if (!uid || !token) {
		return (
			<p className="text-sm text-muted-foreground">
				This invite link is missing information.
			</p>
		);
	}

	return (
		<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
			<div className="flex flex-col gap-2">
				<Label htmlFor="password">New password</Label>
				<Input
					id="password"
					type="password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</div>
			<Button type="submit" disabled={submitting}>
				{submitting ? "Saving..." : "Set password"}
			</Button>
		</form>
	);
}

export default function SetPasswordPage() {
	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Set your password</CardTitle>
					<CardDescription>
						Choose a password to activate your student portal access.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense fallback={null}>
						<SetPasswordForm />
					</Suspense>
				</CardContent>
			</Card>
		</div>
	);
}
