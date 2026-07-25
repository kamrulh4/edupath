const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export type Envelope<T> = {
	success: boolean;
	code: number;
	count: number | null;
	next: string | null;
	previous: string | null;
	results: T;
};

type ErrorEnvelope = {
	success: false;
	code: number;
	message: string;
	errors: unknown;
};

export class ApiError extends Error {
	code: number;
	errors: unknown;

	constructor(message: string, code: number, errors: unknown) {
		super(message);
		this.code = code;
		this.errors = errors;
	}
}

function getAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("refresh_token");
}

export function setTokens(access: string, refresh: string) {
	localStorage.setItem("access_token", access);
	localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
	localStorage.removeItem("access_token");
	localStorage.removeItem("refresh_token");
}

async function tryRefreshToken(): Promise<string | null> {
	const refresh = getRefreshToken();
	if (!refresh) return null;

	const res = await fetch(`${API_URL}/auth/refresh/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refresh }),
	});
	if (!res.ok) return null;

	const data = (await res.json()) as Envelope<{ access: string }>;
	const access = data.results.access;
	localStorage.setItem("access_token", access);
	return access;
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
	_retried = false,
): Promise<Envelope<T>> {
	const token = getAccessToken();
	const headers = new Headers(options.headers);
	if (!(options.body instanceof FormData)) {
		headers.set("Content-Type", "application/json");
	}
	if (token) headers.set("Authorization", `Bearer ${token}`);

	const res = await fetch(`${API_URL}${path}`, { ...options, headers });

	if (res.status === 401 && !_retried && getRefreshToken()) {
		const newAccess = await tryRefreshToken();
		if (newAccess) {
			return apiFetch<T>(path, options, true);
		}
		clearTokens();
	}

	const data = (await res.json()) as Envelope<T> | ErrorEnvelope;

	if (!res.ok || data.success === false) {
		const errorData = data as ErrorEnvelope;
		throw new ApiError(
			errorData.message ?? "Something went wrong.",
			res.status,
			errorData.errors,
		);
	}

	return data as Envelope<T>;
}
