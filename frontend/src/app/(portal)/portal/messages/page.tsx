"use client";

import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Case, Communication } from "@/lib/types";

export default function PortalMessagesPage() {
	const [messages, setMessages] = useState<Communication[]>([]);
	const [cases, setCases] = useState<Case[]>([]);
	const [messageBody, setMessageBody] = useState("");
	const [sending, setSending] = useState(false);

	async function loadMessages() {
		const { results } = await apiFetch<Communication[]>(
			"/portal/communications/",
		);
		setMessages(results);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		loadMessages();
		apiFetch<Case[]>("/portal/cases/").then(({ results }) => setCases(results));
	}, []);

	async function handleSendMessage(e: FormEvent) {
		e.preventDefault();
		const activeCase = cases[0];
		if (!activeCase || !messageBody.trim()) return;
		setSending(true);
		try {
			await apiFetch<Communication>("/portal/communications/", {
				method: "POST",
				body: JSON.stringify({
					case: activeCase.uid,
					message_body: messageBody,
				}),
			});
			setMessageBody("");
			loadMessages();
		} catch (err) {
			toast.error(
				err instanceof ApiError ? err.message : "Could not send message.",
			);
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold">Messages</h1>
				<p className="text-muted-foreground">
					Chat with your adviser about your application.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Conversation</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{messages.length === 0 ? (
						<p className="text-sm text-muted-foreground">No messages yet.</p>
					) : (
						<div className="flex flex-col-reverse gap-3">
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
							disabled={cases.length === 0}
						/>
						<Button
							type="submit"
							disabled={sending || !messageBody.trim() || cases.length === 0}
						>
							{sending ? "Sending..." : "Send"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
