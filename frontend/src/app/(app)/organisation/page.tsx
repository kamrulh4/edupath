"use client";

import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth-context";
import type { Organisation, User, UserKind } from "@/lib/types";

const MEMBER_KINDS: UserKind[] = ["ADMIN", "ADVISER", "ADMISSION_OFFICER"];

export default function OrganisationPage() {
	const { user } = useAuth();
	const isAdmin = user?.kind === "ADMIN";

	const [organisation, setOrganisation] = useState<Organisation | null>(null);
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [description, setDescription] = useState("");
	const [savingOrg, setSavingOrg] = useState(false);

	const [members, setMembers] = useState<User[]>([]);
	const [memberForm, setMemberForm] = useState({
		first_name: "",
		last_name: "",
		email: "",
		password: "",
		kind: "ADVISER" as UserKind,
	});
	const [addingMember, setAddingMember] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);

	async function loadOrganisation() {
		const { results } = await apiFetch<Organisation>("/organisation/");
		setOrganisation(results);
		setName(results.name);
		setAddress(results.address);
		setDescription(results.description ?? "");
	}

	async function loadMembers() {
		const { results } = await apiFetch<User[]>("/organisation/members/");
		setMembers(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadOrganisation();
		loadMembers();
	}, []);

	async function handleOrgSubmit(e: FormEvent) {
		e.preventDefault();
		setSavingOrg(true);
		try {
			const { results } = await apiFetch<Organisation>("/organisation/", {
				method: "PATCH",
				body: JSON.stringify({ name, address, description }),
			});
			setOrganisation(results);
			toast.success("Organisation updated.");
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : "Update failed.");
		} finally {
			setSavingOrg(false);
		}
	}

	async function handleAddMember(e: FormEvent) {
		e.preventDefault();
		setAddingMember(true);
		try {
			await apiFetch<User>("/organisation/members/", {
				method: "POST",
				body: JSON.stringify(memberForm),
			});
			toast.success("Team member added.");
			setMemberForm({
				first_name: "",
				last_name: "",
				email: "",
				password: "",
				kind: "ADVISER",
			});
			setDialogOpen(false);
			loadMembers();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not add member.",
			);
		} finally {
			setAddingMember(false);
		}
	}

	return (
		<div className="flex flex-col gap-8">
			<Card>
				<CardHeader>
					<CardTitle>Organisation</CardTitle>
					<CardDescription>
						{isAdmin
							? "Only ADMIN can edit these details."
							: "Read-only for your role."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="flex flex-col gap-4" onSubmit={handleOrgSubmit}>
						<div className="flex flex-col gap-2">
							<Label htmlFor="org_name">Name</Label>
							<Input
								id="org_name"
								disabled={!isAdmin}
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="org_address">Address</Label>
							<Input
								id="org_address"
								disabled={!isAdmin}
								value={address}
								onChange={(e) => setAddress(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="org_description">Description</Label>
							<Input
								id="org_description"
								disabled={!isAdmin}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						{isAdmin && (
							<Button type="submit" disabled={savingOrg} className="w-fit">
								{savingOrg ? "Saving..." : "Save changes"}
							</Button>
						)}
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Team</CardTitle>
						<CardDescription>
							Everyone in {organisation?.name ?? "your workspace"}.
						</CardDescription>
					</div>
					{isAdmin && (
						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger render={<Button size="sm">Add member</Button>} />
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add a team member</DialogTitle>
								</DialogHeader>
								<form
									className="flex flex-col gap-4"
									onSubmit={handleAddMember}
								>
									<div className="grid grid-cols-2 gap-4">
										<div className="flex flex-col gap-2">
											<Label>First name</Label>
											<Input
												required
												value={memberForm.first_name}
												onChange={(e) =>
													setMemberForm({
														...memberForm,
														first_name: e.target.value,
													})
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<Label>Last name</Label>
											<Input
												required
												value={memberForm.last_name}
												onChange={(e) =>
													setMemberForm({
														...memberForm,
														last_name: e.target.value,
													})
												}
											/>
										</div>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Email</Label>
										<Input
											type="email"
											required
											value={memberForm.email}
											onChange={(e) =>
												setMemberForm({ ...memberForm, email: e.target.value })
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Temporary password</Label>
										<Input
											type="password"
											required
											value={memberForm.password}
											onChange={(e) =>
												setMemberForm({
													...memberForm,
													password: e.target.value,
												})
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label>Role</Label>
										<Select
											value={memberForm.kind}
											onValueChange={(value) =>
												setMemberForm({
													...memberForm,
													kind: value as UserKind,
												})
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{MEMBER_KINDS.map((kind) => (
													<SelectItem key={kind} value={kind}>
														{kind}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<DialogFooter>
										<Button type="submit" disabled={addingMember}>
											{addingMember ? "Adding..." : "Add member"}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					)}
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => (
								<TableRow key={member.uid}>
									<TableCell>
										{member.first_name} {member.last_name}
									</TableCell>
									<TableCell>{member.email}</TableCell>
									<TableCell>
										<Badge variant="secondary">{member.kind}</Badge>
									</TableCell>
									<TableCell>{member.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
