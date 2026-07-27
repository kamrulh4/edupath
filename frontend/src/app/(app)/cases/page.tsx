"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Case, CaseStage, Student, User } from "@/lib/types";

const STAGES: CaseStage[] = [
	"ENQUIRY",
	"DOCUMENTS_PENDING",
	"SHORTLISTED",
	"PREPARED",
	"SUBMITTED",
	"ENROLLED",
];

export default function CasesPage() {
	const [cases, setCases] = useState<Case[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [members, setMembers] = useState<User[]>([]);
	const [stageFilter, setStageFilter] = useState<string>("ALL");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState({ student: "", adviser: "" });

	async function loadCases(stage: string) {
		const suffix = stage !== "ALL" ? `?stage=${stage}` : "";
		const { results } = await apiFetch<Case[]>(`/cases/${suffix}`);
		setCases(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadCases(stageFilter);
		apiFetch<Student[]>("/students/").then(({ results }) =>
			setStudents(results),
		);
		apiFetch<User[]>("/organisation/members/").then(({ results }) =>
			setMembers(results),
		);
	}, []);

	function studentLabel(uid: string) {
		const student = students.find((s) => s.uid === uid);
		return student ? `${student.first_name} ${student.last_name}` : uid;
	}

	function adviserLabel(uid: string | null) {
		if (!uid) return "Unassigned";
		const member = members.find((m) => m.uid === uid);
		return member ? `${member.first_name} ${member.last_name}` : uid;
	}

	async function handleStageFilterChange(value: string | null) {
		const stage = value ?? "ALL";
		setStageFilter(stage);
		loadCases(stage);
	}

	async function handleCreate(e: FormEvent) {
		e.preventDefault();
		if (!form.student) {
			toast.error("Select a student.");
			return;
		}
		setCreating(true);
		try {
			await apiFetch<Case>("/cases/", {
				method: "POST",
				body: JSON.stringify({
					student: form.student,
					adviser: form.adviser || null,
				}),
			});
			toast.success("Case created.");
			setForm({ student: "", adviser: "" });
			setDialogOpen(false);
			loadCases(stageFilter);
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not create case.",
			);
		} finally {
			setCreating(false);
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Cases</CardTitle>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger render={<Button size="sm">New case</Button>} />
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Start a new case</DialogTitle>
						</DialogHeader>
						<form className="flex flex-col gap-4" onSubmit={handleCreate}>
							<div className="flex flex-col gap-2">
								<Label>Student</Label>
								<Select
									value={form.student}
									onValueChange={(value) =>
										setForm({ ...form, student: value ?? "" })
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select a student">
											{(value: string | null) =>
												value ? studentLabel(value) : "Select a student"
											}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{students.map((student) => (
											<SelectItem key={student.uid} value={student.uid}>
												{student.first_name} {student.last_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Adviser (optional)</Label>
								<Select
									value={form.adviser}
									onValueChange={(value) =>
										setForm({ ...form, adviser: value ?? "" })
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Unassigned">
											{(value: string | null) =>
												value ? adviserLabel(value) : "Unassigned"
											}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{members.map((member) => (
											<SelectItem key={member.uid} value={member.uid}>
												{member.first_name} {member.last_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<DialogFooter>
								<Button type="submit" disabled={creating}>
									{creating ? "Creating..." : "Create case"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Select value={stageFilter} onValueChange={handleStageFilterChange}>
					<SelectTrigger className="w-56">
						<SelectValue>
							{(value: string | null) =>
								value === "ALL" || !value
									? "All stages"
									: value.replaceAll("_", " ")
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All stages</SelectItem>
						{STAGES.map((stage) => (
							<SelectItem key={stage} value={stage}>
								{stage.replaceAll("_", " ")}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Student</TableHead>
							<TableHead>Adviser</TableHead>
							<TableHead>Stage</TableHead>
							<TableHead>Documents</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{cases.map((c) => (
							<TableRow key={c.uid}>
								<TableCell>
									<Link
										href={`/students/${c.student}`}
										className="hover:underline"
									>
										{studentLabel(c.student)}
									</Link>
								</TableCell>
								<TableCell>{adviserLabel(c.adviser)}</TableCell>
								<TableCell>
									<Badge variant="secondary">
										{c.stage.replaceAll("_", " ")}
									</Badge>
								</TableCell>
								<TableCell>
									<Link
										href={`/cases/${c.uid}`}
										className="text-primary hover:underline"
									>
										View / upload
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
