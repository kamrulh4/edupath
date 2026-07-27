"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { ConfidenceLevel, ExtractedField } from "@/lib/types";

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["HIGH", "MEDIUM", "LOW"];

function confidenceBadgeVariant(level: ConfidenceLevel) {
	if (level === "HIGH") return "default" as const;
	if (level === "MEDIUM") return "secondary" as const;
	return "destructive" as const;
}

export function DocumentFieldsDialog({
	documentUid,
	documentLabel,
}: {
	documentUid: string;
	documentLabel: string;
}) {
	const [open, setOpen] = useState(false);
	const [fields, setFields] = useState<ExtractedField[]>([]);
	const [loading, setLoading] = useState(false);
	const [adding, setAdding] = useState(false);
	const [editValues, setEditValues] = useState<Record<string, string>>({});
	const [verifyingUid, setVerifyingUid] = useState<string | null>(null);
	const [form, setForm] = useState({
		field_name: "",
		extracted_value: "",
		confidence_level: "MEDIUM" as ConfidenceLevel,
	});

	async function loadFields() {
		setLoading(true);
		try {
			const { results } = await apiFetch<ExtractedField[]>(
				`/extracted-fields/?document=${documentUid}`,
			);
			setFields(results);
			setEditValues(
				Object.fromEntries(results.map((f) => [f.uid, f.extracted_value])),
			);
		} finally {
			setLoading(false);
		}
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen) loadFields();
	}

	async function handleAdd(e: FormEvent) {
		e.preventDefault();
		setAdding(true);
		try {
			await apiFetch<ExtractedField>("/extracted-fields/", {
				method: "POST",
				body: JSON.stringify({ ...form, document: documentUid }),
			});
			toast.success("Field added.");
			setForm({
				field_name: "",
				extracted_value: "",
				confidence_level: "MEDIUM",
			});
			loadFields();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add field.",
			);
		} finally {
			setAdding(false);
		}
	}

	async function handleVerify(field: ExtractedField) {
		setVerifyingUid(field.uid);
		try {
			await apiFetch<ExtractedField>(`/extracted-fields/${field.uid}/verify/`, {
				method: "POST",
				body: JSON.stringify({ extracted_value: editValues[field.uid] }),
			});
			toast.success(`${field.field_name} verified.`);
			loadFields();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not verify field.",
			);
		} finally {
			setVerifyingUid(null);
		}
	}

	const unverifiedCount = fields.filter((f) => !f.is_verified).length;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					<Button variant="outline" size="sm">
						Fields{unverifiedCount > 0 ? ` (${unverifiedCount} to review)` : ""}
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Extracted fields — {documentLabel}</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					{loading && (
						<p className="text-sm text-muted-foreground">Loading...</p>
					)}
					{!loading && fields.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No fields extracted yet.
						</p>
					)}
					{fields.map((field) => (
						<div
							key={field.uid}
							className="flex flex-col gap-2 rounded-lg border p-3"
						>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">{field.field_name}</span>
								<div className="flex items-center gap-2">
									<Badge
										variant={confidenceBadgeVariant(field.confidence_level)}
									>
										{field.confidence_level}
									</Badge>
									{field.is_verified && (
										<Badge variant="default">Verified</Badge>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Input
									value={editValues[field.uid] ?? ""}
									onChange={(e) =>
										setEditValues({
											...editValues,
											[field.uid]: e.target.value,
										})
									}
									disabled={field.is_verified}
								/>
								{!field.is_verified && (
									<Button
										size="sm"
										disabled={verifyingUid === field.uid}
										onClick={() => handleVerify(field)}
									>
										{verifyingUid === field.uid ? "Verifying..." : "Verify"}
									</Button>
								)}
							</div>
						</div>
					))}
				</div>

				<form
					className="flex flex-col gap-3 border-t pt-4"
					onSubmit={handleAdd}
				>
					<Label className="text-sm">Add a field</Label>
					<div className="grid grid-cols-2 gap-2">
						<Input
							placeholder="Field name (e.g. date_of_birth)"
							required
							value={form.field_name}
							onChange={(e) => setForm({ ...form, field_name: e.target.value })}
						/>
						<Input
							placeholder="Value"
							required
							value={form.extracted_value}
							onChange={(e) =>
								setForm({ ...form, extracted_value: e.target.value })
							}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={form.confidence_level}
							onValueChange={(value) =>
								setForm({
									...form,
									confidence_level: (value as ConfidenceLevel) ?? "MEDIUM",
								})
							}
						>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONFIDENCE_LEVELS.map((level) => (
									<SelectItem key={level} value={level}>
										{level}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button type="submit" size="sm" disabled={adding}>
							{adding ? "Adding..." : "Add field"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
