"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { apiFetch, clearTokens, setTokens } from "@/lib/api-client";
import type { User } from "@/lib/types";

type LoginResult = { access: string; refresh: string; user: User };

type AuthContextValue = {
	user: User | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	async function refreshUser() {
		try {
			const { results } = await apiFetch<User>("/auth/me/");
			setUser(results);
		} catch {
			setUser(null);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		const token = localStorage.getItem("access_token");
		if (!token) {
			setLoading(false);
			return;
		}
		refreshUser().finally(() => setLoading(false));
	}, []);

	async function login(email: string, password: string) {
		const { results } = await apiFetch<LoginResult>("/auth/login/", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
		setTokens(results.access, results.refresh);
		setUser(results.user);
	}

	function logout() {
		clearTokens();
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
