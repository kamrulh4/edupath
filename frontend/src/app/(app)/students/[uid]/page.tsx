"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Case, Student } from "@/lib/types";

export default function StudentDetailPage() {
	const params = useParams<{ uid: string }>();
	const [student, setStudent] = useState<Student | null>(null);
	const [cases, setCases] = useState<Case[]>([]);
	const [saving, setSaving] = useState(false);
	const [inviting, setInviting] = useState(false);
	const [inviteLink, setInviteLink] = useState<string | null>(null);
	const [consentSaving, setConsentSaving] = useState<
		"ai_processing_consent" | "communication_consent" | null
	>(null);

	async function load() {
		const { results } = await apiFetch<Student>(`/students/${params.uid}/`);
		setStudent(results);
		const { results: theCases } = await apiFetch<Case[]>(
			`/cases/?student=${params.uid}`,
		);
		setCases(theCases);
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

	async function handlePhotoUpload(file: File) {
		if (!student) return;
		const formData = new FormData();
		formData.append("photo", file);
		try {
			const { results } = await apiFetch<Student>(`/students/${student.uid}/`, {
				method: "PATCH",
				body: formData,
			});
			setStudent(results);
			toast.success("Photo updated.");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update photo.",
			);
		}
	}

	async function handleConsentToggle(
		field: "ai_processing_consent" | "communication_consent",
	) {
		if (!student) return;
		setConsentSaving(field);
		try {
			const { results } = await apiFetch<Student>(`/students/${student.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ [field]: !student[field] }),
			});
			setStudent(results);
			toast.success("Consent updated.");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update consent.",
			);
		} finally {
			setConsentSaving(null);
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
				<div className="flex items-center gap-4">
					<AvatarUpload
						src={student.photo}
						fallbackText={student.first_name.charAt(0)}
						onUpload={handlePhotoUpload}
						size="lg"
					/>
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
					<CardTitle>Cases</CardTitle>
				</CardHeader>
				<CardContent>
					{cases.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No case started for this student yet.
						</p>
					) : (
						<div className="flex flex-col gap-2">
							{cases.map((c) => (
								<Link
									key={c.uid}
									href={`/cases/${c.uid}`}
									className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
								>
									<span className="text-sm">Case</span>
									<Badge variant="secondary">
										{c.stage.replaceAll("_", " ")}
									</Badge>
								</Link>
							))}
						</div>
					)}
				</CardContent>
			</Card>

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

			<Card>
				<CardHeader>
					<CardTitle>Consent</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium">AI processing consent</p>
							<p className="text-xs text-muted-foreground">
								Required before uploaded documents are sent to Gemini for field
								extraction.
								{student.ai_processing_consent_at &&
									` Granted ${new Date(student.ai_processing_consent_at).toLocaleString()}.`}
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Badge
								variant={
									student.ai_processing_consent ? "default" : "secondary"
								}
							>
								{student.ai_processing_consent ? "Granted" : "Not granted"}
							</Badge>
							<Button
								size="sm"
								variant="outline"
								disabled={consentSaving === "ai_processing_consent"}
								onClick={() => handleConsentToggle("ai_processing_consent")}
							>
								{student.ai_processing_consent ? "Revoke" : "Grant"}
							</Button>
						</div>
					</div>
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium">Communication consent</p>
							<p className="text-xs text-muted-foreground">
								Permission to contact the student about their application.
								{student.communication_consent_at &&
									` Granted ${new Date(student.communication_consent_at).toLocaleString()}.`}
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Badge
								variant={
									student.communication_consent ? "default" : "secondary"
								}
							>
								{student.communication_consent ? "Granted" : "Not granted"}
							</Badge>
							<Button
								size="sm"
								variant="outline"
								disabled={consentSaving === "communication_consent"}
								onClick={() => handleConsentToggle("communication_consent")}
							>
								{student.communication_consent ? "Revoke" : "Grant"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
