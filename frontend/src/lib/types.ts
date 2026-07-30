export type UserKind =
	| "ADMIN"
	| "ADVISER"
	| "ADMISSION_OFFICER"
	| "SUPER_ADMIN"
	| "STUDENT"
	| "UNDEFINED";

export type User = {
	id: number;
	uid: string;
	first_name: string;
	last_name: string;
	email: string;
	phone?: string;
	gender?: string;
	kind: UserKind;
	organisation: number | null;
	image: string | null;
	status?: string;
	created_at: string;
	updated_at: string;
};

export type Organisation = {
	id: number;
	uid: string;
	name: string;
	description: string | null;
	logo: string | null;
	address: string;
	status: string;
	created_at: string;
	updated_at: string;
};

export type OrganisationSettings = {
	id: number;
	uid: string;
	organisation: number;
	provider_preferences: unknown[];
	scoring_weights: Record<string, unknown>;
	workflow_config: Record<string, unknown>;
};

export type Student = {
	id: number;
	uid: string;
	organisation: number;
	user: number | null;
	photo: string | null;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	date_of_birth: string | null;
	passport_number: string;
	nationality: string;
	education_history: unknown[];
	english_scores: Record<string, unknown>;
	goals_and_preferences: string;
	ai_processing_consent: boolean;
	ai_processing_consent_at: string | null;
	communication_consent: boolean;
	communication_consent_at: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};

export type CaseStage =
	| "ENQUIRY"
	| "DOCUMENTS_PENDING"
	| "SHORTLISTED"
	| "PREPARED"
	| "SUBMITTED"
	| "ENROLLED";

export type Case = {
	id: number;
	uid: string;
	student: string;
	adviser: string | null;
	stage: CaseStage;
	status: string;
	created_at: string;
	updated_at: string;
};

export type DocumentType =
	| "PASSPORT"
	| "TRANSCRIPT"
	| "O_LEVEL"
	| "A_LEVEL"
	| "ENGLISH_RESULT"
	| "POLICE_CLEARANCE"
	| "FINANCIAL"
	| "OTHER";

export type DocumentCategory =
	| "IDENTITY"
	| "ACADEMIC"
	| "ENGLISH"
	| "FINANCIAL"
	| "OTHER";

export type DocumentStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type Document = {
	id: number;
	uid: string;
	case: string;
	document_category: DocumentCategory;
	document_type: DocumentType;
	doc_status: DocumentStatus;
	original_file: string;
	renamed_file: string | null;
	quality_flags: string[];
	is_duplicate: boolean;
	uploaded_by: number | null;
	status: string;
	created_at: string;
	updated_at: string;
};

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type ExtractedField = {
	id: number;
	uid: string;
	document: string;
	field_name: string;
	extracted_value: string;
	confidence_level: ConfidenceLevel;
	confidence_value: string | null;
	is_verified: boolean;
	reviewer: number | null;
	created_at: string;
	updated_at: string;
};

export type Course = {
	id: number;
	uid: string;
	organisation: number;
	provider_name: string;
	course_name: string;
	campus: string;
	duration: string;
	intake_dates: string[];
	tuition_fee: string | null;
	academic_requirements: string;
	english_requirements: string;
	prerequisite_requirements: string;
	category: string;
	source_url: string;
	last_verification_date: string | null;
	is_active: boolean;
	is_partner_provider: boolean;
	commission_notes: string;
	status: string;
	created_at: string;
	updated_at: string;
};

export type Recommendation = {
	id: number;
	uid: string;
	case: string;
	course: string;
	rank: number;
	score: string | null;
	score_breakdown: Record<string, unknown>;
	unmet_requirements: string[];
	recommendation_notes: string;
	risk_notes: string;
	adviser_override_reason: string;
	is_approved: boolean;
	status: string;
	created_at: string;
	updated_at: string;
};

export type PortalCourse = Pick<
	Course,
	| "uid"
	| "provider_name"
	| "course_name"
	| "campus"
	| "duration"
	| "intake_dates"
	| "tuition_fee"
	| "category"
>;

export type PortalRecommendation = Omit<Recommendation, "course"> & {
	course: PortalCourse;
};

export type TaskStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "WAITING_FOR_STUDENT"
	| "COMPLETED"
	| "OVERDUE";

export type Task = {
	id: number;
	uid: string;
	case: string;
	assignee: string | null;
	title: string;
	description: string;
	due_date: string | null;
	task_status: TaskStatus;
	status: string;
	created_at: string;
	updated_at: string;
};

export type FormTemplate = {
	id: number;
	uid: string;
	organisation: number;
	provider_name: string;
	form_name: string;
	template_file: string;
	field_mapping: Record<string, unknown>;
	is_active: boolean;
	status: string;
	created_at: string;
	updated_at: string;
};

export type ApplicationDraft = {
	id: number;
	uid: string;
	case: string;
	template: string | null;
	draft_file: string;
	is_approved: boolean;
	adviser_notes: string;
	status: string;
	created_at: string;
	updated_at: string;
};

export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type Meeting = {
	id: number;
	uid: string;
	case: string;
	scheduled_time: string;
	meet_link: string;
	meeting_status: MeetingStatus;
	transcript: string;
	ai_summary: string;
	extracted_requirements: Record<string, unknown>;
	status: string;
	created_at: string;
	updated_at: string;
};

export type Communication = {
	id: number;
	uid: string;
	case: string;
	sender: number | null;
	message_body: string;
	is_read: boolean;
	status: string;
	created_at: string;
	updated_at: string;
};
