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
