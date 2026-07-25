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
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
	const { login } = useAuth();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		try {
			await login(email, password);
			router.push("/dashboard");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Login failed.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Log in to EduPath AI</CardTitle>
					<CardDescription>
						Enter your credentials to access your workspace.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
							{submitting ? "Logging in..." : "Log in"}
						</Button>
					</form>
					<p className="mt-4 text-sm text-muted-foreground">
						No workspace yet?{" "}
						<Link href="/register" className="underline underline-offset-4">
							Register your consultancy
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
