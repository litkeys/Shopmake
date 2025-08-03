"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DragDropContext,
	Droppable,
	Draggable,
	DropResult,
} from "@hello-pangea/dnd";
import {
	Plus,
	Trash2,
	GripVertical,
	ToggleLeft,
	ToggleRight,
	Layout,
	AlertCircle,
} from "lucide-react";
import {
	StoreLayout,
	StorePageLayout,
	AVAILABLE_SECTIONS,
	STORE_PAGES,
	REQUIRED_SECTIONS,
	DEFAULT_STORE_LAYOUT,
} from "@/types";

interface StoreLayoutEditorProps {
	storeLayout: StoreLayout;
	onChange: (layout: StoreLayout) => void;
	disabled?: boolean;
}

export function StoreLayoutEditor({
	storeLayout,
	onChange,
	disabled = false,
}: StoreLayoutEditorProps) {
	const [selectedPage, setSelectedPage] = useState<string>("index");
	const [searchTerm, setSearchTerm] = useState("");

	// Get all sections (available + required)
	const allSections = [...AVAILABLE_SECTIONS, ...REQUIRED_SECTIONS];

	// Filter available sections based on search
	const filteredAvailableSections = AVAILABLE_SECTIONS.filter((section) =>
		section.displayName.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Get the current page configuration
	const currentPageConfig = storeLayout[selectedPage as keyof StoreLayout];
	const currentPage = STORE_PAGES.find((page) => page.id === selectedPage);

	// Get section display name
	const getSectionDisplayName = useCallback(
		(sectionId: string): string => {
			const section = allSections.find((s) => s.id === sectionId);
			return section?.displayName || sectionId;
		},
		[allSections]
	);

	// Check if section is required for current page
	const isSectionRequired = useCallback(
		(sectionId: string): boolean => {
			return currentPage?.requiredSections?.includes(sectionId) || false;
		},
		[currentPage]
	);

	// Update page configuration
	const updatePageConfig = useCallback(
		(pageId: string, config: StorePageLayout) => {
			const newLayout = { ...storeLayout };
			newLayout[pageId as keyof StoreLayout] = config;
			onChange(newLayout);
		},
		[storeLayout, onChange]
	);

	// Toggle page inclusion
	const togglePageInclusion = useCallback(() => {
		updatePageConfig(selectedPage, {
			...currentPageConfig,
			include: !currentPageConfig.include,
		});
	}, [selectedPage, currentPageConfig, updatePageConfig]);

	// Add section to page
	const addSection = useCallback(
		(sectionId: string) => {
			const currentSections = currentPageConfig.sections;

			// Check if page already has 20 sections
			if (currentSections.length >= 20) {
				alert(
					"Cannot add more sections. Maximum of 20 sections per page."
				);
				return;
			}

			updatePageConfig(selectedPage, {
				...currentPageConfig,
				sections: [...currentSections, sectionId],
			});
		},
		[selectedPage, currentPageConfig, updatePageConfig]
	);

	// Remove section from page
	const removeSection = useCallback(
		(index: number) => {
			const sectionId = currentPageConfig.sections[index];

			// Don't allow removal of required sections
			if (isSectionRequired(sectionId)) {
				alert("This section is required and cannot be removed.");
				return;
			}

			const newSections = [...currentPageConfig.sections];
			newSections.splice(index, 1);

			updatePageConfig(selectedPage, {
				...currentPageConfig,
				sections: newSections,
			});
		},
		[selectedPage, currentPageConfig, updatePageConfig, isSectionRequired]
	);

	// Reorder sections
	const onDragEnd = useCallback(
		(result: DropResult) => {
			if (!result.destination) return;

			const newSections = [...currentPageConfig.sections];
			const [reorderedItem] = newSections.splice(result.source.index, 1);
			newSections.splice(result.destination.index, 0, reorderedItem);

			updatePageConfig(selectedPage, {
				...currentPageConfig,
				sections: newSections,
			});
		},
		[selectedPage, currentPageConfig, updatePageConfig]
	);

	// Reset to defaults
	const resetToDefaults = useCallback(() => {
		if (
			confirm(
				"Are you sure you want to reset all page layouts to defaults?"
			)
		) {
			onChange(DEFAULT_STORE_LAYOUT);
		}
	}, [onChange]);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<CardTitle className="flex items-center mb-2">
							<Layout className="h-5 w-5 mr-2" />
							Store Layout
						</CardTitle>
						<CardDescription>
							Customize which sections appear on each page of your
							store and in what order.
						</CardDescription>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={resetToDefaults}
						disabled={disabled}
						size="sm"
					>
						Reset to Defaults
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Page Selection */}
				<div>
					<Label
						htmlFor="page-select"
						className="text-sm font-medium"
					>
						Select Page to Configure
					</Label>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
						{STORE_PAGES.map((page) => (
							<Button
								key={page.id}
								type="button"
								variant={
									selectedPage === page.id
										? "default"
										: "outline"
								}
								onClick={() => setSelectedPage(page.id)}
								disabled={disabled}
								className="justify-start text-sm"
							>
								{page.displayName}
							</Button>
						))}
					</div>
				</div>

				{/* Current Page Configuration */}
				{currentPage && (
					<div className="border rounded-lg p-4 bg-gray-50">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h3 className="font-medium text-lg">
									{currentPage.displayName}
								</h3>
								<p className="text-sm text-gray-600">
									Template: {currentPage.filename}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								onClick={togglePageInclusion}
								disabled={disabled}
								className="flex items-center gap-2"
							>
								{currentPageConfig.include ? (
									<ToggleRight className="h-5 w-5 text-green-600" />
								) : (
									<ToggleLeft className="h-5 w-5 text-gray-400" />
								)}
								{currentPageConfig.include
									? "Included"
									: "Excluded"}
							</Button>
						</div>

						{!currentPageConfig.include && (
							<div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
								<AlertCircle className="h-4 w-4 text-yellow-600" />
								<span className="text-sm text-yellow-700">
									This page is excluded from store generation.
								</span>
							</div>
						)}

						{/* Required Sections Notice */}
						{currentPage.requiredSections &&
							currentPage.requiredSections.length > 0 && (
								<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
									<p className="text-sm text-blue-700 font-medium mb-1">
										Required Sections (cannot be removed):
									</p>
									<div className="flex flex-wrap gap-1">
										{currentPage.requiredSections.map(
											(sectionId) => (
												<span
													key={sectionId}
													className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
												>
													{getSectionDisplayName(
														sectionId
													)}
												</span>
											)
										)}
									</div>
								</div>
							)}

						{/* Current Sections */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="font-medium">
									Current Sections (
									{currentPageConfig.sections.length}/20)
								</h4>
								{currentPageConfig.sections.length >= 20 && (
									<span className="text-sm text-red-600">
										Maximum sections reached
									</span>
								)}
							</div>

							{currentPageConfig.sections.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									No sections configured for this page
								</div>
							) : (
								<DragDropContext onDragEnd={onDragEnd}>
									<Droppable droppableId="sections">
										{(provided) => (
											<div
												{...provided.droppableProps}
												ref={provided.innerRef}
												className="space-y-2"
											>
												{currentPageConfig.sections.map(
													(sectionId, index) => {
														const isRequired =
															isSectionRequired(
																sectionId
															);
														return (
															<Draggable
																key={`${sectionId}-${index}`}
																draggableId={`${sectionId}-${index}`}
																index={index}
																isDragDisabled={
																	disabled
																}
															>
																{(
																	provided,
																	snapshot
																) => (
																	<div
																		ref={
																			provided.innerRef
																		}
																		{...provided.draggableProps}
																		className={`flex items-center gap-2 p-3 bg-white border rounded-md ${
																			snapshot.isDragging
																				? "shadow-lg"
																				: "shadow-sm"
																		} ${
																			isRequired
																				? "border-blue-200 bg-blue-50"
																				: ""
																		}`}
																	>
																		<div
																			{...provided.dragHandleProps}
																			className="cursor-grab active:cursor-grabbing"
																		>
																			<GripVertical className="h-4 w-4 text-gray-400" />
																		</div>
																		<span className="flex-1 text-sm">
																			{getSectionDisplayName(
																				sectionId
																			)}
																			{isRequired && (
																				<span className="ml-2 text-xs text-blue-600">
																					(Required)
																				</span>
																			)}
																		</span>
																		<Button
																			type="button"
																			variant="ghost"
																			size="sm"
																			onClick={() =>
																				removeSection(
																					index
																				)
																			}
																			disabled={
																				disabled ||
																				isRequired
																			}
																			className="h-8 w-8 p-0"
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	</div>
																)}
															</Draggable>
														);
													}
												)}
												{provided.placeholder}
											</div>
										)}
									</Droppable>
								</DragDropContext>
							)}
						</div>

						{/* Add Sections */}
						{currentPageConfig.include &&
							currentPageConfig.sections.length < 20 && (
								<div className="mt-6 pt-4 border-t">
									<h4 className="font-medium mb-3">
										Add Sections
									</h4>

									{/* Search */}
									<div className="mb-3">
										<Input
											type="text"
											placeholder="Search sections..."
											value={searchTerm}
											onChange={(e) =>
												setSearchTerm(e.target.value)
											}
											disabled={disabled}
											className="text-sm"
										/>
									</div>

									{/* Available Sections */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
										{filteredAvailableSections.map(
											(section) => (
												<Button
													key={section.id}
													type="button"
													variant="outline"
													onClick={() =>
														addSection(section.id)
													}
													disabled={disabled}
													className="justify-start text-sm h-auto py-2"
												>
													<Plus className="h-3 w-3 mr-2" />
													{section.displayName}
												</Button>
											)
										)}
									</div>

									{filteredAvailableSections.length === 0 &&
										searchTerm && (
											<div className="text-center py-4 text-gray-500 text-sm">
												No sections found matching "
												{searchTerm}"
											</div>
										)}
								</div>
							)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
