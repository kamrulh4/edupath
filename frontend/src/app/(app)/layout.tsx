"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/organisation", label: "Organisation" },
	{ href: "/students", label: "Students" },
	{ href: "/cases", label: "Cases" },
	{ href: "/courses", label: "Courses" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const { user, loading, logout, refreshUser } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/login");
		}
	}, [loading, user, router]);

	async function handleAvatarUpload(file: File) {
		const formData = new FormData();
		formData.append("image", file);
		try {
			await apiFetch<User>("/auth/me/", { method: "PATCH", body: formData });
			await refreshUser();
			toast.success("Profile photo updated.");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update photo.",
			);
		}
	}

	if (loading || !user) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Loading...
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col">
			<header className="border-b">
				<div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
					<div className="flex items-center gap-6">
						<span className="font-semibold">EduPath AI</span>
						<nav className="flex items-center gap-4 text-sm">
							{NAV_ITEMS.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className={
										pathname === item.href
											? "font-medium text-foreground"
											: "text-muted-foreground hover:text-foreground"
									}
								>
									{item.label}
								</Link>
							))}
						</nav>
					</div>
					<div className="flex items-center gap-3 text-sm">
						<span className="text-muted-foreground">
							{user.first_name} · {user.kind}
						</span>
						<AvatarUpload
							src={user.image}
							fallbackText={user.first_name.charAt(0)}
							onUpload={handleAvatarUpload}
							size="sm"
						/>
						<Button variant="outline" size="sm" onClick={logout}>
							Log out
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
				{children}
			</main>
		</div>
	);
}
