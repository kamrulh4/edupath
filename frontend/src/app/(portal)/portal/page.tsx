"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Case, CaseStage, Student } from "@/lib/types";

const STAGES: CaseStage[] = [
	"ENQUIRY",
	"DOCUMENTS_PENDING",
	"SHORTLISTED",
	"PREPARED",
	"SUBMITTED",
	"ENROLLED",
];

const STAGE_LABELS: Record<CaseStage, string> = {
	ENQUIRY: "Enquiry",
	DOCUMENTS_PENDING: "Documents Pending",
	SHORTLISTED: "Shortlisted",
	PREPARED: "Prepared",
	SUBMITTED: "Submitted",
	ENROLLED: "Enrolled",
};

export default function PortalOverviewPage() {
	const [profile, setProfile] = useState<Student | null>(null);
	const [cases, setCases] = useState<Case[]>([]);
	const [consentSaving, setConsentSaving] = useState<
		"ai_processing_consent" | "communication_consent" | null
	>(null);

	useEffect(() => {
		apiFetch<Student>("/portal/profile/").then(({ results }) =>
			setProfile(results),
		);
		apiFetch<Case[]>("/portal/cases/").then(({ results }) => setCases(results));
	}, []);

	async function handleConsentToggle(
		field: "ai_processing_consent" | "communication_consent",
	) {
		if (!profile) return;
		setConsentSaving(field);
		try {
			const { results } = await apiFetch<Student>("/portal/consent/", {
				method: "PATCH",
				body: JSON.stringify({ [field]: !profile[field] }),
			});
			// Functional form, not {...profile, ...results}: /portal/consent/
			// only returns the 4 consent fields, and merging against the
			// closure-captured `profile` can lose a concurrent update if both
			// toggles are clicked before the first request resolves.
			setProfile((prev) => (prev ? { ...prev, ...results } : prev));
			toast.success("Consent updated.");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update consent.",
			);
		} finally {
			setConsentSaving(null);
		}
	}

	if (!profile) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold">
					Welcome, {profile.first_name}
				</h1>
				<p className="text-muted-foreground">
					Track your application progress here.
				</p>
			</div>

			{cases.length === 0 ? (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						No case has been opened for you yet. Please contact your adviser.
					</CardContent>
				</Card>
			) : (
				cases.map((caseItem) => {
					const currentIndex = STAGES.indexOf(caseItem.stage);
					return (
						<Card key={caseItem.uid}>
							<CardHeader>
								<CardTitle>Your application progress</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-2">
									{STAGES.map((stage, index) => (
										<Badge
											key={stage}
											variant={index <= currentIndex ? "default" : "secondary"}
										>
											{STAGE_LABELS[stage]}
										</Badge>
									))}
								</div>
							</CardContent>
						</Card>
					);
				})
			)}

			<Card>
				<CardHeader>
					<CardTitle>Your profile</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
					<div>
						<p className="text-muted-foreground">Email</p>
						<p>{profile.email || "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Phone</p>
						<p>{profile.phone || "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Nationality</p>
						<p>{profile.nationality || "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Passport number</p>
						<p>{profile.passport_number || "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Date of birth</p>
						<p>{profile.date_of_birth || "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Goals & preferences</p>
						<p>{profile.goals_and_preferences || "—"}</p>
					</div>
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
								Allow your uploaded documents to be read by AI to speed up your
								application. Your adviser still reviews everything.
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Badge
								variant={
									profile.ai_processing_consent ? "default" : "secondary"
								}
							>
								{profile.ai_processing_consent ? "Granted" : "Not granted"}
							</Badge>
							<Button
								size="sm"
								variant="outline"
								disabled={consentSaving === "ai_processing_consent"}
								onClick={() => handleConsentToggle("ai_processing_consent")}
							>
								{profile.ai_processing_consent ? "Revoke" : "Grant"}
							</Button>
						</div>
					</div>
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium">Communication consent</p>
							<p className="text-xs text-muted-foreground">
								Allow your consultancy to contact you about your application.
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Badge
								variant={
									profile.communication_consent ? "default" : "secondary"
								}
							>
								{profile.communication_consent ? "Granted" : "Not granted"}
							</Badge>
							<Button
								size="sm"
								variant="outline"
								disabled={consentSaving === "communication_consent"}
								onClick={() => handleConsentToggle("communication_consent")}
							>
								{profile.communication_consent ? "Revoke" : "Grant"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
