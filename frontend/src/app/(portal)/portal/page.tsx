"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
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

	useEffect(() => {
		apiFetch<Student>("/portal/profile/").then(({ results }) =>
			setProfile(results),
		);
		apiFetch<Case[]>("/portal/cases/").then(({ results }) => setCases(results));
	}, []);

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
		</div>
	);
}
