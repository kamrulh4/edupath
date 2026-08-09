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
import type {
	FormTemplate,
	TaskChecklistItem,
	TaskChecklistTemplate,
} from "@/lib/types";

const EMPTY_ITEM: TaskChecklistItem = {
	title: "",
	description: "",
	days_offset: null,
};

export default function TemplatesPage() {
	const [templates, setTemplates] = useState<FormTemplate[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState({ provider_name: "", form_name: "" });
	const [file, setFile] = useState<File | null>(null);

	const [checklists, setChecklists] = useState<TaskChecklistTemplate[]>([]);
	const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
	const [creatingChecklist, setCreatingChecklist] = useState(false);
	const [checklistName, setChecklistName] = useState("");
	const [checklistItems, setChecklistItems] = useState<TaskChecklistItem[]>([
		{ ...EMPTY_ITEM },
	]);

	async function loadTemplates() {
		const { results } = await apiFetch<FormTemplate[]>("/form-templates/");
		setTemplates(results);
	}

	async function loadChecklists() {
		const { results } = await apiFetch<TaskChecklistTemplate[]>(
			"/task-checklist-templates/",
		);
		setChecklists(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadTemplates();
		loadChecklists();
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

	function updateChecklistItem(
		index: number,
		patch: Partial<TaskChecklistItem>,
	) {
		setChecklistItems((items) =>
			items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
		);
	}

	function addChecklistItem() {
		setChecklistItems((items) => [...items, { ...EMPTY_ITEM }]);
	}

	function removeChecklistItem(index: number) {
		setChecklistItems((items) => items.filter((_, i) => i !== index));
	}

	async function handleCreateChecklist(e: FormEvent) {
		e.preventDefault();
		const items = checklistItems.filter((item) => item.title.trim());
		if (!checklistName.trim() || items.length === 0) {
			toast.error("Add a name and at least one item.");
			return;
		}
		setCreatingChecklist(true);
		try {
			await apiFetch<TaskChecklistTemplate>("/task-checklist-templates/", {
				method: "POST",
				body: JSON.stringify({ name: checklistName, items, is_active: true }),
			});
			toast.success("Checklist template added.");
			setChecklistName("");
			setChecklistItems([{ ...EMPTY_ITEM }]);
			setChecklistDialogOpen(false);
			loadChecklists();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add checklist.",
			);
		} finally {
			setCreatingChecklist(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
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
										<Badge
											variant={template.is_active ? "default" : "secondary"}
										>
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

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Task checklist templates</CardTitle>
					<Dialog
						open={checklistDialogOpen}
						onOpenChange={setChecklistDialogOpen}
					>
						<DialogTrigger render={<Button size="sm">Add checklist</Button>} />
						<DialogContent className="sm:max-w-lg">
							<DialogHeader>
								<DialogTitle>Add a task checklist template</DialogTitle>
							</DialogHeader>
							<form
								className="flex flex-col gap-4"
								onSubmit={handleCreateChecklist}
							>
								<div className="flex flex-col gap-2">
									<Label>Name</Label>
									<Input
										required
										placeholder="e.g. UK Undergraduate Checklist"
										value={checklistName}
										onChange={(e) => setChecklistName(e.target.value)}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Items</Label>
									{checklistItems.map((item, index) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: list only grows/shrinks via explicit add/remove
											key={index}
											className="flex flex-col gap-2 rounded-lg border p-2"
										>
											<div className="flex gap-2">
												<Input
													placeholder="Task title"
													value={item.title}
													onChange={(e) =>
														updateChecklistItem(index, {
															title: e.target.value,
														})
													}
												/>
												<Input
													type="number"
													className="w-28"
													placeholder="Due in days"
													value={item.days_offset ?? ""}
													onChange={(e) =>
														updateChecklistItem(index, {
															days_offset: e.target.value
																? Number(e.target.value)
																: null,
														})
													}
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeChecklistItem(index)}
												>
													Remove
												</Button>
											</div>
											<Input
												placeholder="Description (optional)"
												value={item.description}
												onChange={(e) =>
													updateChecklistItem(index, {
														description: e.target.value,
													})
												}
											/>
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={addChecklistItem}
									>
										Add item
									</Button>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={creatingChecklist}>
										{creatingChecklist ? "Adding..." : "Add checklist"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent>
					{checklists.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No checklist templates yet.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Items</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{checklists.map((checklist) => (
									<TableRow key={checklist.uid}>
										<TableCell>{checklist.name}</TableCell>
										<TableCell>{checklist.items.length}</TableCell>
										<TableCell>
											<Badge
												variant={checklist.is_active ? "default" : "secondary"}
											>
												{checklist.is_active ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
