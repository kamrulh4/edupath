"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
	Case,
	ExtractedField,
	Organisation,
	Student,
	Task,
} from "@/lib/types";

export default function DashboardPage() {
	const { user } = useAuth();
	const [organisation, setOrganisation] = useState<Organisation | null>(null);
	const [studentCount, setStudentCount] = useState<number | null>(null);
	const [caseCount, setCaseCount] = useState<number | null>(null);
	const [pendingTaskCount, setPendingTaskCount] = useState<number | null>(null);
	const [unverifiedFieldCount, setUnverifiedFieldCount] = useState<
		number | null
	>(null);

	useEffect(() => {
		apiFetch<Organisation>("/organisation/").then(({ results }) =>
			setOrganisation(results),
		);
		apiFetch<Student[]>("/students/").then(({ count }) =>
			setStudentCount(count),
		);
		apiFetch<Case[]>("/cases/").then(({ count }) => setCaseCount(count));
		apiFetch<Task[]>("/tasks/?task_status=PENDING").then(({ count }) =>
			setPendingTaskCount(count),
		);
		apiFetch<ExtractedField[]>("/extracted-fields/?unverified=1").then(
			({ count }) => setUnverifiedFieldCount(count),
		);
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
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Pending tasks
						</CardTitle>
					</CardHeader>
					<CardContent className="text-3xl font-semibold">
						{pendingTaskCount ?? "..."}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Fields to review
						</CardTitle>
					</CardHeader>
					<CardContent className="text-3xl font-semibold">
						{unverifiedFieldCount ?? "..."}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
