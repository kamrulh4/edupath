"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
	Case,
	CaseStage,
	DashboardReporting,
	ExtractedField,
	Organisation,
	Student,
	Task,
} from "@/lib/types";

const STAGES: CaseStage[] = [
	"ENQUIRY",
	"DOCUMENTS_PENDING",
	"SHORTLISTED",
	"PREPARED",
	"SUBMITTED",
	"ENROLLED",
];

export default function DashboardPage() {
	const { user } = useAuth();
	const [organisation, setOrganisation] = useState<Organisation | null>(null);
	const [studentCount, setStudentCount] = useState<number | null>(null);
	const [caseCount, setCaseCount] = useState<number | null>(null);
	const [pendingTaskCount, setPendingTaskCount] = useState<number | null>(null);
	const [unverifiedFieldCount, setUnverifiedFieldCount] = useState<
		number | null
	>(null);
	const [stageBreakdown, setStageBreakdown] = useState<Record<string, number>>(
		{},
	);
	const [reporting, setReporting] = useState<DashboardReporting | null>(null);

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
		Promise.all(
			STAGES.map((stage) =>
				apiFetch<Case[]>(`/cases/?stage=${stage}`).then(
					({ count }) => [stage, count ?? 0] as const,
				),
			),
		).then((entries) => setStageBreakdown(Object.fromEntries(entries)));
		apiFetch<DashboardReporting>("/dashboard/").then(({ results }) =>
			setReporting(results),
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
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Missing documents
						</CardTitle>
					</CardHeader>
					<CardContent className="text-3xl font-semibold">
						{reporting?.missing_documents_count ?? "..."}
					</CardContent>
				</Card>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm text-muted-foreground">
						Cases by stage
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					{STAGES.map((stage) => (
						<Badge key={stage} variant="secondary">
							{stage.replaceAll("_", " ")}: {stageBreakdown[stage] ?? "..."}
						</Badge>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm text-muted-foreground">
						Upcoming deadlines (next 7 days)
					</CardTitle>
				</CardHeader>
				<CardContent>
					{!reporting || reporting.upcoming_deadlines.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{reporting ? "No upcoming deadlines." : "Loading..."}
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Task</TableHead>
									<TableHead>Due date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Case</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{reporting.upcoming_deadlines.map((task) => (
									<TableRow key={task.uid}>
										<TableCell>{task.title}</TableCell>
										<TableCell>{task.due_date}</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{task.task_status.replaceAll("_", " ")}
											</Badge>
										</TableCell>
										<TableCell>
											<Link
												href={`/cases/${task.case}`}
												className="text-primary hover:underline"
											>
												View case
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Adviser workload
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!reporting || reporting.adviser_workload.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{reporting ? "No advisers yet." : "Loading..."}
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Adviser</TableHead>
										<TableHead>Active cases</TableHead>
										<TableHead>Pending tasks</TableHead>
										<TableHead>Overdue</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{reporting.adviser_workload.map((row) => (
										<TableRow key={row.adviser_uid}>
											<TableCell>{row.adviser_name}</TableCell>
											<TableCell>{row.active_cases}</TableCell>
											<TableCell>{row.pending_tasks}</TableCell>
											<TableCell>
												{row.overdue_tasks > 0 ? (
													<Badge variant="destructive">
														{row.overdue_tasks}
													</Badge>
												) : (
													0
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							Course interest
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!reporting || reporting.course_interest.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{reporting ? "No recommendations yet." : "Loading..."}
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Course</TableHead>
										<TableHead>Provider</TableHead>
										<TableHead>Recommendations</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{reporting.course_interest.map((row) => (
										<TableRow key={row.course_uid}>
											<TableCell>{row.course_name}</TableCell>
											<TableCell>{row.provider_name}</TableCell>
											<TableCell>{row.recommendation_count}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
