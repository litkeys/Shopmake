import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { uploadFile, getStore, deleteFile } from "@/lib/supabase";

export async function POST(request: NextRequest) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const formData = await request.formData();
		const file = formData.get("file") as File;
		const storeId = formData.get("storeId") as string;
		const fileType = formData.get("fileType") as string;

		if (!file || !storeId || !fileType) {
			return NextResponse.json(
				{ error: "File, storeId, and fileType are required" },
				{ status: 400 }
			);
		}

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Access denied" },
				{ status: 403 }
			);
		}

		// Validate file type
		if (fileType === "logo" && !file.type.startsWith("image/")) {
			return NextResponse.json(
				{ error: "Logo must be an image file" },
				{ status: 400 }
			);
		}

		if (
			fileType.startsWith("csv_") &&
			!file.name.toLowerCase().endsWith(".csv")
		) {
			return NextResponse.json(
				{ error: "CSV files must have .csv extension" },
				{ status: 400 }
			);
		}

		// Validate file size (5MB limit)
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json(
				{ error: "File must be less than 5MB" },
				{ status: 400 }
			);
		}

		const uploadResult = await uploadFile(storeId, file, fileType);

		return NextResponse.json({ data: uploadResult });
	} catch (error) {
		console.error("Error uploading file:", error);
		return NextResponse.json(
			{ error: "Failed to upload file" },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const { filePath } = await request.json();

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
				{ status: 400 }
			);
		}

		// Extract store ID from file path (format: storeId/fileType/filename)
		const pathParts = filePath.split("/");
		if (pathParts.length < 2) {
			return NextResponse.json(
				{ error: "Invalid file path" },
				{ status: 400 }
			);
		}

		const storeId = pathParts[0];

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Access denied" },
				{ status: 403 }
			);
		}

		await deleteFile(filePath);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting file:", error);
		return NextResponse.json(
			{ error: "Failed to delete file" },
			{ status: 500 }
		);
	}
}
