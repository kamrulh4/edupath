"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiFetch } from "@/lib/api-client";
import type { AuditLog, User } from "@/lib/types";

const ACTION_TYPES = [
	"APPLICATION_DRAFT_APPROVED",
	"APPLICATION_DRAFT_GENERATED",
	"APPLICATION_PACK_DOWNLOADED",
	"CASE_DELETED",
	"CHECKLIST_APPLIED",
	"DOCUMENT_DOWNLOADED",
	"DOCUMENT_UPLOAD",
	"FIELD_VERIFIED",
	"RECOMMENDATIONS_GENERATED",
	"RECOMMENDATION_APPROVED",
	"STUDENT_CONSENT_UPDATED",
	"STUDENT_INVITED",
];

function actionLabel(actionType: string) {
	return actionType
		.split("_")
		.map((w) => w.charAt(0) + w.slice(1).toLowerCase())
		.join(" ");
}

export default function AuditLogPage() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [members, setMembers] = useState<User[]>([]);
	const [actionFilter, setActionFilter] = useState("ALL");
	const [loading, setLoading] = useState(true);

	async function loadLogs(actionType: string) {
		setLoading(true);
		const suffix =
			actionType !== "ALL"
				? `?action_type=${encodeURIComponent(actionType)}`
				: "";
		const { results } = await apiFetch<AuditLog[]>(`/audit-logs/${suffix}`);
		setLogs(results);
		setLoading(false);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadLogs("ALL");
		apiFetch<User[]>("/organisation/members/").then(({ results }) =>
			setMembers(results),
		);
	}, []);

	function actorLabel(actorId: number | null) {
		if (!actorId) return "System";
		const member = members.find((m) => m.id === actorId);
		return member ? `${member.first_name} ${member.last_name}` : `#${actorId}`;
	}

	async function handleFilterChange(value: string | null) {
		const next = value ?? "ALL";
		setActionFilter(next);
		loadLogs(next);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Audit log</CardTitle>
				<p className="text-sm text-muted-foreground">
					Every sensitive action taken in your organisation - uploads,
					approvals, downloads and deletions. Most recent 40 entries.
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Select value={actionFilter} onValueChange={handleFilterChange}>
					<SelectTrigger className="w-64">
						<SelectValue>
							{(value: string | null) =>
								value === "ALL" || !value ? "All actions" : actionLabel(value)
							}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All actions</SelectItem>
						{ACTION_TYPES.map((action) => (
							<SelectItem key={action} value={action}>
								{actionLabel(action)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{loading ? (
					<p className="text-sm text-muted-foreground">Loading...</p>
				) : logs.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No matching audit entries yet.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>When</TableHead>
								<TableHead>Who</TableHead>
								<TableHead>Action</TableHead>
								<TableHead>Target</TableHead>
								<TableHead>IP address</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{logs.map((log) => (
								<TableRow key={log.uid}>
									<TableCell className="whitespace-nowrap text-sm">
										{new Date(log.created_at).toLocaleString()}
									</TableCell>
									<TableCell>{actorLabel(log.actor)}</TableCell>
									<TableCell>
										<Badge variant="secondary">
											{actionLabel(log.action_type)}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{log.target_model}
										{log.target_uid && (
											<span className="block font-mono text-xs">
												{log.target_uid}
											</span>
										)}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{log.ip_address ?? "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
