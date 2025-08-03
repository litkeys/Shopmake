"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	ArrowLeft,
	Save,
	Plus,
	MapPin,
	Trash2,
	Package,
	ChevronDown,
	ChevronUp,
	Tag,
} from "lucide-react";
import {
	createStoreAPI,
	updateStoreDataAPI,
	createStoreLocationAPI,
	deleteStoreLocationAPI,
	updateStoreLocationAPI,
	createStoreCollectionAPI,
	updateStoreCollectionAPI,
	deleteStoreCollectionAPI,
	createCollectionMappingAPI,
	updateCollectionMappingAPI,
	deleteCollectionMappingAPI,
	createShippingOptionAPI,
} from "@/lib/api";
import {
	StoreFormData,
	StoreLocation,
	LocationFormData,
	CollectionWithMappings,
	CollectionFormData,
	MappingFormData,
	ShippingOption,
	ShippingOptionFormData,
	StoreLayout,
	DEFAULT_STORE_LAYOUT,
} from "@/types";
import { StoreLayoutEditor } from "@/components/ui/store-layout-editor";
import Link from "next/link";

export default function NewClientPage() {
	const router = useRouter();
	const { userId } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [storeId, setStoreId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [locations, setLocations] = useState<StoreLocation[]>([]);
	const [locationFormData, setLocationFormData] = useState<
		Record<string, LocationFormData>
	>({});
	const [tempLocationCounter, setTempLocationCounter] = useState(0);
	const [collections, setCollections] = useState<CollectionWithMappings[]>(
		[]
	);
	const [collectionFormData, setCollectionFormData] = useState<
		Record<string, CollectionFormData>
	>({});
	const [mappingFormData, setMappingFormData] = useState<
		Record<string, Record<string, MappingFormData>>
	>({});
	const [expandedCollections, setExpandedCollections] = useState<
		Record<string, boolean>
	>({});
	const [tempCollectionCounter, setTempCollectionCounter] = useState(0);
	const [tempMappingCounter, setTempMappingCounter] = useState(0);
	const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
		[]
	);
	const [shippingOptionFormData, setShippingOptionFormData] = useState<
		Record<string, ShippingOptionFormData>
	>({});
	const [tempShippingOptionCounter, setTempShippingOptionCounter] =
		useState(0);
	const [storeLayout, setStoreLayout] =
		useState<StoreLayout>(DEFAULT_STORE_LAYOUT);

	const [formData, setFormData] = useState<StoreFormData>({
		brand_name: "",
		description: "",
		main_product_category: "",
		contact_email: "",
		text_color: "#000000",
		accent_color: "#3B82F6",
		background_color: "#FFFFFF",
		header_font: "quicksand_n6",
		body_font: "quicksand_n4",
		trading_name: "",
		business_address: "",
		business_phone: "",
		business_registration_number: "",
		vat_number: "",
		return_address: "",
		order_processing_min_days: 1,
		order_processing_max_days: 3,
		return_policy: "",
		privacy_policy: "",
		terms_of_service: "",
		shipping_policy: "",
		contact_information: "",
	});

	const handleInputChange = (field: keyof StoreFormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Location management functions
	const handleAddLocation = () => {
		// Store doesn't exist yet, create temporary location
		const tempId = `temp_${tempLocationCounter}`;
		setTempLocationCounter(tempLocationCounter + 1);

		const tempLocation: StoreLocation = {
			id: tempId,
			store_id: "", // Will be set when store is created
			name: "New Location",
			address: "",
			city: "",
			country: "",
			phone: "",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		setLocations([...locations, tempLocation]);

		// Add to form data for immediate editing
		setLocationFormData((prev) => ({
			...prev,
			[tempId]: {
				name: "New Location",
				address: "",
				city: "",
				country: "",
				phone: "",
			},
		}));
	};

	const handleLocationInputChange = (
		locationId: string,
		field: keyof LocationFormData,
		value: string
	) => {
		setLocationFormData((prev) => ({
			...prev,
			[locationId]: {
				...prev[locationId],
				[field]: value,
			},
		}));
	};

	const handleDeleteLocation = (locationId: string) => {
		// All locations in create form are temporary, just remove from state
		setLocations(locations.filter((loc) => loc.id !== locationId));

		// Remove from form data
		setLocationFormData((prev) => {
			const updated = { ...prev };
			delete updated[locationId];
			return updated;
		});
	};

	// Collection management functions
	const handleAddCollection = () => {
		const tempId = `temp_collection_${tempCollectionCounter}`;
		setTempCollectionCounter(tempCollectionCounter + 1);

		const tempCollection: CollectionWithMappings = {
			id: tempId,
			store_id: "", // Will be set when store is created
			title: "New Collection",
			description: "",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			mappings: [],
		};

		setCollections([...collections, tempCollection]);

		// Add to form data for immediate editing
		setCollectionFormData((prev) => ({
			...prev,
			[tempId]: {
				title: "New Collection",
				description: "",
			},
		}));

		// Initialize empty mapping form data
		setMappingFormData((prev) => ({
			...prev,
			[tempId]: {},
		}));

		// Auto-expand the new collection
		setExpandedCollections((prev) => ({
			...prev,
			[tempId]: true,
		}));
	};

	const handleCollectionInputChange = (
		collectionId: string,
		field: keyof CollectionFormData,
		value: string
	) => {
		setCollectionFormData((prev) => ({
			...prev,
			[collectionId]: {
				...prev[collectionId],
				[field]: value,
			},
		}));
	};

	const handleDeleteCollection = (collectionId: string) => {
		setCollections(collections.filter((col) => col.id !== collectionId));

		// Remove from form data
		setCollectionFormData((prev) => {
			const updated = { ...prev };
			delete updated[collectionId];
			return updated;
		});

		// Remove from mapping form data
		setMappingFormData((prev) => {
			const updated = { ...prev };
			delete updated[collectionId];
			return updated;
		});

		// Remove from expanded collections
		setExpandedCollections((prev) => {
			const updated = { ...prev };
			delete updated[collectionId];
			return updated;
		});
	};

	const handleToggleCollection = (collectionId: string) => {
		setExpandedCollections((prev) => ({
			...prev,
			[collectionId]: !prev[collectionId],
		}));
	};

	const handleAddMapping = (collectionId: string) => {
		const tempMappingId = `temp_mapping_${tempMappingCounter}`;
		setTempMappingCounter(tempMappingCounter + 1);

		const newMapping = {
			id: tempMappingId,
			collection_id: collectionId,
			mapping_type: "product_tag" as const,
			mapping_value: "",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Update collections state
		setCollections((prevCollections) =>
			prevCollections.map((col) =>
				col.id === collectionId
					? { ...col, mappings: [...col.mappings, newMapping] }
					: col
			)
		);

		// Add to mapping form data
		setMappingFormData((prev) => ({
			...prev,
			[collectionId]: {
				...prev[collectionId],
				[tempMappingId]: {
					mapping_type: "product_tag" as const,
					mapping_value: "",
				},
			},
		}));
	};

	const handleMappingInputChange = (
		collectionId: string,
		mappingId: string,
		field: keyof MappingFormData,
		value: string
	) => {
		setMappingFormData((prev) => ({
			...prev,
			[collectionId]: {
				...prev[collectionId],
				[mappingId]: {
					...prev[collectionId]?.[mappingId],
					[field]: value,
				},
			},
		}));
	};

	const handleDeleteMapping = (collectionId: string, mappingId: string) => {
		// Update collections state
		setCollections((prevCollections) =>
			prevCollections.map((col) =>
				col.id === collectionId
					? {
							...col,
							mappings: col.mappings.filter(
								(mapping) => mapping.id !== mappingId
							),
					  }
					: col
			)
		);

		// Remove from mapping form data
		setMappingFormData((prev) => {
			const updated = { ...prev };
			if (updated[collectionId]) {
				const updatedCollection = { ...updated[collectionId] };
				delete updatedCollection[mappingId];
				updated[collectionId] = updatedCollection;
			}
			return updated;
		});
	};

	// Shipping options management functions
	const handleAddShippingOption = () => {
		const tempId = `temp_shipping_${tempShippingOptionCounter}`;
		setTempShippingOptionCounter(tempShippingOptionCounter + 1);

		const tempShippingOption: ShippingOption = {
			id: tempId,
			store_id: "",
			name: "New Shipping Option",
			delivery_min_days: 1,
			delivery_max_days: 5,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		setShippingOptions([...shippingOptions, tempShippingOption]);

		// Add to form data for immediate editing
		setShippingOptionFormData((prev) => ({
			...prev,
			[tempId]: {
				name: "New Shipping Option",
				delivery_min_days: 1,
				delivery_max_days: 5,
			},
		}));
	};

	const handleShippingOptionInputChange = (
		shippingOptionId: string,
		field: keyof ShippingOptionFormData,
		value: string | number
	) => {
		setShippingOptionFormData((prev) => ({
			...prev,
			[shippingOptionId]: {
				...prev[shippingOptionId],
				[field]: value,
			},
		}));
	};

	const handleDeleteShippingOption = (shippingOptionId: string) => {
		setShippingOptions(
			shippingOptions.filter((option) => option.id !== shippingOptionId)
		);

		// Remove from form data
		setShippingOptionFormData((prev) => {
			const updated = { ...prev };
			delete updated[shippingOptionId];
			return updated;
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!userId) {
			setError("Not authenticated");
			return;
		}

		if (!formData.brand_name.trim()) {
			setError("Store name is required");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			let currentStoreId = storeId;

			// Create store if it doesn't exist
			if (!currentStoreId) {
				const newStore = await createStoreAPI(formData.brand_name);
				currentStoreId = newStore.id;
				setStoreId(currentStoreId);
			}

			// Save store data
			await updateStoreDataAPI(currentStoreId, {
				brand_name: formData.brand_name,
				description: formData.description,
				main_product_category: formData.main_product_category,
				contact_email: formData.contact_email,
				text_color: formData.text_color,
				accent_color: formData.accent_color,
				background_color: formData.background_color,
				header_font: formData.header_font,
				body_font: formData.body_font,
				trading_name: formData.trading_name,
				business_address: formData.business_address,
				business_phone: formData.business_phone,
				business_registration_number:
					formData.business_registration_number,
				vat_number: formData.vat_number,
				return_address: formData.return_address,
				order_processing_min_days: formData.order_processing_min_days,
				order_processing_max_days: formData.order_processing_max_days,
				return_policy: formData.return_policy,
				privacy_policy: formData.privacy_policy,
				terms_of_service: formData.terms_of_service,
				shipping_policy: formData.shipping_policy,
				contact_information: formData.contact_information,
				store_layout: storeLayout,
			});

			// Create any temporary locations
			const tempLocations = locations.filter((loc) =>
				loc.id.startsWith("temp_")
			);
			for (const tempLocation of tempLocations) {
				const locationData = locationFormData[tempLocation.id];
				if (locationData) {
					await createStoreLocationAPI(currentStoreId, locationData);
				}
			}

			// Create any temporary collections
			const tempCollections = collections.filter((col) =>
				col.id.startsWith("temp_collection_")
			);
			for (const tempCollection of tempCollections) {
				const collectionData = collectionFormData[tempCollection.id];
				if (collectionData) {
					const newCollection = await createStoreCollectionAPI(
						currentStoreId,
						collectionData
					);

					// Create mappings for this collection
					const mappings = tempCollection.mappings;
					for (const mapping of mappings) {
						const mappingData =
							mappingFormData[tempCollection.id]?.[mapping.id];
						if (mappingData) {
							await createCollectionMappingAPI(
								currentStoreId,
								newCollection.id,
								mappingData
							);
						}
					}
				}
			}

			// Create any temporary shipping options
			const tempShippingOptions = shippingOptions.filter((option) =>
				option.id.startsWith("temp_shipping_")
			);
			for (const tempShippingOption of tempShippingOptions) {
				const shippingOptionData =
					shippingOptionFormData[tempShippingOption.id];
				if (shippingOptionData) {
					await createShippingOptionAPI(
						currentStoreId,
						shippingOptionData
					);
				}
			}

			setSuccess("Client store created successfully!");

			// Redirect to edit page after a short delay
			setTimeout(() => {
				router.push(`/dashboard/clients/${currentStoreId}`);
			}, 1000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create store"
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto">
			<div className="mb-8">
				<div className="flex items-center space-x-4 mb-4">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/clients">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Clients
						</Link>
					</Button>
				</div>
				<h1 className="text-3xl font-bold text-gray-900">
					New Client Store
				</h1>
				<p className="text-gray-600">
					Add a new client store and configure their data. You will be
					able to upload logo and data files after store creation.
				</p>
			</div>

			{error && (
				<div className="mb-6">
					<Card className="border-red-200 bg-red-50">
						<CardContent className="pt-6">
							<p className="text-red-800">{error}</p>
						</CardContent>
					</Card>
				</div>
			)}

			{success && (
				<div className="mb-6">
					<Card className="border-green-200 bg-green-50">
						<CardContent className="pt-6">
							<p className="text-green-800">{success}</p>
						</CardContent>
					</Card>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Store Information</CardTitle>
						<CardDescription>
							Basic information about the client's store
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="brand_name">
								Store or Brand Name *
							</Label>
							<Input
								id="brand_name"
								type="text"
								value={formData.brand_name}
								onChange={(e) =>
									handleInputChange(
										"brand_name",
										e.target.value
									)
								}
								placeholder="Enter the store or brand name"
								required
							/>
						</div>

						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									handleInputChange(
										"description",
										e.target.value
									)
								}
								placeholder="Briefly describe what they sell in 1-2 sentences"
								rows={3}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Example: "We sell luxury soy candles for women
								who want to elevate their home vibe."
							</p>
						</div>

						<div>
							<Label htmlFor="main_product_category">
								Main Product Category
							</Label>
							<Input
								id="main_product_category"
								type="text"
								value={formData.main_product_category}
								onChange={(e) =>
									handleInputChange(
										"main_product_category",
										e.target.value
									)
								}
								placeholder="e.g., Candles, Nappies, Whey Protein"
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Used for generating collections
							</p>
						</div>

						<div>
							<Label htmlFor="contact_email">Contact Email</Label>
							<Input
								id="contact_email"
								type="email"
								value={formData.contact_email}
								onChange={(e) =>
									handleInputChange(
										"contact_email",
										e.target.value
									)
								}
								placeholder="hello@brand.com"
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Used in the footer and contact forms
							</p>
						</div>

						<div className="space-y-4">
							<Label className="text-base font-medium">
								Store Colors
							</Label>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<Label htmlFor="text_color">
										Text Color
									</Label>
									<div className="flex items-center space-x-2 mt-1">
										<Input
											id="text_color"
											type="color"
											value={formData.text_color}
											onChange={(e) =>
												handleInputChange(
													"text_color",
													e.target.value
												)
											}
											className="w-12 h-10 p-1 border rounded cursor-pointer"
										/>
										<Input
											type="text"
											value={formData.text_color}
											onChange={(e) =>
												handleInputChange(
													"text_color",
													e.target.value
												)
											}
											placeholder="#000000"
											pattern="^#[0-9A-Fa-f]{6}$"
											className="flex-1"
										/>
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										Primary text color
									</p>
								</div>

								<div>
									<Label htmlFor="accent_color">
										Accent Color
									</Label>
									<div className="flex items-center space-x-2 mt-1">
										<Input
											id="accent_color"
											type="color"
											value={formData.accent_color}
											onChange={(e) =>
												handleInputChange(
													"accent_color",
													e.target.value
												)
											}
											className="w-12 h-10 p-1 border rounded cursor-pointer"
										/>
										<Input
											type="text"
											value={formData.accent_color}
											onChange={(e) =>
												handleInputChange(
													"accent_color",
													e.target.value
												)
											}
											placeholder="#3B82F6"
											pattern="^#[0-9A-Fa-f]{6}$"
											className="flex-1"
										/>
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										Brand accent color
									</p>
								</div>

								<div>
									<Label htmlFor="background_color">
										Background Color
									</Label>
									<div className="flex items-center space-x-2 mt-1">
										<Input
											id="background_color"
											type="color"
											value={formData.background_color}
											onChange={(e) =>
												handleInputChange(
													"background_color",
													e.target.value
												)
											}
											className="w-12 h-10 p-1 border rounded cursor-pointer"
										/>
										<Input
											type="text"
											value={formData.background_color}
											onChange={(e) =>
												handleInputChange(
													"background_color",
													e.target.value
												)
											}
											placeholder="#FFFFFF"
											pattern="^#[0-9A-Fa-f]{6}$"
											className="flex-1"
										/>
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										Main background color
									</p>
								</div>
							</div>
						</div>

						<div className="space-y-4">
							<Label className="text-base font-medium">
								Store Fonts
							</Label>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="header_font">
										Header Font
									</Label>
									<Input
										id="header_font"
										type="text"
										value={formData.header_font}
										onChange={(e) =>
											handleInputChange(
												"header_font",
												e.target.value
											)
										}
										placeholder="quicksand_n6"
										className="mt-1"
									/>
									<p className="text-sm text-muted-foreground mt-1">
										Font handle for headings and titles
									</p>
								</div>

								<div>
									<Label htmlFor="body_font">Body Font</Label>
									<Input
										id="body_font"
										type="text"
										value={formData.body_font}
										onChange={(e) =>
											handleInputChange(
												"body_font",
												e.target.value
											)
										}
										placeholder="quicksand_n4"
										className="mt-1"
									/>
									<p className="text-sm text-muted-foreground mt-1">
										Font handle for body text
									</p>
								</div>
							</div>
							<p className="text-sm text-muted-foreground">
								Use font handles from{" "}
								<a
									href="https://shopify.dev/docs/storefronts/themes/architecture/settings/fonts#available-fonts"
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:text-blue-800 underline"
								>
									Shopify's supported fonts
								</a>{" "}
								(e.g., "assistant_n4", "quicksand_n6")
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Product Collections Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Package className="h-5 w-5 mr-2" />
							Product Collections
						</CardTitle>
						<CardDescription>
							Create and manage product collections with mapping
							rules
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{collections.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								<Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
								<p>No collections created yet</p>
								<p className="text-sm">
									Add your first collection to get started
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{collections.map((collection) => (
									<div
										key={collection.id}
										className="border rounded-lg bg-gray-50"
									>
										<div className="p-4">
											<div className="flex items-center justify-between mb-4">
												<div className="flex items-center space-x-2">
													<button
														type="button"
														onClick={() =>
															handleToggleCollection(
																collection.id
															)
														}
														className="p-1 hover:bg-gray-200 rounded"
													>
														{expandedCollections[
															collection.id
														] ? (
															<ChevronUp className="h-4 w-4" />
														) : (
															<ChevronDown className="h-4 w-4" />
														)}
													</button>
													<h4 className="font-medium">
														{collectionFormData[
															collection.id
														]?.title ||
															collection.title}
													</h4>
												</div>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() =>
														handleDeleteCollection(
															collection.id
														)
													}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Remove
												</Button>
											</div>

											{expandedCollections[
												collection.id
											] && (
												<div className="space-y-4">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<Label
																htmlFor={`collection-title-${collection.id}`}
															>
																Collection Title
																*
															</Label>
															<Input
																id={`collection-title-${collection.id}`}
																type="text"
																value={
																	collectionFormData[
																		collection
																			.id
																	]?.title ??
																	collection.title
																}
																onChange={(e) =>
																	handleCollectionInputChange(
																		collection.id,
																		"title",
																		e.target
																			.value
																	)
																}
																placeholder="Collection Name"
															/>
														</div>
														<div>
															<Label
																htmlFor={`collection-description-${collection.id}`}
															>
																Description
															</Label>
															<Input
																id={`collection-description-${collection.id}`}
																type="text"
																value={
																	collectionFormData[
																		collection
																			.id
																	]
																		?.description ??
																	collection.description ??
																	""
																}
																onChange={(e) =>
																	handleCollectionInputChange(
																		collection.id,
																		"description",
																		e.target
																			.value
																	)
																}
																placeholder="Collection description"
															/>
														</div>
													</div>

													<div className="border-t pt-4">
														<div className="flex items-center justify-between mb-3">
															<Label className="text-sm font-medium">
																Mapping Rules
															</Label>
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() =>
																	handleAddMapping(
																		collection.id
																	)
																}
															>
																<Plus className="h-4 w-4 mr-2" />
																Add Mapping
															</Button>
														</div>

														{collection.mappings
															.length === 0 ? (
															<div className="text-center py-4 text-gray-500 text-sm">
																<Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
																<p>
																	No mappings
																	added yet
																</p>
																<p className="text-xs">
																	Add mapping
																	rules to
																	define which
																	products
																	belong to
																	this
																	collection
																</p>
															</div>
														) : (
															<div className="space-y-3">
																{collection.mappings.map(
																	(
																		mapping
																	) => (
																		<div
																			key={
																				mapping.id
																			}
																			className="flex items-center space-x-3 p-3 bg-white rounded border"
																		>
																			<div className="flex-1">
																				<Label className="text-xs text-gray-500">
																					Mapping
																					Type
																				</Label>
																				<select
																					value={
																						mappingFormData[
																							collection
																								.id
																						]?.[
																							mapping
																								.id
																						]
																							?.mapping_type ??
																						mapping.mapping_type
																					}
																					onChange={(
																						e
																					) =>
																						handleMappingInputChange(
																							collection.id,
																							mapping.id,
																							"mapping_type",
																							e
																								.target
																								.value as any
																						)
																					}
																					className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
																				>
																					<option value="product_tag">
																						Product
																						Tag
																					</option>
																					<option value="product_type">
																						Product
																						Type
																					</option>
																					<option value="product_category">
																						Product
																						Category
																					</option>
																				</select>
																			</div>
																			<div className="flex-1">
																				<Label className="text-xs text-gray-500">
																					Value
																				</Label>
																				<Input
																					type="text"
																					value={
																						mappingFormData[
																							collection
																								.id
																						]?.[
																							mapping
																								.id
																						]
																							?.mapping_value ??
																						mapping.mapping_value ??
																						""
																					}
																					onChange={(
																						e
																					) =>
																						handleMappingInputChange(
																							collection.id,
																							mapping.id,
																							"mapping_value",
																							e
																								.target
																								.value
																						)
																					}
																					placeholder="Enter value"
																					className="mt-1 text-sm"
																				/>
																			</div>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={() =>
																					handleDeleteMapping(
																						collection.id,
																						mapping.id
																					)
																				}
																			>
																				<Trash2 className="h-4 w-4" />
																			</Button>
																		</div>
																	)
																)}
															</div>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						)}
						<Button
							type="button"
							variant="outline"
							onClick={handleAddCollection}
							className="w-full"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Collection
						</Button>
					</CardContent>
				</Card>

				{/* Store Locations Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<MapPin className="h-5 w-5 mr-2" />
							Store Locations
						</CardTitle>
						<CardDescription>
							Add one or more store locations for inventory
							management
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{locations.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								<MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
								<p>No locations added yet</p>
								<p className="text-sm">
									Add your first location to get started
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{locations.map((location) => (
									<div
										key={location.id}
										className="p-4 border rounded-lg bg-gray-50 space-y-4"
									>
										<div className="flex items-center justify-between">
											<h4 className="font-medium">
												Location Details
											</h4>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													handleDeleteLocation(
														location.id
													)
												}
											>
												<Trash2 className="h-4 w-4 mr-2" />
												Remove
											</Button>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<Label
													htmlFor={`location-name-${location.id}`}
												>
													Location Name *
												</Label>
												<Input
													id={`location-name-${location.id}`}
													type="text"
													value={
														locationFormData[
															location.id
														]?.name || location.name
													}
													onChange={(e) =>
														handleLocationInputChange(
															location.id,
															"name",
															e.target.value
														)
													}
													placeholder="Main Store"
												/>
											</div>
											<div>
												<Label
													htmlFor={`location-phone-${location.id}`}
												>
													Phone
												</Label>
												<Input
													id={`location-phone-${location.id}`}
													type="tel"
													value={
														locationFormData[
															location.id
														]?.phone ||
														location.phone ||
														""
													}
													onChange={(e) =>
														handleLocationInputChange(
															location.id,
															"phone",
															e.target.value
														)
													}
													placeholder="+1 (555) 123-4567"
												/>
											</div>
											<div>
												<Label
													htmlFor={`location-address-${location.id}`}
												>
													Address
												</Label>
												<Input
													id={`location-address-${location.id}`}
													type="text"
													value={
														locationFormData[
															location.id
														]?.address ||
														location.address ||
														""
													}
													onChange={(e) =>
														handleLocationInputChange(
															location.id,
															"address",
															e.target.value
														)
													}
													placeholder="123 Main Street"
												/>
											</div>
											<div>
												<Label
													htmlFor={`location-city-${location.id}`}
												>
													City
												</Label>
												<Input
													id={`location-city-${location.id}`}
													type="text"
													value={
														locationFormData[
															location.id
														]?.city ||
														location.city ||
														""
													}
													onChange={(e) =>
														handleLocationInputChange(
															location.id,
															"city",
															e.target.value
														)
													}
													placeholder="New York"
												/>
											</div>
											<div>
												<Label
													htmlFor={`location-country-${location.id}`}
												>
													Country Code
												</Label>
												<Input
													id={`location-country-${location.id}`}
													type="text"
													value={
														locationFormData[
															location.id
														]?.country ||
														location.country ||
														""
													}
													onChange={(e) =>
														handleLocationInputChange(
															location.id,
															"country",
															e.target.value
														)
													}
													placeholder="United States"
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
						<Button
							type="button"
							variant="outline"
							onClick={handleAddLocation}
							className="w-full"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Location
						</Button>
					</CardContent>
				</Card>

				{/* Shipping Logistics Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Package className="h-5 w-5 mr-2" />
							Shipping Logistics
						</CardTitle>
						<CardDescription>
							Order processing time and shipping options
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Order Processing Time */}
						<div className="space-y-4">
							<Label className="text-base font-medium">
								Order Processing Time
							</Label>
							<p className="text-sm text-muted-foreground">
								How many business days do you need to process
								orders before shipping?
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="order_processing_min_days">
										Minimum Days *
									</Label>
									<Input
										id="order_processing_min_days"
										type="number"
										min="1"
										value={
											formData.order_processing_min_days ||
											""
										}
										onChange={(e) =>
											handleInputChange(
												"order_processing_min_days",
												e.target.value
											)
										}
										placeholder="1"
									/>
									<p className="text-sm text-muted-foreground mt-1">
										Minimum business days for processing
									</p>
								</div>
								<div>
									<Label htmlFor="order_processing_max_days">
										Maximum Days *
									</Label>
									<Input
										id="order_processing_max_days"
										type="number"
										min="1"
										value={
											formData.order_processing_max_days ||
											""
										}
										onChange={(e) =>
											handleInputChange(
												"order_processing_max_days",
												e.target.value
											)
										}
										placeholder="3"
									/>
									<p className="text-sm text-muted-foreground mt-1">
										Maximum business days for processing
									</p>
								</div>
							</div>
						</div>

						{/* Shipping Options */}
						<div className="space-y-4">
							<Label className="text-base font-medium">
								Shipping Options
							</Label>
							<p className="text-sm text-muted-foreground">
								Add shipping methods with delivery timeframes
							</p>

							{shippingOptions.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
									<p>No shipping options added yet</p>
									<p className="text-sm">
										Add your first shipping option to get
										started
									</p>
								</div>
							) : (
								<div className="space-y-4">
									{shippingOptions.map((shippingOption) => (
										<div
											key={shippingOption.id}
											className="p-4 border rounded-lg bg-gray-50 space-y-4"
										>
											<div className="flex items-center justify-between">
												<h4 className="font-medium">
													Shipping Option Details
												</h4>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() =>
														handleDeleteShippingOption(
															shippingOption.id
														)
													}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Remove
												</Button>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
												<div>
													<Label
														htmlFor={`shipping-name-${shippingOption.id}`}
													>
														Shipping Option Name *
													</Label>
													<Input
														id={`shipping-name-${shippingOption.id}`}
														type="text"
														value={
															shippingOptionFormData[
																shippingOption
																	.id
															]?.name ||
															shippingOption.name
														}
														onChange={(e) =>
															handleShippingOptionInputChange(
																shippingOption.id,
																"name",
																e.target.value
															)
														}
														placeholder="Standard Shipping"
													/>
												</div>
												<div>
													<Label
														htmlFor={`shipping-min-${shippingOption.id}`}
													>
														Minimum Delivery Days *
													</Label>
													<Input
														id={`shipping-min-${shippingOption.id}`}
														type="number"
														min="1"
														value={
															shippingOptionFormData[
																shippingOption
																	.id
															]
																?.delivery_min_days ??
															shippingOption.delivery_min_days ??
															""
														}
														onChange={(e) =>
															handleShippingOptionInputChange(
																shippingOption.id,
																"delivery_min_days",
																e.target
																	.value ===
																	""
																	? ""
																	: parseInt(
																			e
																				.target
																				.value
																	  ) || ""
															)
														}
														placeholder="1"
													/>
												</div>
												<div>
													<Label
														htmlFor={`shipping-max-${shippingOption.id}`}
													>
														Maximum Delivery Days *
													</Label>
													<Input
														id={`shipping-max-${shippingOption.id}`}
														type="number"
														min="1"
														value={
															shippingOptionFormData[
																shippingOption
																	.id
															]
																?.delivery_max_days ??
															shippingOption.delivery_max_days ??
															""
														}
														onChange={(e) =>
															handleShippingOptionInputChange(
																shippingOption.id,
																"delivery_max_days",
																e.target
																	.value ===
																	""
																	? ""
																	: parseInt(
																			e
																				.target
																				.value
																	  ) || ""
															)
														}
														placeholder="5"
													/>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
							<Button
								type="button"
								variant="outline"
								onClick={handleAddShippingOption}
								className="w-full"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Shipping Option
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Legal Information Section */}
				<Card>
					<CardHeader>
						<CardTitle>Legal Information</CardTitle>
						<CardDescription>
							Business and legal information for your store
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="trading_name">
									Trading Name
								</Label>
								<Input
									id="trading_name"
									type="text"
									value={formData.trading_name}
									onChange={(e) =>
										handleInputChange(
											"trading_name",
											e.target.value
										)
									}
									placeholder="Enter your trading name"
								/>
								<p className="text-sm text-muted-foreground mt-1">
									The name under which your business operates
								</p>
							</div>

							<div>
								<Label htmlFor="business_phone">
									Business Phone Number
								</Label>
								<Input
									id="business_phone"
									type="tel"
									value={formData.business_phone}
									onChange={(e) =>
										handleInputChange(
											"business_phone",
											e.target.value
										)
									}
									placeholder="+1 (555) 123-4567"
								/>
								<p className="text-sm text-muted-foreground mt-1">
									Primary business contact number
								</p>
							</div>
						</div>

						<div>
							<Label htmlFor="business_address">
								Business Address
							</Label>
							<Textarea
								id="business_address"
								value={formData.business_address}
								onChange={(e) =>
									handleInputChange(
										"business_address",
										e.target.value
									)
								}
								placeholder="Enter your complete business address"
								rows={3}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Full registered business address
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="business_registration_number">
									Business Registration Number
								</Label>
								<Input
									id="business_registration_number"
									type="text"
									value={
										formData.business_registration_number
									}
									onChange={(e) =>
										handleInputChange(
											"business_registration_number",
											e.target.value
										)
									}
									placeholder="12345678"
								/>
								<p className="text-sm text-muted-foreground mt-1">
									Company or business registration number
								</p>
							</div>

							<div>
								<Label htmlFor="vat_number">VAT Number</Label>
								<Input
									id="vat_number"
									type="text"
									value={formData.vat_number}
									onChange={(e) =>
										handleInputChange(
											"vat_number",
											e.target.value
										)
									}
									placeholder="VAT123456789"
								/>
								<p className="text-sm text-muted-foreground mt-1">
									Value Added Tax registration number
								</p>
							</div>
						</div>

						<div>
							<Label htmlFor="return_address">
								Return Address
							</Label>
							<Textarea
								id="return_address"
								value={formData.return_address}
								onChange={(e) =>
									handleInputChange(
										"return_address",
										e.target.value
									)
								}
								placeholder="Enter the address where customers should return items"
								rows={3}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Address where customers should send returns and
								exchanges
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Store Policies</CardTitle>
						<CardDescription>
							Store policies and legal information for your
							customers
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="return_policy">
								Return and Refund Policy
							</Label>
							<Textarea
								id="return_policy"
								value={formData.return_policy}
								onChange={(e) =>
									handleInputChange(
										"return_policy",
										e.target.value
									)
								}
								placeholder="Enter your return and refund policy..."
								rows={4}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Your policy for returns, exchanges, and refunds
							</p>
						</div>

						<div>
							<Label htmlFor="privacy_policy">
								Privacy Policy
							</Label>
							<Textarea
								id="privacy_policy"
								value={formData.privacy_policy}
								onChange={(e) =>
									handleInputChange(
										"privacy_policy",
										e.target.value
									)
								}
								placeholder="Enter your privacy policy..."
								rows={4}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								How you collect, use, and protect customer data
							</p>
						</div>

						<div>
							<Label htmlFor="terms_of_service">
								Terms of Service
							</Label>
							<Textarea
								id="terms_of_service"
								value={formData.terms_of_service}
								onChange={(e) =>
									handleInputChange(
										"terms_of_service",
										e.target.value
									)
								}
								placeholder="Enter your terms of service..."
								rows={4}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Terms and conditions for using your store
							</p>
						</div>

						<div>
							<Label htmlFor="shipping_policy">
								Shipping Policy
							</Label>
							<Textarea
								id="shipping_policy"
								value={formData.shipping_policy}
								onChange={(e) =>
									handleInputChange(
										"shipping_policy",
										e.target.value
									)
								}
								placeholder="Enter your shipping policy..."
								rows={4}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Shipping methods, costs, and delivery times
							</p>
						</div>

						<div>
							<Label htmlFor="contact_information">
								Contact Information
							</Label>
							<Textarea
								id="contact_information"
								value={formData.contact_information}
								onChange={(e) =>
									handleInputChange(
										"contact_information",
										e.target.value
									)
								}
								placeholder="Enter additional contact information..."
								rows={4}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Additional contact details, business hours,
								support information
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Store Layout Section */}
				<StoreLayoutEditor
					storeLayout={storeLayout}
					onChange={setStoreLayout}
					disabled={isLoading}
				/>

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2"></div>
					<div className="flex space-x-3">
						<Button type="button" variant="outline" asChild>
							<Link href="/dashboard/clients">Cancel</Link>
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								"Creating..."
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Create Store
								</>
							)}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
