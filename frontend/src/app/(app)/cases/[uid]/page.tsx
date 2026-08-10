"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { ApiError, apiFetch, downloadFile } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
	ApplicationDraft,
	Case,
	CaseStage,
	Communication,
	Course,
	Document,
	DocumentStatus,
	DocumentType,
	FormTemplate,
	Meeting,
	MeetingStatus,
	Recommendation,
	Student,
	Task,
	TaskChecklistTemplate,
	TaskStatus,
	User,
} from "@/lib/types";

const STAGE_LABELS: Record<CaseStage, string> = {
	ENQUIRY: "Enquiry",
	DOCUMENTS_PENDING: "Documents Pending",
	SHORTLISTED: "Shortlisted",
	PREPARED: "Prepared",
	SUBMITTED: "Submitted",
	ENROLLED: "Enrolled",
};

const STAGES = Object.keys(STAGE_LABELS) as CaseStage[];

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
	PENDING: "Pending",
	SUBMITTED: "Submitted",
	APPROVED: "Approved",
	REJECTED: "Rejected",
};

const DOCUMENT_STATUSES = Object.keys(
	DOCUMENT_STATUS_LABELS,
) as DocumentStatus[];

const STAFF_KINDS = new Set(["ADMIN", "ADVISER", "ADMISSION_OFFICER"]);

const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
	SCHEDULED: "Scheduled",
	COMPLETED: "Completed",
	CANCELLED: "Cancelled",
};

const MEETING_STATUSES = Object.keys(MEETING_STATUS_LABELS) as MeetingStatus[];

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	PENDING: "Pending",
	IN_PROGRESS: "In Progress",
	WAITING_FOR_STUDENT: "Waiting for Student",
	COMPLETED: "Completed",
	OVERDUE: "Overdue",
};

const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

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

const QUALITY_FLAG_LABELS: Record<string, string> = {
	AI_UNSUPPORTED_FILE_TYPE: "Unsupported file",
	AI_EXTRACTION_FAILED: "AI extraction failed",
	DATE_OF_BIRTH_MISMATCH: "DOB mismatch",
	PASSPORT_NUMBER_MISMATCH: "Passport # mismatch",
	NATIONALITY_MISMATCH: "Nationality mismatch",
	NAME_MISMATCH: "Name mismatch",
	AI_QUALITY_BLURRY: "Blurry",
	AI_QUALITY_PARTIALLY_UNREADABLE: "Partially unreadable",
	AI_QUALITY_INCOMPLETE_OR_CUT_OFF: "Incomplete / cut off",
	AI_QUALITY_LOW_RESOLUTION: "Low resolution",
	AI_PROCESSING_NOT_CONSENTED: "AI consent not granted",
};

function qualityFlagLabel(flag: string) {
	return QUALITY_FLAG_LABELS[flag] ?? flag.replaceAll("_", " ").toLowerCase();
}

export default function CaseDetailPage() {
	const params = useParams<{ uid: string }>();
	const router = useRouter();
	const { user } = useAuth();
	const isAdmin = user?.kind === "ADMIN";
	const [caseData, setCaseData] = useState<Case | null>(null);
	const [student, setStudent] = useState<Student | null>(null);
	const [adviser, setAdviser] = useState<User | null>(null);
	const [members, setMembers] = useState<User[]>([]);
	const [updatingStage, setUpdatingStage] = useState(false);
	const [updatingAdviser, setUpdatingAdviser] = useState(false);
	const [downloadingPack, setDownloadingPack] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingCase, setDeletingCase] = useState(false);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [documentType, setDocumentType] = useState<DocumentType>("OTHER");
	const [files, setFiles] = useState<File[]>([]);
	const [updatingDocUid, setUpdatingDocUid] = useState<string | null>(null);

	const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
	const [courses, setCourses] = useState<Course[]>([]);
	const [recDialogOpen, setRecDialogOpen] = useState(false);
	const [creatingRec, setCreatingRec] = useState(false);
	const [approvingUid, setApprovingUid] = useState<string | null>(null);
	const [generatingRecs, setGeneratingRecs] = useState(false);
	const [editingRec, setEditingRec] = useState<Recommendation | null>(null);
	const [savingRecEdit, setSavingRecEdit] = useState(false);
	const [recEditForm, setRecEditForm] = useState({
		rank: "1",
		score: "",
		adviser_override_reason: "",
	});
	const [recForm, setRecForm] = useState({
		course: "",
		rank: "1",
		score: "",
		recommendation_notes: "",
		risk_notes: "",
	});

	const [tasks, setTasks] = useState<Task[]>([]);
	const [taskDialogOpen, setTaskDialogOpen] = useState(false);
	const [creatingTask, setCreatingTask] = useState(false);
	const [updatingTaskUid, setUpdatingTaskUid] = useState<string | null>(null);
	const [taskForm, setTaskForm] = useState({
		title: "",
		description: "",
		due_date: "",
		assignee: "",
	});
	const [checklists, setChecklists] = useState<TaskChecklistTemplate[]>([]);
	const [selectedChecklist, setSelectedChecklist] = useState("");
	const [applyingChecklist, setApplyingChecklist] = useState(false);

	const [drafts, setDrafts] = useState<ApplicationDraft[]>([]);
	const [templates, setTemplates] = useState<FormTemplate[]>([]);
	const [draftDialogOpen, setDraftDialogOpen] = useState(false);
	const [creatingDraft, setCreatingDraft] = useState(false);
	const [generatingDraft, setGeneratingDraft] = useState(false);
	const [approvingDraftUid, setApprovingDraftUid] = useState<string | null>(
		null,
	);
	const [draftTemplate, setDraftTemplate] = useState("");
	const [draftFile, setDraftFile] = useState<File | null>(null);
	const [draftNotes, setDraftNotes] = useState("");

	const [meetings, setMeetings] = useState<Meeting[]>([]);
	const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
	const [creatingMeeting, setCreatingMeeting] = useState(false);
	const [updatingMeetingUid, setUpdatingMeetingUid] = useState<string | null>(
		null,
	);
	const [meetingForm, setMeetingForm] = useState({
		scheduled_time: "",
		meet_link: "",
	});

	const [messages, setMessages] = useState<Communication[]>([]);
	const [sendingMessage, setSendingMessage] = useState(false);
	const [messageBody, setMessageBody] = useState("");

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

	async function loadTasks() {
		const { results } = await apiFetch<Task[]>(`/tasks/?case=${params.uid}`);
		setTasks(results);
	}

	async function loadChecklists() {
		const { results } = await apiFetch<TaskChecklistTemplate[]>(
			"/task-checklist-templates/?is_active=true",
		);
		setChecklists(results);
	}

	async function loadDrafts() {
		const { results } = await apiFetch<ApplicationDraft[]>(
			`/application-drafts/?case=${params.uid}`,
		);
		setDrafts(results);
	}

	async function loadMeetings() {
		const { results } = await apiFetch<Meeting[]>(
			`/meetings/?case=${params.uid}`,
		);
		setMeetings(results);
	}

	async function loadMessages() {
		const { results } = await apiFetch<Communication[]>(
			`/communications/?case=${params.uid}`,
		);
		setMessages(results);
	}

	async function load() {
		const { results: theCase } = await apiFetch<Case>(`/cases/${params.uid}/`);
		setCaseData(theCase);

		const { results: theStudent } = await apiFetch<Student>(
			`/students/${theCase.student}/`,
		);
		setStudent(theStudent);

		const { results: orgMembers } = await apiFetch<User[]>(
			"/organisation/members/",
		);
		setMembers(orgMembers);
		setAdviser(
			theCase.adviser
				? (orgMembers.find((m) => m.uid === theCase.adviser) ?? null)
				: null,
		);

		loadDocuments();
		loadRecommendations();
		loadTasks();
		loadChecklists();
		loadDrafts();
		loadMeetings();
		loadMessages();
		apiFetch<Course[]>("/courses/?active=1").then(({ results }) =>
			setCourses(results),
		);
		apiFetch<FormTemplate[]>("/form-templates/?active=1").then(({ results }) =>
			setTemplates(results),
		);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when the uid param changes
	useEffect(() => {
		load();
	}, [params.uid]);

	function isZipFile(f: File) {
		return f.name.toLowerCase().endsWith(".zip");
	}

	async function handleUpload(e: FormEvent) {
		e.preventDefault();
		if (files.length === 0 || !caseData) {
			toast.error("Choose at least one file.");
			return;
		}
		setUploading(true);
		try {
			if (files.length === 1 && !isZipFile(files[0])) {
				const formData = new FormData();
				formData.append("case", caseData.uid);
				formData.append("document_type", documentType);
				formData.append("original_file", files[0]);
				await apiFetch<Document>("/documents/", {
					method: "POST",
					body: formData,
				});
				toast.success("Document uploaded.");
			} else {
				const formData = new FormData();
				formData.append("case", caseData.uid);
				if (files.length === 1 && isZipFile(files[0])) {
					formData.append("zip_file", files[0]);
				} else {
					for (const f of files) formData.append("files", f);
				}
				const { results } = await apiFetch<{
					created_count: number;
					errors: { filename: string; error: string }[];
				}>("/documents/bulk/", { method: "POST", body: formData });
				if (results.errors.length > 0) {
					toast.error(
						`${results.created_count} uploaded, ${results.errors.length} failed.`,
					);
				} else {
					toast.success(
						`${results.created_count} document(s) uploaded — AI is classifying each one.`,
					);
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

	async function handleUnapproveRecommendation(rec: Recommendation) {
		setApprovingUid(rec.uid);
		try {
			await apiFetch<Recommendation>(`/recommendations/${rec.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ is_approved: false }),
			});
			toast.success("Recommendation unapproved.");
			loadRecommendations();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Could not update.");
		} finally {
			setApprovingUid(null);
		}
	}

	async function handleDeleteRecommendation(rec: Recommendation) {
		setApprovingUid(rec.uid);
		try {
			await apiFetch(`/recommendations/${rec.uid}/`, { method: "DELETE" });
			toast.success("Recommendation removed.");
			loadRecommendations();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Could not remove.");
		} finally {
			setApprovingUid(null);
		}
	}

	function openRecEditDialog(rec: Recommendation) {
		setEditingRec(rec);
		setRecEditForm({
			rank: String(rec.rank),
			score: rec.score ?? "",
			adviser_override_reason: rec.adviser_override_reason,
		});
	}

	async function handleSaveRecEdit(e: FormEvent) {
		e.preventDefault();
		if (!editingRec) return;
		setSavingRecEdit(true);
		try {
			await apiFetch<Recommendation>(`/recommendations/${editingRec.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({
					rank: Number(recEditForm.rank),
					score: recEditForm.score || null,
					adviser_override_reason: recEditForm.adviser_override_reason,
				}),
			});
			toast.success("Recommendation updated.");
			setEditingRec(null);
			loadRecommendations();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Could not update recommendation.",
			);
		} finally {
			setSavingRecEdit(false);
		}
	}

	async function handleGenerateRecommendations() {
		if (!caseData) return;
		setGeneratingRecs(true);
		try {
			await apiFetch<Recommendation[]>("/recommendations/generate/", {
				method: "POST",
				body: JSON.stringify({ case: caseData.uid }),
			});
			toast.success("Recommendations generated.");
			loadRecommendations();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Could not generate recommendations.",
			);
		} finally {
			setGeneratingRecs(false);
		}
	}

	async function handleCreateTask(e: FormEvent) {
		e.preventDefault();
		if (!caseData) return;
		setCreatingTask(true);
		try {
			await apiFetch<Task>("/tasks/", {
				method: "POST",
				body: JSON.stringify({
					case: caseData.uid,
					title: taskForm.title,
					description: taskForm.description,
					due_date: taskForm.due_date || null,
					assignee: taskForm.assignee || null,
				}),
			});
			toast.success("Task added.");
			setTaskForm({ title: "", description: "", due_date: "", assignee: "" });
			setTaskDialogOpen(false);
			loadTasks();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add task.",
			);
		} finally {
			setCreatingTask(false);
		}
	}

	async function handleTaskStatusChange(task: Task, taskStatus: TaskStatus) {
		setUpdatingTaskUid(task.uid);
		try {
			await apiFetch<Task>(`/tasks/${task.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ task_status: taskStatus }),
			});
			loadTasks();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update task.",
			);
		} finally {
			setUpdatingTaskUid(null);
		}
	}

	async function handleApplyChecklist() {
		if (!caseData || !selectedChecklist) return;
		setApplyingChecklist(true);
		try {
			await apiFetch<Task[]>("/task-checklist-templates/apply/", {
				method: "POST",
				body: JSON.stringify({
					case: caseData.uid,
					template: selectedChecklist,
				}),
			});
			toast.success("Checklist applied.");
			setSelectedChecklist("");
			loadTasks();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not apply checklist.",
			);
		} finally {
			setApplyingChecklist(false);
		}
	}

	async function handleStageChange(stage: CaseStage) {
		if (!caseData || stage === caseData.stage) return;
		setUpdatingStage(true);
		try {
			const { results } = await apiFetch<Case>(`/cases/${caseData.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ stage }),
			});
			setCaseData(results);
			toast.success("Stage updated.");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update stage.",
			);
		} finally {
			setUpdatingStage(false);
		}
	}

	async function handleAdviserChange(adviserUid: string) {
		if (!caseData) return;
		setUpdatingAdviser(true);
		try {
			const { results } = await apiFetch<Case>(`/cases/${caseData.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ adviser: adviserUid || null }),
			});
			setCaseData(results);
			setAdviser(members.find((m) => m.uid === adviserUid) ?? null);
			toast.success("Adviser updated.");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update adviser.",
			);
		} finally {
			setUpdatingAdviser(false);
		}
	}

	async function handleDocStatusChange(
		doc: Document,
		docStatus: DocumentStatus,
	) {
		setUpdatingDocUid(doc.uid);
		try {
			await apiFetch<Document>(`/documents/${doc.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ doc_status: docStatus }),
			});
			loadDocuments();
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Could not update document status.",
			);
		} finally {
			setUpdatingDocUid(null);
		}
	}

	async function handleTaskAssigneeChange(task: Task, assigneeUid: string) {
		setUpdatingTaskUid(task.uid);
		try {
			await apiFetch<Task>(`/tasks/${task.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ assignee: assigneeUid || null }),
			});
			loadTasks();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update assignee.",
			);
		} finally {
			setUpdatingTaskUid(null);
		}
	}

	async function handleDownloadPack() {
		if (!caseData) return;
		setDownloadingPack(true);
		try {
			await downloadFile(
				`/cases/${caseData.uid}/application-pack/`,
				`case-${caseData.uid}-application-pack.zip`,
			);
		} catch (err) {
			toast.error(
				err instanceof ApiError
					? err.message
					: "Could not download the application pack.",
			);
		} finally {
			setDownloadingPack(false);
		}
	}

	async function handleDeleteCase() {
		if (!caseData) return;
		setDeletingCase(true);
		try {
			await apiFetch(`/cases/${caseData.uid}/`, { method: "DELETE" });
			toast.success("Case deleted.");
			router.push("/cases");
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not delete the case.",
			);
			setDeletingCase(false);
		}
	}

	function memberLabel(uid: string | null) {
		if (!uid) return "Unassigned";
		const member = members.find((m) => m.uid === uid);
		return member ? `${member.first_name} ${member.last_name}` : "Unassigned";
	}

	function templateLabel(uid: string | null) {
		if (!uid) return "No template";
		const template = templates.find((t) => t.uid === uid);
		return template ? `${template.form_name} — ${template.provider_name}` : uid;
	}

	async function handleCreateDraft(e: FormEvent) {
		e.preventDefault();
		if (!draftFile || !caseData) {
			toast.error("Choose a file first.");
			return;
		}
		setCreatingDraft(true);
		try {
			const formData = new FormData();
			formData.append("case", caseData.uid);
			if (draftTemplate) formData.append("template", draftTemplate);
			formData.append("draft_file", draftFile);
			formData.append("adviser_notes", draftNotes);
			await apiFetch<ApplicationDraft>("/application-drafts/", {
				method: "POST",
				body: formData,
			});
			toast.success("Draft uploaded.");
			setDraftTemplate("");
			setDraftFile(null);
			setDraftNotes("");
			setDraftDialogOpen(false);
			loadDrafts();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not upload draft.",
			);
		} finally {
			setCreatingDraft(false);
		}
	}

	async function handleGenerateDraft() {
		if (!caseData || !draftTemplate) {
			toast.error("Select a template first.");
			return;
		}
		setGeneratingDraft(true);
		try {
			const { results } = await apiFetch<ApplicationDraft>(
				"/application-drafts/generate/",
				{
					method: "POST",
					body: JSON.stringify({ case: caseData.uid, template: draftTemplate }),
				},
			);
			if (results.missing_fields.length > 0) {
				toast.warning(
					`Draft generated - ${results.missing_fields.length} field(s) need manual entry: ${results.missing_fields.join(", ")}`,
				);
			} else {
				toast.success("Draft generated - all fields filled.");
			}
			setDraftTemplate("");
			setDraftDialogOpen(false);
			loadDrafts();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not generate draft.",
			);
		} finally {
			setGeneratingDraft(false);
		}
	}

	async function handleApproveDraft(draft: ApplicationDraft) {
		setApprovingDraftUid(draft.uid);
		try {
			await apiFetch<ApplicationDraft>(
				`/application-drafts/${draft.uid}/approve/`,
				{
					method: "POST",
				},
			);
			toast.success("Draft approved.");
			loadDrafts();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not approve draft.",
			);
		} finally {
			setApprovingDraftUid(null);
		}
	}

	async function handleUnapproveDraft(draft: ApplicationDraft) {
		setApprovingDraftUid(draft.uid);
		try {
			await apiFetch<ApplicationDraft>(`/application-drafts/${draft.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ is_approved: false }),
			});
			toast.success("Draft unapproved.");
			loadDrafts();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Could not update.");
		} finally {
			setApprovingDraftUid(null);
		}
	}

	async function handleDeleteDraft(draft: ApplicationDraft) {
		setApprovingDraftUid(draft.uid);
		try {
			await apiFetch(`/application-drafts/${draft.uid}/`, { method: "DELETE" });
			toast.success("Draft removed.");
			loadDrafts();
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Could not remove.");
		} finally {
			setApprovingDraftUid(null);
		}
	}

	async function handleCreateMeeting(e: FormEvent) {
		e.preventDefault();
		if (!caseData || !meetingForm.scheduled_time) {
			toast.error("Pick a date/time.");
			return;
		}
		setCreatingMeeting(true);
		try {
			await apiFetch<Meeting>("/meetings/", {
				method: "POST",
				body: JSON.stringify({
					case: caseData.uid,
					scheduled_time: new Date(meetingForm.scheduled_time).toISOString(),
					meet_link: meetingForm.meet_link,
				}),
			});
			toast.success("Meeting scheduled.");
			setMeetingForm({ scheduled_time: "", meet_link: "" });
			setMeetingDialogOpen(false);
			loadMeetings();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not schedule meeting.",
			);
		} finally {
			setCreatingMeeting(false);
		}
	}

	async function handleMeetingStatusChange(
		meeting: Meeting,
		meetingStatus: MeetingStatus,
	) {
		setUpdatingMeetingUid(meeting.uid);
		try {
			await apiFetch<Meeting>(`/meetings/${meeting.uid}/`, {
				method: "PATCH",
				body: JSON.stringify({ meeting_status: meetingStatus }),
			});
			loadMeetings();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not update meeting.",
			);
		} finally {
			setUpdatingMeetingUid(null);
		}
	}

	async function handleSendMessage(e: FormEvent) {
		e.preventDefault();
		if (!caseData || !messageBody.trim()) return;
		setSendingMessage(true);
		try {
			await apiFetch<Communication>("/communications/", {
				method: "POST",
				body: JSON.stringify({ case: caseData.uid, message_body: messageBody }),
			});
			setMessageBody("");
			loadMessages();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not send message.",
			);
		} finally {
			setSendingMessage(false);
		}
	}

	if (!caseData || !student) {
		return <p className="text-muted-foreground">Loading...</p>;
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold">
						Case for{" "}
						<Link href={`/students/${student.uid}`} className="hover:underline">
							{student.first_name} {student.last_name}
						</Link>
					</h1>
					<div className="mt-1 flex items-center gap-2">
						<Select
							value={caseData.stage}
							onValueChange={(value) =>
								value && handleStageChange(value as CaseStage)
							}
						>
							<SelectTrigger className="w-44" disabled={updatingStage}>
								<SelectValue>
									{(value: CaseStage | null) =>
										value ? STAGE_LABELS[value] : ""
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{STAGES.map((s) => (
									<SelectItem key={s} value={s}>
										{STAGE_LABELS[s]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<span className="text-sm text-muted-foreground">Adviser:</span>
						<Select
							value={caseData.adviser ?? ""}
							onValueChange={(value) => handleAdviserChange(value ?? "")}
						>
							<SelectTrigger className="w-48" disabled={updatingAdviser}>
								<SelectValue placeholder="Unassigned">
									{() =>
										adviser
											? `${adviser.first_name} ${adviser.last_name}`
											: "Unassigned"
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Unassigned</SelectItem>
								{members
									.filter((m) => STAFF_KINDS.has(m.kind))
									.map((m) => (
										<SelectItem key={m.uid} value={m.uid}>
											{m.first_name} {m.last_name}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={downloadingPack}
						onClick={handleDownloadPack}
					>
						{downloadingPack ? "Preparing..." : "Download application pack"}
					</Button>
					{isAdmin && (
						<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
							<DialogTrigger
								render={
									<Button size="sm" variant="destructive">
										Delete case
									</Button>
								}
							/>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Delete this case?</DialogTitle>
								</DialogHeader>
								<p className="text-sm text-muted-foreground">
									This permanently deletes the case for {student.first_name}{" "}
									{student.last_name} along with all of its documents, tasks,
									recommendations, drafts, meetings and messages. This cannot be
									undone.
								</p>
								<DialogFooter>
									<Button
										variant="destructive"
										disabled={deletingCase}
										onClick={handleDeleteCase}
									>
										{deletingCase ? "Deleting..." : "Delete permanently"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					)}
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
										Select multiple files or a .zip to bulk upload - AI will
										classify each one automatically.
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
														value
															? DOCUMENT_TYPE_LABELS[value]
															: "Select a type"
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
											<Select
												value={doc.doc_status}
												onValueChange={(value) =>
													value &&
													handleDocStatusChange(doc, value as DocumentStatus)
												}
											>
												<SelectTrigger
													className="w-36"
													disabled={updatingDocUid === doc.uid}
												>
													<SelectValue>
														{(value: DocumentStatus | null) =>
															value ? DOCUMENT_STATUS_LABELS[value] : ""
														}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{DOCUMENT_STATUSES.map((s) => (
														<SelectItem key={s} value={s}>
															{DOCUMENT_STATUS_LABELS[s]}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{doc.is_duplicate && (
													<Badge variant="destructive">Duplicate</Badge>
												)}
												{doc.quality_flags.map((flag) => (
													<Badge key={flag} variant="destructive">
														{qualityFlagLabel(flag)}
													</Badge>
												))}
											</div>
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
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={generatingRecs}
							onClick={handleGenerateRecommendations}
						>
							{generatingRecs ? "Generating..." : "Auto-generate top 10"}
						</Button>
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
					</div>
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
									<TableHead>Requirements &amp; risks</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recommendations.map((rec) => (
									<TableRow key={rec.uid}>
										<TableCell>
											#{rec.rank}
											{rec.adviser_override_reason && (
												<Badge
													variant="secondary"
													className="ml-1"
													title={rec.adviser_override_reason}
												>
													Overridden
												</Badge>
											)}
										</TableCell>
										<TableCell>{courseLabel(rec.course)}</TableCell>
										<TableCell>{rec.score ?? "—"}</TableCell>
										<TableCell
											className="max-w-xs truncate"
											title={rec.recommendation_notes}
										>
											{rec.recommendation_notes || "—"}
										</TableCell>
										<TableCell className="max-w-xs">
											<div className="flex flex-col gap-1">
												{rec.unmet_requirements.map((req) => (
													<Badge
														key={req}
														variant="destructive"
														className="w-fit"
													>
														{req}
													</Badge>
												))}
												{rec.risk_notes && (
													<span
														className="truncate text-xs text-muted-foreground"
														title={rec.risk_notes}
													>
														{rec.risk_notes}
													</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											{rec.is_approved ? (
												<div className="flex items-center gap-1">
													<Badge>Approved</Badge>
													<Button
														size="sm"
														variant="ghost"
														disabled={approvingUid === rec.uid}
														onClick={() => handleUnapproveRecommendation(rec)}
													>
														Unapprove
													</Button>
												</div>
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
										<TableCell className="flex items-center gap-1">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => openRecEditDialog(rec)}
											>
												Edit
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												disabled={approvingUid === rec.uid}
												onClick={() => handleDeleteRecommendation(rec)}
											>
												Remove
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!editingRec}
				onOpenChange={(open) => !open && setEditingRec(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit recommendation</DialogTitle>
					</DialogHeader>
					<form className="flex flex-col gap-4" onSubmit={handleSaveRecEdit}>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label>Rank</Label>
								<Input
									type="number"
									min="1"
									value={recEditForm.rank}
									onChange={(e) =>
										setRecEditForm({ ...recEditForm, rank: e.target.value })
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>Score (0-100)</Label>
								<Input
									type="number"
									step="0.01"
									value={recEditForm.score}
									onChange={(e) =>
										setRecEditForm({ ...recEditForm, score: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Override reason</Label>
							<Input
								placeholder="Why is this different from the auto-generated result?"
								value={recEditForm.adviser_override_reason}
								onChange={(e) =>
									setRecEditForm({
										...recEditForm,
										adviser_override_reason: e.target.value,
									})
								}
							/>
							<p className="text-xs text-muted-foreground">
								Required context for the record when you change the rank or
								score from what the scoring engine produced.
							</p>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={savingRecEdit}>
								{savingRecEdit ? "Saving..." : "Save changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Tasks</CardTitle>
					<div className="flex items-center gap-2">
						{checklists.length > 0 && (
							<>
								<Select
									value={selectedChecklist}
									onValueChange={(value) =>
										value && setSelectedChecklist(value)
									}
								>
									<SelectTrigger className="w-56">
										<SelectValue placeholder="Apply checklist template..." />
									</SelectTrigger>
									<SelectContent>
										{checklists.map((checklist) => (
											<SelectItem key={checklist.uid} value={checklist.uid}>
												{checklist.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									size="sm"
									variant="outline"
									disabled={!selectedChecklist || applyingChecklist}
									onClick={handleApplyChecklist}
								>
									{applyingChecklist ? "Applying..." : "Apply"}
								</Button>
							</>
						)}
						<Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
							<DialogTrigger render={<Button size="sm">Add task</Button>} />
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add a task</DialogTitle>
								</DialogHeader>
								<form
									className="flex flex-col gap-4"
									onSubmit={handleCreateTask}
								>
									<div className="flex flex-col gap-2">
										<Label>Title</Label>
										<Input
											required
											value={taskForm.title}
											onChange={(e) =>
												setTaskForm({ ...taskForm, title: e.target.value })
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Description</Label>
										<Input
											value={taskForm.description}
											onChange={(e) =>
												setTaskForm({
													...taskForm,
													description: e.target.value,
												})
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Due date</Label>
										<Input
											type="date"
											value={taskForm.due_date}
											onChange={(e) =>
												setTaskForm({ ...taskForm, due_date: e.target.value })
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Assignee (optional)</Label>
										<Select
											value={taskForm.assignee}
											onValueChange={(value) =>
												setTaskForm({ ...taskForm, assignee: value ?? "" })
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Unassigned">
													{(value: string | null) => {
														const member = members.find((m) => m.uid === value);
														return member
															? `${member.first_name} ${member.last_name}`
															: "Unassigned";
													}}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="">Unassigned</SelectItem>
												{members
													.filter((m) => STAFF_KINDS.has(m.kind))
													.map((m) => (
														<SelectItem key={m.uid} value={m.uid}>
															{m.first_name} {m.last_name}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									</div>
									<DialogFooter>
										<Button type="submit" disabled={creatingTask}>
											{creatingTask ? "Adding..." : "Add task"}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					{tasks.length === 0 ? (
						<p className="text-sm text-muted-foreground">No tasks yet.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Due date</TableHead>
									<TableHead>Assignee</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tasks.map((task) => (
									<TableRow key={task.uid}>
										<TableCell>{task.title}</TableCell>
										<TableCell>{task.due_date ?? "—"}</TableCell>
										<TableCell>
											<Select
												value={task.assignee ?? ""}
												onValueChange={(value) =>
													handleTaskAssigneeChange(task, value ?? "")
												}
											>
												<SelectTrigger
													className="w-40"
													disabled={updatingTaskUid === task.uid}
												>
													<SelectValue>
														{(value: string | null) => memberLabel(value)}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="">Unassigned</SelectItem>
													{members
														.filter((m) => STAFF_KINDS.has(m.kind))
														.map((m) => (
															<SelectItem key={m.uid} value={m.uid}>
																{m.first_name} {m.last_name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<Select
												value={task.task_status}
												onValueChange={(value) =>
													value &&
													handleTaskStatusChange(task, value as TaskStatus)
												}
											>
												<SelectTrigger
													className="w-48"
													disabled={updatingTaskUid === task.uid}
												>
													<SelectValue>
														{(value: TaskStatus | null) =>
															value ? TASK_STATUS_LABELS[value] : ""
														}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{TASK_STATUSES.map((s) => (
														<SelectItem key={s} value={s}>
															{TASK_STATUS_LABELS[s]}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
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
					<CardTitle>Application drafts</CardTitle>
					<Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
						<DialogTrigger render={<Button size="sm">Upload draft</Button>} />
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Upload an application draft</DialogTitle>
							</DialogHeader>
							<form
								className="flex flex-col gap-4"
								onSubmit={handleCreateDraft}
							>
								<div className="flex flex-col gap-2">
									<Label>Template</Label>
									<Select
										value={draftTemplate}
										onValueChange={(value) => setDraftTemplate(value ?? "")}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="No template">
												{(value: string | null) => templateLabel(value)}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{templates.map((template) => (
												<SelectItem key={template.uid} value={template.uid}>
													{template.form_name} — {template.provider_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="w-fit"
										disabled={!draftTemplate || generatingDraft}
										onClick={handleGenerateDraft}
									>
										{generatingDraft
											? "Generating..."
											: "Auto-fill from student profile"}
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Or upload a draft file manually instead:
								</p>
								<div className="flex flex-col gap-2">
									<Label>Draft file</Label>
									<Input
										type="file"
										onChange={(e) => setDraftFile(e.target.files?.[0] ?? null)}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Adviser notes</Label>
									<Input
										value={draftNotes}
										onChange={(e) => setDraftNotes(e.target.value)}
									/>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={creatingDraft || !draftFile}>
										{creatingDraft ? "Uploading..." : "Upload draft"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent>
					{drafts.length === 0 ? (
						<p className="text-sm text-muted-foreground">No drafts yet.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Template</TableHead>
									<TableHead>Notes</TableHead>
									<TableHead>Missing fields</TableHead>
									<TableHead>File</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{drafts.map((draft) => (
									<TableRow key={draft.uid}>
										<TableCell>{templateLabel(draft.template)}</TableCell>
										<TableCell className="max-w-xs truncate">
											{draft.adviser_notes || "—"}
										</TableCell>
										<TableCell className="max-w-xs">
											{draft.missing_fields.length === 0 ? (
												"—"
											) : (
												<div className="flex flex-wrap gap-1">
													{draft.missing_fields.map((field) => (
														<Badge key={field} variant="destructive">
															{field}
														</Badge>
													))}
												</div>
											)}
										</TableCell>
										<TableCell>
											<a
												href={draft.draft_file}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												View
											</a>
										</TableCell>
										<TableCell className="flex items-center gap-1">
											{draft.is_approved ? (
												<>
													<Badge>Approved</Badge>
													<Button
														size="sm"
														variant="ghost"
														disabled={approvingDraftUid === draft.uid}
														onClick={() => handleUnapproveDraft(draft)}
													>
														Unapprove
													</Button>
												</>
											) : (
												<Button
													size="sm"
													variant="outline"
													disabled={approvingDraftUid === draft.uid}
													onClick={() => handleApproveDraft(draft)}
												>
													{approvingDraftUid === draft.uid
														? "Approving..."
														: "Approve"}
												</Button>
											)}
											<Button
												size="sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												disabled={approvingDraftUid === draft.uid}
												onClick={() => handleDeleteDraft(draft)}
											>
												Remove
											</Button>
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
					<CardTitle>Meetings</CardTitle>
					<Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
						<DialogTrigger
							render={<Button size="sm">Schedule meeting</Button>}
						/>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Schedule a meeting</DialogTitle>
							</DialogHeader>
							<form
								className="flex flex-col gap-4"
								onSubmit={handleCreateMeeting}
							>
								<div className="flex flex-col gap-2">
									<Label>Date and time</Label>
									<Input
										type="datetime-local"
										required
										value={meetingForm.scheduled_time}
										onChange={(e) =>
											setMeetingForm({
												...meetingForm,
												scheduled_time: e.target.value,
											})
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Meet link</Label>
									<Input
										placeholder="https://meet.google.com/..."
										value={meetingForm.meet_link}
										onChange={(e) =>
											setMeetingForm({
												...meetingForm,
												meet_link: e.target.value,
											})
										}
									/>
								</div>
								<DialogFooter>
									<Button type="submit" disabled={creatingMeeting}>
										{creatingMeeting ? "Scheduling..." : "Schedule"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent>
					{meetings.length === 0 ? (
						<p className="text-sm text-muted-foreground">No meetings yet.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>When</TableHead>
									<TableHead>Link</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{meetings.map((meeting) => (
									<TableRow key={meeting.uid}>
										<TableCell>
											{new Date(meeting.scheduled_time).toLocaleString()}
										</TableCell>
										<TableCell>
											{meeting.meet_link ? (
												<a
													href={meeting.meet_link}
													target="_blank"
													rel="noopener noreferrer"
													className="text-primary hover:underline"
												>
													Join
												</a>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											<Select
												value={meeting.meeting_status}
												onValueChange={(value) =>
													value &&
													handleMeetingStatusChange(
														meeting,
														value as MeetingStatus,
													)
												}
											>
												<SelectTrigger
													className="w-40"
													disabled={updatingMeetingUid === meeting.uid}
												>
													<SelectValue>
														{(value: MeetingStatus | null) =>
															value ? MEETING_STATUS_LABELS[value] : ""
														}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{MEETING_STATUSES.map((s) => (
														<SelectItem key={s} value={s}>
															{MEETING_STATUS_LABELS[s]}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Messages</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{messages.length === 0 ? (
						<p className="text-sm text-muted-foreground">No messages yet.</p>
					) : (
						<div className="flex flex-col gap-3">
							{messages.map((message) => (
								<div
									key={message.uid}
									className="flex flex-col gap-1 rounded-lg border p-3"
								>
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>{new Date(message.created_at).toLocaleString()}</span>
										{!message.is_read && (
											<Badge variant="secondary">Unread</Badge>
										)}
									</div>
									<p className="text-sm">{message.message_body}</p>
								</div>
							))}
						</div>
					)}
					<form className="flex gap-2" onSubmit={handleSendMessage}>
						<Input
							placeholder="Write a message..."
							value={messageBody}
							onChange={(e) => setMessageBody(e.target.value)}
						/>
						<Button
							type="submit"
							disabled={sendingMessage || !messageBody.trim()}
						>
							{sendingMessage ? "Sending..." : "Send"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
