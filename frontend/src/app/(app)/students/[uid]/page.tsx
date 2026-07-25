"use client";

import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Student } from "@/lib/types";

export default function StudentDetailPage() {
	const params = useParams<{ uid: string }>();
	const [student, setStudent] = useState<Student | null>(null);
	const [saving, setSaving] = useState(false);
	const [inviting, setInviting] = useState(false);
	const [inviteLink, setInviteLink] = useState<string | null>(null);

	async function load() {
		const { results } = await apiFetch<Student>(`/students/${params.uid}/`);
		setStudent(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when the uid param changes
	useEffect(() => {
		load();
	}, [params.uid]);

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		if (!student) return;
		setSaving(true);
		try {
			const { results } = await apiFetch<Student>(`/students/${student.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({
					first_name: student.first_name,
					last_name: student.last_name,
					email: student.email,
					phone: student.phone,
					nationality: student.nationality,
					date_of_birth: student.date_of_birth,
					passport_number: student.passport_number,
					goals_and_preferences: student.goals_and_preferences,
				}),
			});
			setStudent(results);
			toast.success("Student updated.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Update failed.");
		} finally {
			setSaving(false);
		}
	}

	async function handleInvite() {
		if (!student) return;
		setInviting(true);
		try {
			const { results } = await apiFetch<{ uidb64: string; token: string }>(
				`/students/${student.uid}/invite/`,
				{ method: "POST" },
			);
			const link = `${window.location.origin}/set-password?uid=${results.uidb64}&token=${results.token}`;
			setInviteLink(link);
			toast.success("Invite created. Share the link below with the student.");
			load();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not invite student.",
			);
		} finally {
			setInviting(false);
		}
	}

	if (!student) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">
						{student.first_name} {student.last_name}
					</h1>
					<Badge
						variant={student.user ? "default" : "secondary"}
						className="mt-1"
					>
						{student.user ? "Portal access active" : "No portal access yet"}
					</Badge>
				</div>
				{!student.user && (
					<Button onClick={handleInvite} disabled={inviting}>
						{inviting ? "Inviting..." : "Invite to portal"}
					</Button>
				)}
			</div>

			{inviteLink && (
				<Card>
					<CardContent className="flex flex-col gap-2 pt-6">
						<p className="text-sm text-muted-foreground">
							No email service is configured yet - copy this link and send it to
							the student manually. It lets them set their own password.
						</p>
						<Input
							readOnly
							value={inviteLink}
							onFocus={(e) => e.target.select()}
						/>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="flex flex-col gap-4" onSubmit={handleSave}>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label>First name</Label>
								<Input
									value={student.first_name}
									onChange={(e) =>
										setStudent({ ...student, first_name: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Last name</Label>
								<Input
									value={student.last_name}
									onChange={(e) =>
										setStudent({ ...student, last_name: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label>Email</Label>
								<Input
									type="email"
									value={student.email}
									onChange={(e) =>
										setStudent({ ...student, email: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Phone</Label>
								<Input
									value={student.phone}
									onChange={(e) =>
										setStudent({ ...student, phone: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label>Nationality</Label>
								<Input
									value={student.nationality}
									onChange={(e) =>
										setStudent({ ...student, nationality: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Passport number</Label>
								<Input
									value={student.passport_number}
									onChange={(e) =>
										setStudent({ ...student, passport_number: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Date of birth</Label>
							<Input
								type="date"
								value={student.date_of_birth ?? ""}
								onChange={(e) =>
									setStudent({ ...student, date_of_birth: e.target.value })
								}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Goals and preferences</Label>
							<Input
								value={student.goals_and_preferences}
								onChange={(e) =>
									setStudent({
										...student,
										goals_and_preferences: e.target.value,
									})
								}
							/>
						</div>
						<Button type="submit" disabled={saving} className="w-fit">
							{saving ? "Saving..." : "Save changes"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
