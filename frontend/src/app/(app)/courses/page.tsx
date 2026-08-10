"use client";

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
import type { Course } from "@/lib/types";

const EMPTY_FORM = {
	provider_name: "",
	course_name: "",
	campus: "",
	duration: "",
	tuition_fee: "",
	category: "",
	academic_requirements: "",
	english_requirements: "",
	is_partner_provider: false,
};

export default function CoursesPage() {
	const [courses, setCourses] = useState<Course[]>([]);
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);

	const [editingCourse, setEditingCourse] = useState<Course | null>(null);
	const [editForm, setEditForm] = useState(EMPTY_FORM);
	const [savingEdit, setSavingEdit] = useState(false);
	const [togglingUid, setTogglingUid] = useState<string | null>(null);

	async function loadCourses(query = "") {
		const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
		const { results } = await apiFetch<Course[]>(`/courses/${suffix}`);
		setCourses(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadCourses();
	}, []);

	async function handleSearch(e: FormEvent) {
		e.preventDefault();
		loadCourses(search);
	}

	async function handleCreate(e: FormEvent) {
		e.preventDefault();
		setCreating(true);
		try {
			await apiFetch<Course>("/courses/", {
				method: "POST",
				body: JSON.stringify({
					...form,
					tuition_fee: form.tuition_fee || null,
				}),
			});
			toast.success("Course added.");
			setForm(EMPTY_FORM);
			setDialogOpen(false);
			loadCourses(search);
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add course.",
			);
		} finally {
			setCreating(false);
		}
	}

	function openEditDialog(course: Course) {
		setEditingCourse(course);
		setEditForm({
			provider_name: course.provider_name,
			course_name: course.course_name,
			campus: course.campus,
			duration: course.duration,
			tuition_fee: course.tuition_fee ?? "",
			category: course.category,
			academic_requirements: course.academic_requirements,
			english_requirements: course.english_requirements,
			is_partner_provider: course.is_partner_provider,
		});
	}

	async function handleSaveEdit(e: FormEvent) {
		e.preventDefault();
		if (!editingCourse) return;
		setSavingEdit(true);
		try {
			await apiFetch<Course>(`/courses/${editingCourse.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({
					...editForm,
					tuition_fee: editForm.tuition_fee || null,
				}),
			});
			toast.success("Course updated.");
			setEditingCourse(null);
			loadCourses(search);
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update course.",
			);
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleToggleActive(course: Course) {
		setTogglingUid(course.uid);
		try {
			await apiFetch<Course>(`/courses/${course.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ is_active: !course.is_active }),
			});
			loadCourses(search);
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update course.",
			);
		} finally {
			setTogglingUid(null);
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Course catalogue</CardTitle>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger render={<Button size="sm">Add course</Button>} />
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Add a course</DialogTitle>
						</DialogHeader>
						<form className="flex flex-col gap-4" onSubmit={handleCreate}>
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-2">
									<Label>Provider</Label>
									<Input
										required
										value={form.provider_name}
										onChange={(e) =>
											setForm({ ...form, provider_name: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Course name</Label>
									<Input
										required
										value={form.course_name}
										onChange={(e) =>
											setForm({ ...form, course_name: e.target.value })
										}
									/>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-4">
								<div className="flex flex-col gap-2">
									<Label>Campus</Label>
									<Input
										value={form.campus}
										onChange={(e) =>
											setForm({ ...form, campus: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Duration</Label>
									<Input
										value={form.duration}
										onChange={(e) =>
											setForm({ ...form, duration: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Category</Label>
									<Input
										placeholder="IT, Business..."
										value={form.category}
										onChange={(e) =>
											setForm({ ...form, category: e.target.value })
										}
									/>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Tuition fee (AUD)</Label>
								<Input
									type="number"
									step="0.01"
									value={form.tuition_fee}
									onChange={(e) =>
										setForm({ ...form, tuition_fee: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Academic requirements</Label>
								<Input
									value={form.academic_requirements}
									onChange={(e) =>
										setForm({ ...form, academic_requirements: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>English requirements</Label>
								<Input
									value={form.english_requirements}
									onChange={(e) =>
										setForm({ ...form, english_requirements: e.target.value })
									}
								/>
							</div>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={form.is_partner_provider}
									onChange={(e) =>
										setForm({ ...form, is_partner_provider: e.target.checked })
									}
								/>
								Partner provider (commission relationship)
							</label>
							<DialogFooter>
								<Button type="submit" disabled={creating}>
									{creating ? "Adding..." : "Add course"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				<Dialog
					open={editingCourse !== null}
					onOpenChange={(open) => !open && setEditingCourse(null)}
				>
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Edit course</DialogTitle>
						</DialogHeader>
						<form className="flex flex-col gap-4" onSubmit={handleSaveEdit}>
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-2">
									<Label>Provider</Label>
									<Input
										required
										value={editForm.provider_name}
										onChange={(e) =>
											setEditForm({
												...editForm,
												provider_name: e.target.value,
											})
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Course name</Label>
									<Input
										required
										value={editForm.course_name}
										onChange={(e) =>
											setEditForm({ ...editForm, course_name: e.target.value })
										}
									/>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-4">
								<div className="flex flex-col gap-2">
									<Label>Campus</Label>
									<Input
										value={editForm.campus}
										onChange={(e) =>
											setEditForm({ ...editForm, campus: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Duration</Label>
									<Input
										value={editForm.duration}
										onChange={(e) =>
											setEditForm({ ...editForm, duration: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Category</Label>
									<Input
										value={editForm.category}
										onChange={(e) =>
											setEditForm({ ...editForm, category: e.target.value })
										}
									/>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Tuition fee (AUD)</Label>
								<Input
									type="number"
									step="0.01"
									value={editForm.tuition_fee}
									onChange={(e) =>
										setEditForm({ ...editForm, tuition_fee: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Academic requirements</Label>
								<Input
									value={editForm.academic_requirements}
									onChange={(e) =>
										setEditForm({
											...editForm,
											academic_requirements: e.target.value,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>English requirements</Label>
								<Input
									value={editForm.english_requirements}
									onChange={(e) =>
										setEditForm({
											...editForm,
											english_requirements: e.target.value,
										})
									}
								/>
							</div>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={editForm.is_partner_provider}
									onChange={(e) =>
										setEditForm({
											...editForm,
											is_partner_provider: e.target.checked,
										})
									}
								/>
								Partner provider (commission relationship)
							</label>
							<DialogFooter>
								<Button type="submit" disabled={savingEdit}>
									{savingEdit ? "Saving..." : "Save changes"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form className="flex gap-2" onSubmit={handleSearch}>
					<Input
						placeholder="Search by course name"
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
							<TableHead>Course</TableHead>
							<TableHead>Provider</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Fee</TableHead>
							<TableHead>Flags</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{courses.map((course) => (
							<TableRow key={course.uid}>
								<TableCell>{course.course_name}</TableCell>
								<TableCell>{course.provider_name}</TableCell>
								<TableCell>{course.category || "—"}</TableCell>
								<TableCell>
									{course.tuition_fee ? `$${course.tuition_fee}` : "—"}
								</TableCell>
								<TableCell className="flex gap-1">
									{course.is_partner_provider && <Badge>Partner</Badge>}
									{!course.is_active && (
										<Badge variant="secondary">Inactive</Badge>
									)}
								</TableCell>
								<TableCell className="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => openEditDialog(course)}
									>
										Edit
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={togglingUid === course.uid}
										onClick={() => handleToggleActive(course)}
									>
										{course.is_active ? "Deactivate" : "Activate"}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
