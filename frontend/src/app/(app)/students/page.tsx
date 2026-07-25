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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Student } from "@/lib/types";

export default function StudentsPage() {
	const [students, setStudents] = useState<Student[]>([]);
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState({
		first_name: "",
		last_name: "",
		email: "",
		nationality: "",
	});

	async function loadStudents(query = "") {
		const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
		const { results } = await apiFetch<Student[]>(`/students/${suffix}`);
		setStudents(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadStudents();
	}, []);

	async function handleSearch(e: FormEvent) {
		e.preventDefault();
		loadStudents(search);
	}

	async function handleCreate(e: FormEvent) {
		e.preventDefault();
		setCreating(true);
		try {
			await apiFetch<Student>("/students/", {
				method: "POST",
				body: JSON.stringify(form),
			});
			toast.success("Student added.");
			setForm({ first_name: "", last_name: "", email: "", nationality: "" });
			setDialogOpen(false);
			loadStudents(search);
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add student.",
			);
		} finally {
			setCreating(false);
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Students</CardTitle>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger render={<Button size="sm">Add student</Button>} />
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add a student</DialogTitle>
						</DialogHeader>
						<form className="flex flex-col gap-4" onSubmit={handleCreate}>
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-2">
									<Label>First name</Label>
									<Input
										required
										value={form.first_name}
										onChange={(e) =>
											setForm({ ...form, first_name: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Last name</Label>
									<Input
										required
										value={form.last_name}
										onChange={(e) =>
											setForm({ ...form, last_name: e.target.value })
										}
									/>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Email</Label>
								<Input
									type="email"
									required
									value={form.email}
									onChange={(e) => setForm({ ...form, email: e.target.value })}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Nationality</Label>
								<Input
									value={form.nationality}
									onChange={(e) =>
										setForm({ ...form, nationality: e.target.value })
									}
								/>
							</div>
							<DialogFooter>
								<Button type="submit" disabled={creating}>
									{creating ? "Adding..." : "Add student"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form className="flex gap-2" onSubmit={handleSearch}>
					<Input
						placeholder="Search by name or email"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Button type="submit" variant="outline">
						Search
					</Button>
				</form>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Nationality</TableHead>
							<TableHead>Portal access</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{students.map((student) => (
							<TableRow key={student.uid}>
								<TableCell>
									<Link
										href={`/students/${student.uid}`}
										className="hover:underline"
									>
										{student.first_name} {student.last_name}
									</Link>
								</TableCell>
								<TableCell>{student.email}</TableCell>
								<TableCell>{student.nationality || "—"}</TableCell>
								<TableCell>
									<Badge variant={student.user ? "default" : "secondary"}>
										{student.user ? "Invited" : "Not invited"}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
