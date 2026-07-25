"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarUploadProps = {
	src: string | null;
	fallbackText: string;
	onUpload: (file: File) => Promise<void>;
	size?: "default" | "sm" | "lg";
	className?: string;
};

export function AvatarUpload({
	src,
	fallbackText,
	onUpload,
	size = "default",
	className,
}: AvatarUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	async function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			await onUpload(file);
		} finally {
			setUploading(false);
			e.target.value = "";
		}
	}

	return (
		<button
			type="button"
			onClick={() => inputRef.current?.click()}
			disabled={uploading}
			className={cn(
				"relative cursor-pointer rounded-full disabled:opacity-50",
				className,
			)}
			title="Click to change photo"
		>
			<Avatar size={size}>
				{src && <AvatarImage src={src} alt={fallbackText} />}
				<AvatarFallback>{fallbackText}</AvatarFallback>
			</Avatar>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleChange}
			/>
		</button>
	);
}
