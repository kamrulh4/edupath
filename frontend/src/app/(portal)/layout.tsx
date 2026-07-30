"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
	{ href: "/portal", label: "Overview" },
	{ href: "/portal/documents", label: "Documents" },
	{ href: "/portal/recommendations", label: "Offers" },
	{ href: "/portal/messages", label: "Messages" },
];

export default function PortalLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user, loading, logout } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.replace("/login");
		} else if (user.kind !== "STUDENT") {
			router.replace("/dashboard");
		}
	}, [loading, user, router]);

	if (loading || !user || user.kind !== "STUDENT") {
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
						<span className="font-semibold">EduPath AI · Student Portal</span>
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
							{user.first_name} {user.last_name}
						</span>
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
