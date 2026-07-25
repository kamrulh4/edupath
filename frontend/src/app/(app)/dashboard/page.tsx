"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { Case, Organisation, Student } from "@/lib/types";

export default function DashboardPage() {
	const { user } = useAuth();
	const [organisation, setOrganisation] = useState<Organisation | null>(null);
	const [studentCount, setStudentCount] = useState<number | null>(null);
	const [caseCount, setCaseCount] = useState<number | null>(null);

	useEffect(() => {
		apiFetch<Organisation>("/organisation/").then(({ results }) =>
			setOrganisation(results),
		);
		apiFetch<Student[]>("/students/").then(({ count }) =>
			setStudentCount(count),
		);
		apiFetch<Case[]>("/cases/").then(({ count }) => setCaseCount(count));
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold">
					Welcome back, {user?.first_name ?? ""}
				</h1>
				<p className="text-muted-foreground">
					{organisation?.name ?? "Loading workspace..."}
				</p>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Students
						</CardTitle>
					</CardHeader>
					<CardContent className="text-3xl font-semibold">
						{studentCount ?? "..."}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Active cases
						</CardTitle>
					</CardHeader>
					<CardContent className="text-3xl font-semibold">
						{caseCount ?? "..."}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
