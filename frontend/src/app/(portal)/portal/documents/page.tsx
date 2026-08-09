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
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Case, Document, DocumentType } from "@/lib/types";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
	PASSPORT: "Passport",
	TRANSCRIPT: "Transcript",
	O_LEVEL: "O Level",
	A_LEVEL: "A Level",
	ENGLISH_RESULT: "English Result",
	POLICE_CLEARANCE: "Police Clearance",
	FINANCIAL: "Financial",
	OTHER: "Other / Not sure - let AI detect",
};

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

function isZipFile(f: File) {
	return f.name.toLowerCase().endsWith(".zip");
}

export default function PortalDocumentsPage() {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [cases, setCases] = useState<Case[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [documentType, setDocumentType] = useState<DocumentType>("OTHER");
	const [files, setFiles] = useState<File[]>([]);

	async function loadDocuments() {
		const { results } = await apiFetch<Document[]>("/portal/documents/");
		setDocuments(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadDocuments();
		apiFetch<Case[]>("/portal/cases/").then(({ results }) => setCases(results));
	}, []);

	async function handleUpload(e: FormEvent) {
		e.preventDefault();
		const activeCase = cases[0];
		if (files.length === 0 || !activeCase) {
			toast.error("Choose at least one file.");
			return;
		}
		setUploading(true);
		try {
			if (files.length === 1 && !isZipFile(files[0])) {
				const formData = new FormData();
				formData.append("case", activeCase.uid);
				formData.append("document_type", documentType);
				formData.append("original_file", files[0]);
				await apiFetch<Document>("/portal/documents/", {
					method: "POST",
					body: formData,
				});
				toast.success("Document uploaded.");
			} else {
				const formData = new FormData();
				formData.append("case", activeCase.uid);
				if (files.length === 1 && isZipFile(files[0])) {
					formData.append("zip_file", files[0]);
				} else {
					for (const f of files) formData.append("files", f);
				}
				const { results } = await apiFetch<{
					created_count: number;
					errors: { filename: string; error: string }[];
				}>("/portal/documents/bulk/", { method: "POST", body: formData });
				if (results.errors.length > 0) {
					toast.error(
						`${results.created_count} uploaded, ${results.errors.length} failed.`,
					);
				} else {
					toast.success(`${results.created_count} document(s) uploaded.`);
				}
			}
			setFiles([]);
			setDialogOpen(false);
			loadDocuments();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Upload failed.");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Your documents</h1>
					<p className="text-muted-foreground">
						Upload documents your adviser has requested.
					</p>
				</div>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger
						render={
							<Button size="sm" disabled={cases.length === 0}>
								Upload documents
							</Button>
						}
					/>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Upload documents</DialogTitle>
						</DialogHeader>
						<form className="flex flex-col gap-4" onSubmit={handleUpload}>
							<div className="flex flex-col gap-2">
								<Label>File(s)</Label>
								<Input
									type="file"
									required
									multiple
									accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.zip"
									onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
								/>
								<p className="text-xs text-muted-foreground">
									Select multiple files or a .zip to upload several documents at
									once — AI will classify each one automatically.
								</p>
							</div>
							{files.length <= 1 && !(files[0] && isZipFile(files[0])) && (
								<div className="flex flex-col gap-2">
									<Label>Document type</Label>
									<Select
										value={documentType}
										onValueChange={(value) =>
											setDocumentType((value as DocumentType) ?? "OTHER")
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue>
												{(value: DocumentType | null) =>
													value ? DOCUMENT_TYPE_LABELS[value] : "Select a type"
												}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{DOCUMENT_TYPES.map((type) => (
												<SelectItem key={type} value={type}>
													{DOCUMENT_TYPE_LABELS[type]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
							<DialogFooter>
								<Button type="submit" disabled={uploading}>
									{uploading ? "Uploading..." : "Upload"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Checklist</CardTitle>
				</CardHeader>
				<CardContent>
					{documents.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No documents uploaded yet.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>File</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{documents.map((doc) => (
									<TableRow key={doc.uid}>
										<TableCell>
											{DOCUMENT_TYPE_LABELS[doc.document_type]}
										</TableCell>
										<TableCell>{doc.document_category}</TableCell>
										<TableCell>
											<Badge variant="secondary">{doc.doc_status}</Badge>
										</TableCell>
										<TableCell>
											<a
												href={doc.renamed_file ?? doc.original_file}
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
					)}
				</CardContent>
			</Card>
		</div>
	);
}
