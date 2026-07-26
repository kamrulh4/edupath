"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import type { Case, Document, DocumentType, Student, User } from "@/lib/types";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
	PASSPORT: "Passport",
	TRANSCRIPT: "Transcript",
	O_LEVEL: "O Level",
	A_LEVEL: "A Level",
	ENGLISH_RESULT: "English Result",
	POLICE_CLEARANCE: "Police Clearance",
	FINANCIAL: "Financial",
	OTHER: "Other",
};

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export default function CaseDetailPage() {
	const params = useParams<{ uid: string }>();
	const [caseData, setCaseData] = useState<Case | null>(null);
	const [student, setStudent] = useState<Student | null>(null);
	const [adviser, setAdviser] = useState<User | null>(null);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [documentType, setDocumentType] = useState<DocumentType>("OTHER");
	const [file, setFile] = useState<File | null>(null);

	async function loadDocuments() {
		const { results } = await apiFetch<Document[]>(
			`/documents/?case=${params.uid}`,
		);
		setDocuments(results);
	}

	async function load() {
		const { results: theCase } = await apiFetch<Case>(`/cases/${params.uid}/`);
		setCaseData(theCase);

		const { results: theStudent } = await apiFetch<Student>(
			`/students/${theCase.student}/`,
		);
		setStudent(theStudent);

		if (theCase.adviser) {
			const { results: members } = await apiFetch<User[]>(
				"/organisation/members/",
			);
			setAdviser(members.find((m) => m.uid === theCase.adviser) ?? null);
		}

		loadDocuments();
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when the uid param changes
	useEffect(() => {
		load();
	}, [params.uid]);

	async function handleUpload(e: FormEvent) {
		e.preventDefault();
		if (!file || !caseData) {
			toast.error("Choose a file first.");
			return;
		}
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("case", caseData.uid);
			formData.append("document_type", documentType);
			formData.append("original_file", file);
			await apiFetch<Document>("/documents/", {
				method: "POST",
				body: formData,
			});
			toast.success("Document uploaded.");
			setFile(null);
			setDialogOpen(false);
			loadDocuments();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Upload failed.");
		} finally {
			setUploading(false);
		}
	}

	if (!caseData || !student) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold">
					Case for{" "}
					<Link href={`/students/${student.uid}`} className="hover:underline">
						{student.first_name} {student.last_name}
					</Link>
				</h1>
				<div className="mt-1 flex items-center gap-2">
					<Badge variant="secondary">
						{caseData.stage.replaceAll("_", " ")}
					</Badge>
					<span className="text-sm text-muted-foreground">
						Adviser:{" "}
						{adviser
							? `${adviser.first_name} ${adviser.last_name}`
							: "Unassigned"}
					</span>
				</div>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Documents</CardTitle>
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger
							render={<Button size="sm">Upload document</Button>}
						/>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Upload a document</DialogTitle>
							</DialogHeader>
							<form className="flex flex-col gap-4" onSubmit={handleUpload}>
								<div className="flex flex-col gap-2">
									<Label>Document type</Label>
									<Select
										value={documentType}
										onValueChange={(value) =>
											setDocumentType((value as DocumentType) ?? "OTHER")
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
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
								<div className="flex flex-col gap-2">
									<Label>File</Label>
									<input
										type="file"
										required
										onChange={(e) => setFile(e.target.files?.[0] ?? null)}
										className="text-sm"
									/>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={uploading}>
										{uploading ? "Uploading..." : "Upload"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
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
									<TableHead>Flags</TableHead>
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
											{doc.is_duplicate && (
												<Badge variant="destructive">Duplicate</Badge>
											)}
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
