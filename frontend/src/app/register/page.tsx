"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
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
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
	const { login } = useAuth();
	const router = useRouter();
	const [organisationName, setOrganisationName] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		try {
			await apiFetch("/auth/register/", {
				method: "POST",
				body: JSON.stringify({
					organisation_name: organisationName,
					first_name: firstName,
					last_name: lastName,
					email,
					password,
				}),
			});
			await login(email, password);
			toast.success("Workspace created.");
			router.push("/dashboard");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Registration failed.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Set up your consultancy</CardTitle>
					<CardDescription>
						This creates your organisation and your ADMIN account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
						<div className="flex flex-col gap-2">
							<Label htmlFor="organisation_name">Consultancy name</Label>
							<Input
								id="organisation_name"
								required
								value={organisationName}
								onChange={(e) => setOrganisationName(e.target.value)}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="first_name">First name</Label>
								<Input
									id="first_name"
									required
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="last_name">Last name</Label>
								<Input
									id="last_name"
									required
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
								/>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						<Button type="submit" disabled={submitting}>
							{submitting ? "Creating..." : "Create workspace"}
						</Button>
					</form>
					<p className="mt-4 text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link href="/login" className="underline underline-offset-4">
							Log in
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
