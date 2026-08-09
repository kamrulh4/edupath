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
import type { FormTemplate } from "@/lib/types";

export default function TemplatesPage() {
	const [templates, setTemplates] = useState<FormTemplate[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState({ provider_name: "", form_name: "" });
	const [file, setFile] = useState<File | null>(null);

	async function loadTemplates() {
		const { results } = await apiFetch<FormTemplate[]>("/form-templates/");
		setTemplates(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadTemplates();
	}, []);

	async function handleCreate(e: FormEvent) {
		e.preventDefault();
		if (!file) {
			toast.error("Choose a template file first.");
			return;
		}
		setCreating(true);
		try {
			const formData = new FormData();
			formData.append("provider_name", form.provider_name);
			formData.append("form_name", form.form_name);
			formData.append("template_file", file);
			// DRF treats a missing boolean in multipart data as false, not the
			// model default - always send it explicitly.
			formData.append("is_active", "true");
			await apiFetch<FormTemplate>("/form-templates/", {
				method: "POST",
				body: formData,
			});
			toast.success("Template added.");
			setForm({ provider_name: "", form_name: "" });
			setFile(null);
			setDialogOpen(false);
			loadTemplates();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add template.",
			);
		} finally {
			setCreating(false);
		}
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Application form templates</CardTitle>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger render={<Button size="sm">Add template</Button>} />
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add a form template</DialogTitle>
						</DialogHeader>
						<form className="flex flex-col gap-4" onSubmit={handleCreate}>
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
								<Label>Form name</Label>
								<Input
									required
									value={form.form_name}
									onChange={(e) =>
										setForm({ ...form, form_name: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Template file</Label>
								<Input
									type="file"
									required
									onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								/>
							</div>
							<DialogFooter>
								<Button type="submit" disabled={creating}>
									{creating ? "Adding..." : "Add template"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Form</TableHead>
							<TableHead>Provider</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>File</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{templates.map((template) => (
							<TableRow key={template.uid}>
								<TableCell>{template.form_name}</TableCell>
								<TableCell>{template.provider_name}</TableCell>
								<TableCell>
									<Badge variant={template.is_active ? "default" : "secondary"}>
										{template.is_active ? "Active" : "Inactive"}
									</Badge>
								</TableCell>
								<TableCell>
									<a
										href={template.template_file}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										View
									</a>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
