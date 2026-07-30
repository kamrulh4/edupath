"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import type { PortalRecommendation } from "@/lib/types";

export default function PortalRecommendationsPage() {
	const [recommendations, setRecommendations] = useState<
		PortalRecommendation[]
	>([]);

	useEffect(() => {
		apiFetch<PortalRecommendation[]>("/portal/recommendations/").then(
			({ results }) => setRecommendations(results),
		);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold">Your recommended courses</h1>
				<p className="text-muted-foreground">
					Courses your adviser has shortlisted and approved for you.
				</p>
			</div>

			{recommendations.length === 0 ? (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						No recommendations have been approved yet. Your adviser will share
						these once ready.
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{recommendations.map((rec) => (
						<Card key={rec.uid}>
							<CardHeader>
								<CardTitle className="text-base">
									#{rec.rank} · {rec.course.course_name}
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									{rec.course.provider_name}
									{rec.course.campus ? ` — ${rec.course.campus}` : ""}
								</p>
							</CardHeader>
							<CardContent className="flex flex-col gap-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Duration</span>
									<span>{rec.course.duration || "—"}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Tuition fee</span>
									<span>{rec.course.tuition_fee ?? "—"}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Intake dates</span>
									<span>{rec.course.intake_dates.join(", ") || "—"}</span>
								</div>
								{rec.recommendation_notes && (
									<p className="mt-2 rounded-lg bg-muted p-2 text-muted-foreground">
										{rec.recommendation_notes}
									</p>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
