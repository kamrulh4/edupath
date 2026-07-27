"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { DocumentFieldsDialog } from "@/components/document-fields-dialog";
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
import type {
	Case,
	Course,
	Document,
	DocumentType,
	Recommendation,
	Student,
	User,
} from "@/lib/types";

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

	const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
	const [courses, setCourses] = useState<Course[]>([]);
	const [recDialogOpen, setRecDialogOpen] = useState(false);
	const [creatingRec, setCreatingRec] = useState(false);
	const [approvingUid, setApprovingUid] = useState<string | null>(null);
	const [recForm, setRecForm] = useState({
		course: "",
		rank: "1",
		score: "",
		recommendation_notes: "",
		risk_notes: "",
	});

	async function loadDocuments() {
		const { results } = await apiFetch<Document[]>(
			`/documents/?case=${params.uid}`,
		);
		setDocuments(results);
	}

	async function loadRecommendations() {
		const { results } = await apiFetch<Recommendation[]>(
			`/recommendations/?case=${params.uid}`,
		);
		setRecommendations(results);
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
		loadRecommendations();
		apiFetch<Course[]>("/courses/?active=1").then(({ results }) =>
			setCourses(results),
		);
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

	function courseLabel(uid: string) {
		const course = courses.find((c) => c.uid === uid);
		return course ? `${course.course_name} — ${course.provider_name}` : uid;
	}

	async function handleCreateRecommendation(e: FormEvent) {
		e.preventDefault();
		if (!recForm.course || !caseData) {
			toast.error("Select a course.");
			return;
		}
		setCreatingRec(true);
		try {
			await apiFetch<Recommendation>("/recommendations/", {
				method: "POST",
				body: JSON.stringify({
					case: caseData.uid,
					course: recForm.course,
					rank: Number(recForm.rank),
					score: recForm.score || null,
					recommendation_notes: recForm.recommendation_notes,
					risk_notes: recForm.risk_notes,
				}),
			});
			toast.success("Recommendation added.");
			setRecForm({
				course: "",
				rank: "1",
				score: "",
				recommendation_notes: "",
				risk_notes: "",
			});
			setRecDialogOpen(false);
			loadRecommendations();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add recommendation.",
			);
		} finally {
			setCreatingRec(false);
		}
	}

	async function handleApproveRecommendation(rec: Recommendation) {
		setApprovingUid(rec.uid);
		try {
			await apiFetch<Recommendation>(`/recommendations/${rec.uid}/approve/`, {
				method: "POST",
			});
			toast.success("Recommendation approved.");
			loadRecommendations();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Could not approve.");
		} finally {
			setApprovingUid(null);
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
									<TableHead>Extracted data</TableHead>
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
										<TableCell>
											<DocumentFieldsDialog
												documentUid={doc.uid}
												documentLabel={DOCUMENT_TYPE_LABELS[doc.document_type]}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Recommendations</CardTitle>
					<Dialog open={recDialogOpen} onOpenChange={setRecDialogOpen}>
						<DialogTrigger
							render={<Button size="sm">Add recommendation</Button>}
						/>
						<DialogContent className="sm:max-w-lg">
							<DialogHeader>
								<DialogTitle>Recommend a course</DialogTitle>
							</DialogHeader>
							<form
								className="flex flex-col gap-4"
								onSubmit={handleCreateRecommendation}
							>
								<div className="flex flex-col gap-2">
									<Label>Course</Label>
									<Select
										value={recForm.course}
										onValueChange={(value) =>
											setRecForm({ ...recForm, course: value ?? "" })
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select a course">
												{(value: string | null) =>
													value ? courseLabel(value) : "Select a course"
												}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{courses.map((course) => (
												<SelectItem key={course.uid} value={course.uid}>
													{course.course_name} — {course.provider_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="flex flex-col gap-2">
										<Label>Rank</Label>
										<Input
											type="number"
											min="1"
											value={recForm.rank}
											onChange={(e) =>
												setRecForm({ ...recForm, rank: e.target.value })
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Score (0-100, optional)</Label>
										<Input
											type="number"
											step="0.01"
											value={recForm.score}
											onChange={(e) =>
												setRecForm({ ...recForm, score: e.target.value })
											}
										/>
									</div>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Recommendation notes</Label>
									<Input
										value={recForm.recommendation_notes}
										onChange={(e) =>
											setRecForm({
												...recForm,
												recommendation_notes: e.target.value,
											})
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Risk notes</Label>
									<Input
										value={recForm.risk_notes}
										onChange={(e) =>
											setRecForm({ ...recForm, risk_notes: e.target.value })
										}
									/>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={creatingRec}>
										{creatingRec ? "Adding..." : "Add recommendation"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent>
					{recommendations.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No recommendations yet.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Rank</TableHead>
									<TableHead>Course</TableHead>
									<TableHead>Score</TableHead>
									<TableHead>Notes</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recommendations.map((rec) => (
									<TableRow key={rec.uid}>
										<TableCell>#{rec.rank}</TableCell>
										<TableCell>{courseLabel(rec.course)}</TableCell>
										<TableCell>{rec.score ?? "—"}</TableCell>
										<TableCell className="max-w-xs truncate">
											{rec.recommendation_notes || "—"}
										</TableCell>
										<TableCell>
											{rec.is_approved ? (
												<Badge>Approved</Badge>
											) : (
												<Button
													size="sm"
													variant="outline"
													disabled={approvingUid === rec.uid}
													onClick={() => handleApproveRecommendation(rec)}
												>
													{approvingUid === rec.uid
														? "Approving..."
														: "Approve"}
												</Button>
											)}
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
