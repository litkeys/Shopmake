"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
	Upload,
	Trash2,
	ExternalLink,
	Store as StoreIcon,
	Zap,
	Plus,
	MapPin,
	Package,
	ChevronDown,
	ChevronUp,
	Edit,
	Tag,
} from "lucide-react";
import {
	getStoreAPI,
	updateStoreDataAPI,
	uploadFileAPI,
	getStoreUploadsAPI,
	deleteFileAPI,
	generateShopifyStoreAPI,
	generateStoreFoundationAPI,
	generateStoreVisualsAPI,
	generateStoreProductsAPI,
	generateStorePublishAPI,
	processStoreInventoryAPI,
	generateStoreCollectionsAPI,
	generateStoreCustomersAPI,
	updateStorePoliciesAPI,
	connectShopifyStoreAPI,
	disconnectShopifyStoreAPI,
	deleteStoreAPI,
	getStoreLocationsAPI,
	createStoreLocationAPI,
	updateStoreLocationAPI,
	deleteStoreLocationAPI,
	getStoreCollectionsAPI,
	createStoreCollectionAPI,
	updateStoreCollectionAPI,
	deleteStoreCollectionAPI,
	createCollectionMappingAPI,
	updateCollectionMappingAPI,
	deleteCollectionMappingAPI,
} from "@/lib/api";
import {
	Store,
	StoreData,
	StoreFormData,
	Upload as UploadType,
	StoreLocation,
	LocationFormData,
	CollectionWithMappings,
	CollectionFormData,
	MappingFormData,
} from "@/types";
import Link from "next/link";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

interface EditClientPageProps {
	params: {
		clientId: string;
	};
}

export default function EditClientPage({ params }: EditClientPageProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { userId } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generationProgress, setGenerationProgress] = useState({
		currentStep: 0,
		totalSteps: 8,
		stepName: "",
		stepDescription: "",
		percentage: 0,
		canResume: false,
		lastCompletedStep: -1,
	});
	const [generationResults, setGenerationResults] = useState<{
		foundation?: any;
		visuals?: any;
		products?: any;
		publish?: any;
		inventory?: any;
		collections?: any;
		customers?: any;
		policies?: any;
	}>({});
	const [store, setStore] = useState<Store | null>(null);
	const [storeData, setStoreData] = useState<StoreData | null>(null);
	const [uploads, setUploads] = useState<UploadType[]>([]);
	const [locations, setLocations] = useState<StoreLocation[]>([]);
	const [locationFormData, setLocationFormData] = useState<
		Record<string, LocationFormData>
	>({});
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
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showShopifyForm, setShowShopifyForm] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [shopifyFormData, setShopifyFormData] = useState({
		store_domain: "",
		admin_api_token: "",
		token_name: "",
	});

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
		return_policy: "",
		privacy_policy: "",
		terms_of_service: "",
		shipping_policy: "",
		contact_information: "",
	});

	// Debounced form data for auto-save
	const debouncedFormData = useDebounce(formData, 500);
	const debouncedLocationFormData = useDebounce(locationFormData, 500);
	const debouncedCollectionFormData = useDebounce(collectionFormData, 500);
	const debouncedMappingFormData = useDebounce(mappingFormData, 500);

	// Load store data on mount
	useEffect(() => {
		loadStoreData();
	}, [params.clientId]);

	// Handle URL parameters for success/error messages
	useEffect(() => {
		const successParam = searchParams.get("success");
		const errorParam = searchParams.get("error");

		if (successParam === "shopify_connected") {
			setSuccess("Shopify store connected successfully!");
			setTimeout(() => setSuccess(null), 5000);
			// Clean up URL parameters
			router.replace(`/dashboard/clients/${params.clientId}`);
		}

		if (errorParam) {
			const errorMessages: Record<string, string> = {
				shopify_connection_failed:
					"Failed to connect to Shopify. Please try again.",
				invalid_credentials: "Invalid store domain or Admin API token.",
				insufficient_permissions:
					"Admin API token doesn't have required permissions.",
				store_access_denied: "Access denied to store.",
			};

			setError(errorMessages[errorParam] || "An error occurred.");
			setTimeout(() => setError(null), 5000);
			// Clean up URL parameters
			router.replace(`/dashboard/clients/${params.clientId}`);
		}
	}, [searchParams, params.clientId, router]);

	// Auto-save effect
	useEffect(() => {
		if (store && debouncedFormData.brand_name.trim() && !isLoading) {
			handleAutoSave();
		}
	}, [debouncedFormData, store, isLoading]);

	// Auto-save effect for locations
	useEffect(() => {
		if (
			store &&
			!isLoading &&
			Object.keys(debouncedLocationFormData).length > 0
		) {
			handleAutoSaveLocations();
		}
	}, [debouncedLocationFormData, store, isLoading]);

	// Auto-save effect for collections
	useEffect(() => {
		if (
			store &&
			!isLoading &&
			Object.keys(debouncedCollectionFormData).length > 0
		) {
			handleAutoSaveCollections();
		}
	}, [debouncedCollectionFormData, store, isLoading]);

	// Auto-save effect for mappings
	useEffect(() => {
		if (
			store &&
			!isLoading &&
			Object.keys(debouncedMappingFormData).length > 0
		) {
			handleAutoSaveMappings();
		}
	}, [debouncedMappingFormData, store, isLoading]);

	const loadStoreData = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Load store and store data
			const { store: storeResult, storeData: storeDataResult } =
				await getStoreAPI(params.clientId);

			// Check ownership
			if (storeResult.created_by !== userId) {
				setError("You don't have permission to edit this store");
				return;
			}

			setStore(storeResult);

			// Set form data
			if (storeDataResult) {
				setStoreData(storeDataResult);
				setFormData({
					brand_name: storeDataResult.brand_name || storeResult.name,
					description: storeDataResult.description || "",
					main_product_category:
						storeDataResult.main_product_category || "",
					contact_email: storeDataResult.contact_email || "",
					text_color: storeDataResult.text_color || "#000000",
					accent_color: storeDataResult.accent_color || "#3B82F6",
					background_color:
						storeDataResult.background_color || "#FFFFFF",
					header_font: storeDataResult.header_font || "quicksand_n6",
					body_font: storeDataResult.body_font || "quicksand_n4",
					return_policy: storeDataResult.return_policy || "",
					privacy_policy: storeDataResult.privacy_policy || "",
					terms_of_service: storeDataResult.terms_of_service || "",
					shipping_policy: storeDataResult.shipping_policy || "",
					contact_information:
						storeDataResult.contact_information || "",
				});

				// Set logo preview if exists
				if (storeDataResult.logo_url) {
					setLogoPreview(storeDataResult.logo_url);
				}
			} else {
				// No store data yet, use store name
				setFormData({
					brand_name: storeResult.name,
					description: "",
					main_product_category: "",
					contact_email: "",
					text_color: "#000000",
					accent_color: "#3B82F6",
					background_color: "#FFFFFF",
					header_font: "quicksand_n6",
					body_font: "quicksand_n4",
					return_policy: "",
					privacy_policy: "",
					terms_of_service: "",
					shipping_policy: "",
					contact_information: "",
				});
			}

			// Load uploads
			const uploadsResult = await getStoreUploadsAPI(params.clientId);
			setUploads(uploadsResult);

			// Load collections
			const collectionsResult = await getStoreCollectionsAPI(
				params.clientId
			);
			setCollections(collectionsResult);

			// Initialize collection form data
			const initialCollectionFormData: Record<
				string,
				CollectionFormData
			> = {};
			const initialMappingFormData: Record<
				string,
				Record<string, MappingFormData>
			> = {};

			collectionsResult.forEach((collection) => {
				initialCollectionFormData[collection.id] = {
					title: collection.title,
					description: collection.description || "",
				};

				// Initialize mapping form data for this collection
				initialMappingFormData[collection.id] = {};
				collection.mappings.forEach((mapping) => {
					initialMappingFormData[collection.id][mapping.id] = {
						mapping_type: mapping.mapping_type,
						mapping_value: mapping.mapping_value,
					};
				});
			});

			setCollectionFormData(initialCollectionFormData);
			setMappingFormData(initialMappingFormData);

			// Load locations
			const locationsResult = await getStoreLocationsAPI(params.clientId);
			setLocations(locationsResult);

			// Initialize location form data
			const initialLocationFormData: Record<string, LocationFormData> =
				{};
			locationsResult.forEach((location) => {
				initialLocationFormData[location.id] = {
					name: location.name,
					address: location.address || "",
					city: location.city || "",
					country: location.country || "",
					phone: location.phone || "",
				};
			});
			setLocationFormData(initialLocationFormData);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load store data"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAutoSave = useCallback(async () => {
		if (!store || isSaving) return;

		setIsSaving(true);
		try {
			await updateStoreDataAPI(store.id, {
				brand_name: debouncedFormData.brand_name,
				description: debouncedFormData.description,
				main_product_category: debouncedFormData.main_product_category,
				contact_email: debouncedFormData.contact_email,
				text_color: debouncedFormData.text_color,
				accent_color: debouncedFormData.accent_color,
				background_color: debouncedFormData.background_color,
				header_font: debouncedFormData.header_font,
				body_font: debouncedFormData.body_font,
				return_policy: debouncedFormData.return_policy,
				privacy_policy: debouncedFormData.privacy_policy,
				terms_of_service: debouncedFormData.terms_of_service,
				shipping_policy: debouncedFormData.shipping_policy,
				contact_information: debouncedFormData.contact_information,
			});
			setSuccess("Changes saved automatically");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			console.error("Auto-save failed:", err);
		} finally {
			setIsSaving(false);
		}
	}, [store, debouncedFormData, isSaving]);

	const handleAutoSaveLocations = useCallback(async () => {
		if (!store || isSaving) return;

		setIsSaving(true);
		try {
			// Update each location that has changes
			const updatePromises = Object.entries(
				debouncedLocationFormData
			).map(async ([locationId, formData]) => {
				const currentLocation = locations.find(
					(loc) => loc.id === locationId
				);
				if (currentLocation) {
					// Check if there are actual changes
					const hasChanges =
						currentLocation.name !== formData.name ||
						(currentLocation.address || "") !== formData.address ||
						(currentLocation.city || "") !== formData.city ||
						(currentLocation.country || "") !== formData.country ||
						(currentLocation.phone || "") !== formData.phone;

					if (hasChanges) {
						const updatedLocation = await updateStoreLocationAPI(
							store.id,
							locationId,
							formData
						);
						return updatedLocation;
					}
				}
				return null;
			});

			const results = await Promise.all(updatePromises);
			const updatedLocations = results.filter(Boolean);

			if (updatedLocations.length > 0) {
				// Update locations state with the updated data
				setLocations((prevLocations) =>
					prevLocations.map((loc) => {
						const updated = updatedLocations.find(
							(u) => u && u.id === loc.id
						);
						return updated || loc;
					})
				);
				setSuccess("Location changes saved automatically");
				setTimeout(() => setSuccess(null), 2000);
			}
		} catch (err) {
			console.error("Location auto-save failed:", err);
		} finally {
			setIsSaving(false);
		}
	}, [store, debouncedLocationFormData, locations, isSaving]);

	const handleAutoSaveCollections = useCallback(async () => {
		if (!store || isSaving) return;

		setIsSaving(true);
		try {
			// Update each collection that has changes
			const updatePromises = Object.entries(
				debouncedCollectionFormData
			).map(async ([collectionId, formData]) => {
				const currentCollection = collections.find(
					(col) => col.id === collectionId
				);
				if (currentCollection) {
					// Check if there are actual changes (handle empty strings properly)
					const hasChanges =
						currentCollection.title !== formData.title ||
						(currentCollection.description || "") !==
							(formData.description || "");

					if (hasChanges) {
						const updatedCollection =
							await updateStoreCollectionAPI(
								store.id,
								collectionId,
								{
									title: formData.title || "",
									description: formData.description || "",
								}
							);
						return updatedCollection;
					}
				}
				return null;
			});

			const results = await Promise.all(updatePromises);
			const updatedCollections = results.filter(Boolean);

			if (updatedCollections.length > 0) {
				// Update collections state with the updated data
				setCollections((prevCollections) =>
					prevCollections.map((col) => {
						const updated = updatedCollections.find(
							(u) => u && u.id === col.id
						);
						return updated ? { ...col, ...updated } : col;
					})
				);
				setSuccess("Collection changes saved automatically");
				setTimeout(() => setSuccess(null), 2000);
			}
		} catch (err) {
			console.error("Collection auto-save failed:", err);
		} finally {
			setIsSaving(false);
		}
	}, [store, debouncedCollectionFormData, collections, isSaving]);

	const handleAutoSaveMappings = useCallback(async () => {
		if (!store || isSaving) return;

		setIsSaving(true);
		try {
			// Update each mapping that has changes
			const updatePromises = Object.entries(
				debouncedMappingFormData
			).flatMap(([collectionId, mappings]) =>
				Object.entries(mappings).map(async ([mappingId, formData]) => {
					const currentCollection = collections.find(
						(col) => col.id === collectionId
					);
					const currentMapping = currentCollection?.mappings.find(
						(mapping) => mapping.id === mappingId
					);

					if (currentMapping) {
						// Check if there are actual changes (handle empty strings properly)
						const hasChanges =
							currentMapping.mapping_type !==
								formData.mapping_type ||
							(currentMapping.mapping_value || "") !==
								(formData.mapping_value || "");

						if (hasChanges) {
							const updatedMapping =
								await updateCollectionMappingAPI(
									store.id,
									collectionId,
									mappingId,
									{
										mapping_type: formData.mapping_type,
										mapping_value:
											formData.mapping_value || "",
									}
								);
							return { collectionId, updatedMapping };
						}
					}
					return null;
				})
			);

			const results = await Promise.all(updatePromises);
			const updatedMappings = results.filter(Boolean);

			if (updatedMappings.length > 0) {
				// Update collections state with the updated mapping data
				setCollections((prevCollections) =>
					prevCollections.map((col) => {
						const collectionUpdates = updatedMappings.filter(
							(u) => u && u.collectionId === col.id
						);
						if (collectionUpdates.length > 0) {
							return {
								...col,
								mappings: col.mappings.map((mapping) => {
									const updated = collectionUpdates.find(
										(u) =>
											u &&
											u.updatedMapping.id === mapping.id
									);
									return updated
										? updated.updatedMapping
										: mapping;
								}),
							};
						}
						return col;
					})
				);
				setSuccess("Mapping changes saved automatically");
				setTimeout(() => setSuccess(null), 2000);
			}
		} catch (err) {
			console.error("Mapping auto-save failed:", err);
		} finally {
			setIsSaving(false);
		}
	}, [store, debouncedMappingFormData, collections, isSaving]);

	const handleInputChange = (field: keyof StoreFormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleLogoUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file || !store) return;

		// Validate file type
		const allowedTypes = [
			"image/png",
			"image/jpeg",
			"image/jpg",
			"image/svg+xml",
			"image/webp",
			"image/gif",
		];
		if (!allowedTypes.includes(file.type)) {
			setError("Please upload a PNG, JPG, JPEG, SVG, WebP, or GIF file");
			return;
		}

		// Validate file size (5MB limit)
		if (file.size > 5 * 1024 * 1024) {
			setError("Logo file must be less than 5MB");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				setLogoPreview(e.target?.result as string);
			};
			reader.readAsDataURL(file);

			// Upload to Supabase
			const { url } = await uploadFileAPI(store.id, file, "logo");

			// Update store data with logo URL
			await updateStoreDataAPI(store.id, {
				logo_url: url,
			});

			// Refresh uploads
			const uploadsResult = await getStoreUploadsAPI(store.id);
			setUploads(uploadsResult);

			setSuccess("Logo uploaded successfully");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to upload logo"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCsvUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
		type: string
	) => {
		const file = event.target.files?.[0];
		if (!file || !store) return;

		// Validate file type
		if (!file.name.toLowerCase().endsWith(".csv")) {
			setError("Please upload a CSV file");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			await uploadFileAPI(store.id, file, `csv_${type}`);

			// Refresh uploads
			const uploadsResult = await getStoreUploadsAPI(store.id);
			setUploads(uploadsResult);

			setSuccess(`${type} CSV uploaded successfully`);
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to upload CSV"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteFile = async (upload: UploadType) => {
		if (!store) return;

		try {
			setIsLoading(true);
			setError(null);

			await deleteFileAPI(upload.file_path);

			// If it's a logo, clear the preview
			if (upload.file_type === "logo") {
				setLogoPreview(null);
				await updateStoreDataAPI(store.id, {
					logo_url: undefined,
				});
			}

			// Refresh uploads
			const uploadsResult = await getStoreUploadsAPI(store.id);
			setUploads(uploadsResult);

			setSuccess("File deleted successfully");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete file"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!store) return;

		if (!formData.brand_name.trim()) {
			setError("Store name is required");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Save store data
			await updateStoreDataAPI(store.id, {
				brand_name: formData.brand_name,
				description: formData.description,
				main_product_category: formData.main_product_category,
				contact_email: formData.contact_email,
				text_color: formData.text_color,
				accent_color: formData.accent_color,
				background_color: formData.background_color,
				header_font: formData.header_font,
				body_font: formData.body_font,
				return_policy: formData.return_policy,
				privacy_policy: formData.privacy_policy,
				terms_of_service: formData.terms_of_service,
				shipping_policy: formData.shipping_policy,
				contact_information: formData.contact_information,
			});

			setSuccess("Store updated successfully!");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to update store"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const getCsvUploads = (type: string) => {
		return uploads.filter((upload) => upload.file_type === `csv_${type}`);
	};

	// Location management functions
	const handleAddLocation = async () => {
		if (!store) return;

		try {
			const newLocation = await createStoreLocationAPI(store.id, {
				name: "New Location",
				address: "",
				city: "",
				country: "",
				phone: "",
			});
			setLocations([...locations, newLocation]);

			// Add to form data for immediate editing
			setLocationFormData((prev) => ({
				...prev,
				[newLocation.id]: {
					name: newLocation.name,
					address: newLocation.address || "",
					city: newLocation.city || "",
					country: newLocation.country || "",
					phone: newLocation.phone || "",
				},
			}));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to add location"
			);
		}
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

	const handleDeleteLocation = async (locationId: string) => {
		if (!store) return;

		try {
			await deleteStoreLocationAPI(store.id, locationId);
			setLocations(locations.filter((loc) => loc.id !== locationId));

			// Remove from form data
			setLocationFormData((prev) => {
				const updated = { ...prev };
				delete updated[locationId];
				return updated;
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete location"
			);
		}
	};

	// Collection management functions
	const handleAddCollection = async () => {
		if (!store) return;

		try {
			const newCollection = await createStoreCollectionAPI(store.id, {
				title: "New Collection",
				description: "",
			});

			// Add to collections state
			const newCollectionWithMappings = {
				...newCollection,
				mappings: [],
			};
			setCollections([...collections, newCollectionWithMappings]);

			// Add to form data for immediate editing
			setCollectionFormData((prev) => ({
				...prev,
				[newCollection.id]: {
					title: newCollection.title,
					description: newCollection.description || "",
				},
			}));

			// Initialize empty mapping form data
			setMappingFormData((prev) => ({
				...prev,
				[newCollection.id]: {},
			}));

			// Auto-expand the new collection
			setExpandedCollections((prev) => ({
				...prev,
				[newCollection.id]: true,
			}));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to add collection"
			);
		}
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

	const handleDeleteCollection = async (collectionId: string) => {
		if (!store) return;

		try {
			await deleteStoreCollectionAPI(store.id, collectionId);
			setCollections(
				collections.filter((col) => col.id !== collectionId)
			);

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
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to delete collection"
			);
		}
	};

	const handleToggleCollection = (collectionId: string) => {
		setExpandedCollections((prev) => ({
			...prev,
			[collectionId]: !prev[collectionId],
		}));
	};

	const handleAddMapping = async (collectionId: string) => {
		if (!store) return;

		try {
			const newMapping = await createCollectionMappingAPI(
				store.id,
				collectionId,
				{
					mapping_type: "product_tag",
					mapping_value: "",
				}
			);

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
					[newMapping.id]: {
						mapping_type: newMapping.mapping_type,
						mapping_value: newMapping.mapping_value,
					},
				},
			}));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to add mapping"
			);
		}
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

	const handleDeleteMapping = async (
		collectionId: string,
		mappingId: string
	) => {
		if (!store) return;

		try {
			await deleteCollectionMappingAPI(store.id, collectionId, mappingId);

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
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete mapping"
			);
		}
	};

	const handleShopifyConnect = async () => {
		if (!store) return;

		try {
			setIsConnecting(true);
			setError(null);

			const result = await connectShopifyStoreAPI(store.id, {
				store_domain: shopifyFormData.store_domain,
				admin_api_token: shopifyFormData.admin_api_token,
				token_name:
					shopifyFormData.token_name || "Genesis Project Token",
			});

			setSuccess(
				`Shopify store connected successfully! Store: ${result.store_url}`
			);
			setShowShopifyForm(false);
			setShopifyFormData({
				store_domain: "",
				admin_api_token: "",
				token_name: "",
			});

			// Reload store data to get updated Shopify domain
			await loadStoreData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to connect Shopify store"
			);
		} finally {
			setIsConnecting(false);
		}
	};

	const handleGenerateStore = async (resumeFromStep?: number) => {
		if (!store) return;

		// Check if store has a Shopify domain (means it's connected)
		if (!store.shopify_store_domain) {
			// Show the connection form
			setShowShopifyForm(true);
			return;
		}

		// Store is already connected, proceed with chunked generation
		try {
			setIsGenerating(true);
			setError(null);

			const startStep = resumeFromStep || 0;

			// Reset generation progress and results on fresh start (not resuming)
			let currentResults;
			if (resumeFromStep === undefined) {
				resetGenerationProgress();
				currentResults = {};
			} else {
				currentResults = { ...generationResults };
			}

			console.log("Starting store generation for store:", store.id);

			// Step 1: Foundation (Theme, Locations, Branding)
			if (startStep <= 0) {
				setGenerationProgress({
					currentStep: 1,
					totalSteps: 8,
					stepName: "Foundation",
					stepDescription:
						"Setting up theme, locations, and branding...",
					percentage: 1,
					canResume: false,
					lastCompletedStep: -1,
				});

				try {
					const foundationResult = await generateStoreFoundationAPI(
						store.id
					);
					currentResults.foundation = foundationResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 10,
						lastCompletedStep: 0,
						canResume: true,
					}));

					console.log("Foundation completed:", foundationResult);
				} catch (err) {
					console.error("Foundation generation error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: -1,
					}));
					throw new Error(
						`Foundation setup failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 2: Visuals (Theme Colors and Fonts)
			if (startStep <= 1) {
				setGenerationProgress({
					currentStep: 2,
					totalSteps: 8,
					stepName: "Visuals",
					stepDescription: "Updating theme colors and fonts...",
					percentage: 10,
					canResume: true,
					lastCompletedStep: 0,
				});

				try {
					const visualsResult = await generateStoreVisualsAPI(
						store.id
					);
					currentResults.visuals = visualsResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 15,
						lastCompletedStep: 1,
					}));

					console.log("Visuals completed:", visualsResult);
				} catch (err) {
					console.error("Visuals generation error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 0,
					}));
					throw new Error(
						`Visuals setup failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 3: Products (Import, Images, Taxonomy)
			if (startStep <= 2) {
				setGenerationProgress({
					currentStep: 3,
					totalSteps: 8,
					stepName: "Products",
					stepDescription:
						"Importing products, images, and categories...",
					percentage: 15,
					canResume: true,
					lastCompletedStep: 1,
				});

				try {
					const productsResult = await generateStoreProductsAPI(
						store.id
					);
					currentResults.products = productsResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 30,
						lastCompletedStep: 2,
					}));

					console.log("Products completed:", productsResult);
				} catch (err) {
					console.error("Products generation error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 1,
					}));
					throw new Error(
						`Product setup failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 4: Publish (Variants and Publishing)
			if (startStep <= 3) {
				setGenerationProgress({
					currentStep: 4,
					totalSteps: 8,
					stepName: "Publish",
					stepDescription:
						"Adding variants and publishing products...",
					percentage: 30,
					canResume: true,
					lastCompletedStep: 2,
				});

				try {
					const publishResult = await generateStorePublishAPI(
						store.id
					);
					currentResults.publish = publishResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 50,
						lastCompletedStep: 3,
					}));

					console.log("Publish completed:", publishResult);
				} catch (err) {
					console.error("Publish error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 2,
					}));
					throw new Error(
						`Product publishing failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 5: Inventory
			if (startStep <= 4) {
				setGenerationProgress({
					currentStep: 5,
					totalSteps: 8,
					stepName: "Inventory",
					stepDescription: "Adding inventory quantities...",
					percentage: 50,
					canResume: true,
					lastCompletedStep: 3,
				});

				try {
					const inventoryResult = await processStoreInventoryAPI(
						store.id
					);
					currentResults.inventory = inventoryResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 70,
						lastCompletedStep: 4,
					}));

					console.log(
						"Inventory processing completed:",
						inventoryResult
					);
				} catch (err) {
					console.error("Inventory processing error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 3,
					}));
					throw new Error(
						`Store inventory processing failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 6: Collections
			if (startStep <= 5) {
				setGenerationProgress({
					currentStep: 6,
					totalSteps: 8,
					stepName: "Collections",
					stepDescription: "Creating smart collections...",
					percentage: 70,
					canResume: true,
					lastCompletedStep: 4,
				});

				try {
					const collectionsResult = await generateStoreCollectionsAPI(
						store.id
					);
					currentResults.collections = collectionsResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 80,
						lastCompletedStep: 5,
					}));

					console.log(
						"Collections generation completed:",
						collectionsResult
					);
				} catch (err) {
					console.error("Collections generation error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 4,
					}));
					throw new Error(
						`Store collections generation failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 7: Customers
			if (startStep <= 6) {
				setGenerationProgress({
					currentStep: 7,
					totalSteps: 8,
					stepName: "Customers",
					stepDescription: "Importing customers...",
					percentage: 80,
					canResume: true,
					lastCompletedStep: 5,
				});

				try {
					const customersResult = await generateStoreCustomersAPI(
						store.id
					);
					currentResults.customers = customersResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 90,
						lastCompletedStep: 6,
					}));

					console.log("Customers import completed:", customersResult);
				} catch (err) {
					console.error("Customers import error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 5,
					}));
					throw new Error(
						`Customers import failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Step 8: Policies
			if (startStep <= 7) {
				setGenerationProgress({
					currentStep: 8,
					totalSteps: 8,
					stepName: "Policies",
					stepDescription: "Updating store policies...",
					percentage: 95,
					canResume: true,
					lastCompletedStep: 6,
				});

				try {
					const policiesResult = await updateStorePoliciesAPI(
						store.id
					);
					currentResults.policies = policiesResult;
					setGenerationResults(currentResults);

					setGenerationProgress((prev) => ({
						...prev,
						percentage: 100,
						lastCompletedStep: 7,
					}));

					console.log("Policies update completed:", policiesResult);
				} catch (err) {
					console.error("Policies update error:", err);
					setGenerationProgress((prev) => ({
						...prev,
						canResume: true,
						lastCompletedStep: 6,
					}));
					throw new Error(
						`Policies update failed: ${
							err instanceof Error ? err.message : "Unknown error"
						}`
					);
				}
			}

			// Success - all steps completed
			const storeUrl = `https://${store.shopify_store_domain}.myshopify.com`;
			setSuccess(
				`Store generated successfully! Your store is now live at ${storeUrl}`
			);
			setTimeout(() => {
				setSuccess(null);
				// Reset progress after success
				setGenerationProgress({
					currentStep: 0,
					totalSteps: 8,
					stepName: "",
					stepDescription: "",
					percentage: 0,
					canResume: false,
					lastCompletedStep: -1,
				});
			}, 10000);
		} catch (err) {
			console.error("Store generation error:", err);
			setError(
				err instanceof Error ? err.message : "Failed to generate store"
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleDisconnectShopify = async () => {
		if (!store) return;

		try {
			setIsDisconnecting(true);
			setError(null);

			await disconnectShopifyStoreAPI(store.id);

			// Reload store data to get the updated state
			await loadStoreData();

			setSuccess("Store disconnected from Shopify successfully");
			setTimeout(() => setSuccess(null), 5000);
		} catch (err) {
			console.error("Disconnect error:", err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to disconnect store"
			);
		} finally {
			setIsDisconnecting(false);
		}
	};

	const handleDeleteStore = async () => {
		if (!store) return;

		try {
			setIsDeleting(true);
			setError(null);

			await deleteStoreAPI(store.id);

			// Redirect to clients list after successful deletion
			router.push("/dashboard/clients?deleted=true");
		} catch (err) {
			console.error("Delete error:", err);
			setError(
				err instanceof Error ? err.message : "Failed to delete store"
			);
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	const resetGenerationProgress = () => {
		setGenerationProgress({
			currentStep: 0,
			totalSteps: 7,
			stepName: "",
			stepDescription: "",
			percentage: 0,
			canResume: false,
			lastCompletedStep: -1,
		});
		setGenerationResults({});
		setError(null);
		setSuccess(null);
	};

	if (isLoading && !store) {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">
						Loading...
					</h1>
					<p className="text-gray-600">Loading store data...</p>
				</div>
			</div>
		);
	}

	if (error && !store) {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/clients">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Clients
						</Link>
					</Button>
				</div>
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<p className="text-red-800">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

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
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Edit {store?.name}
					</h1>
					<p className="text-gray-600 mb-4">
						Update client store information and files.
					</p>
					<div className="flex items-center space-x-2">
						{store?.shopify_store_domain && (
							<Button variant="outline" asChild>
								<a
									href={`https://${store.shopify_store_domain}.myshopify.com`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<ExternalLink className="h-4 w-4 mr-2" />
									View Store
								</a>
							</Button>
						)}

						{store?.shopify_store_domain && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleDisconnectShopify}
								disabled={isDisconnecting}
							>
								{isDisconnecting
									? "Disconnecting..."
									: "Disconnect Shopify"}
							</Button>
						)}

						<Button
							variant="destructive"
							size="sm"
							onClick={() => setShowDeleteConfirm(true)}
							disabled={isDeleting}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete Store
						</Button>
					</div>
				</div>
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

				<Card>
					<CardHeader>
						<CardTitle>Logo</CardTitle>
						<CardDescription>
							Upload and manage the client's logo
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{logoPreview && (
								<div>
									<Label>Current Logo</Label>
									<div className="mt-2 p-4 border rounded-lg bg-gray-50 flex items-center justify-between">
										<img
											src={logoPreview}
											alt="Current logo"
											className="max-h-32 max-w-48 object-contain"
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												const logoUpload = uploads.find(
													(u) =>
														u.file_type === "logo"
												);
												if (logoUpload)
													handleDeleteFile(
														logoUpload
													);
											}}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Remove
										</Button>
									</div>
								</div>
							)}

							<div>
								<Label htmlFor="logo">
									Upload New Logo (PNG, JPG, JPEG, SVG, WebP,
									GIF)
								</Label>
								<div className="mt-2">
									<input
										id="logo"
										type="file"
										accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif,.png,.jpg,.jpeg,.svg,.webp,.gif"
										onChange={handleLogoUpload}
										className="hidden"
									/>
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											document
												.getElementById("logo")
												?.click()
										}
										disabled={isLoading}
									>
										<Upload className="h-4 w-4 mr-2" />
										{logoPreview
											? "Replace Logo"
											: "Upload Logo"}
									</Button>
									<p className="text-sm text-muted-foreground mt-1">
										PNG files only, up to 5MB
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Data Files</CardTitle>
						<CardDescription>
							Upload and manage CSV files
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Products CSV */}
						<div>
							<Label>Products CSV</Label>
							{getCsvUploads("products").map((upload) => (
								<div
									key={upload.id}
									className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center justify-between"
								>
									<div>
										<p className="font-medium">
											{upload.file_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Uploaded{" "}
											{new Date(
												upload.uploaded_at
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleDeleteFile(upload)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<div className="mt-2">
								<input
									id="products_csv"
									type="file"
									accept=".csv"
									onChange={(e) =>
										handleCsvUpload(e, "products")
									}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										document
											.getElementById("products_csv")
											?.click()
									}
									disabled={isLoading}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Products CSV
								</Button>
							</div>
						</div>

						{/* Customers CSV */}
						<div>
							<Label>Customers CSV</Label>
							{getCsvUploads("customers").map((upload) => (
								<div
									key={upload.id}
									className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center justify-between"
								>
									<div>
										<p className="font-medium">
											{upload.file_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Uploaded{" "}
											{new Date(
												upload.uploaded_at
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleDeleteFile(upload)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<div className="mt-2">
								<input
									id="customers_csv"
									type="file"
									accept=".csv"
									onChange={(e) =>
										handleCsvUpload(e, "customers")
									}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										document
											.getElementById("customers_csv")
											?.click()
									}
									disabled={isLoading}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Customers CSV
								</Button>
							</div>
						</div>

						{/* Inventory CSV */}
						<div>
							<Label>Inventory CSV</Label>
							{getCsvUploads("inventory").map((upload) => (
								<div
									key={upload.id}
									className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center justify-between"
								>
									<div>
										<p className="font-medium">
											{upload.file_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Uploaded{" "}
											{new Date(
												upload.uploaded_at
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleDeleteFile(upload)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<div className="mt-2">
								<input
									id="inventory_csv"
									type="file"
									accept=".csv"
									onChange={(e) =>
										handleCsvUpload(e, "inventory")
									}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										document
											.getElementById("inventory_csv")
											?.click()
									}
									disabled={isLoading}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Inventory CSV
								</Button>
								<p className="text-sm text-muted-foreground mt-1">
									Shopify Inventory CSV export with location
									and stock data
								</p>
							</div>
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
																								.value
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

				{/* Generate Store Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<StoreIcon className="h-5 w-5 mr-2" />
							Generate Shopify Store
						</CardTitle>
						<CardDescription>
							{store?.shopify_store_domain
								? `Connected to ${store.shopify_store_domain}.myshopify.com`
								: "Connect your Shopify Custom App and generate your store with the Genesis theme"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{store?.shopify_store_domain ? (
								<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<svg
												className="h-5 w-5 text-green-400"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-green-800">
												Shopify Store Connected
											</h3>
											<div className="mt-2 text-sm text-green-700">
												<p>
													Your store is connected to{" "}
													<strong>
														{
															store.shopify_store_domain
														}
														.myshopify.com
													</strong>
												</p>
											</div>
										</div>
									</div>
								</div>
							) : showShopifyForm ? (
								<div className="space-y-4">
									<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
										<h3 className="text-sm font-medium text-blue-800 mb-2">
											Connect Your Shopify Custom App
										</h3>
										<p className="text-sm text-blue-700 mb-4">
											Enter your store domain and Admin
											API token from your Shopify Custom
											App.
										</p>
									</div>

									<div>
										<Label htmlFor="store_domain">
											Store Domain *
										</Label>
										<Input
											id="store_domain"
											type="text"
											value={shopifyFormData.store_domain}
											onChange={(e) =>
												setShopifyFormData((prev) => ({
													...prev,
													store_domain:
														e.target.value,
												}))
											}
											placeholder="genesis-project-demo"
										/>
										<p className="text-sm text-muted-foreground mt-1">
											Just the subdomain (without
											.myshopify.com)
										</p>
									</div>

									<div>
										<Label htmlFor="admin_api_token">
											Admin API Token *
										</Label>
										<Input
											id="admin_api_token"
											type="password"
											value={
												shopifyFormData.admin_api_token
											}
											onChange={(e) =>
												setShopifyFormData((prev) => ({
													...prev,
													admin_api_token:
														e.target.value,
												}))
											}
											placeholder="shpat_..."
										/>
										<p className="text-sm text-muted-foreground mt-1">
											From your Custom App in Shopify
											Admin
										</p>
									</div>

									<div>
										<Label htmlFor="token_name">
											Token Name (Optional)
										</Label>
										<Input
											id="token_name"
											type="text"
											value={shopifyFormData.token_name}
											onChange={(e) =>
												setShopifyFormData((prev) => ({
													...prev,
													token_name: e.target.value,
												}))
											}
											placeholder="Genesis Project Token"
										/>
									</div>

									<div className="flex space-x-3">
										<Button
											type="button"
											onClick={handleShopifyConnect}
											disabled={
												isConnecting ||
												!shopifyFormData.store_domain.trim() ||
												!shopifyFormData.admin_api_token.trim()
											}
										>
											{isConnecting ? (
												<>
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
													Connecting...
												</>
											) : (
												"Connect Store"
											)}
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setShowShopifyForm(false)
											}
										>
											Cancel
										</Button>
									</div>
								</div>
							) : (
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<div className="flex">
										<div className="flex-shrink-0">
											<svg
												className="h-5 w-5 text-blue-400"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-blue-800">
												Connect to Shopify
											</h3>
											<div className="mt-2 text-sm text-blue-700">
												<p>
													You'll need to connect your
													Shopify Custom App before
													generating. We'll need your
													store domain and Admin API
													token.
												</p>
											</div>
										</div>
									</div>
								</div>
							)}

							<div className="flex flex-col space-y-3">
								{/* Progress Display */}
								{isGenerating && (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">
												Step{" "}
												{generationProgress.currentStep}{" "}
												of{" "}
												{generationProgress.totalSteps}:{" "}
												{generationProgress.stepName}
											</span>
											<span className="text-sm text-muted-foreground">
												{generationProgress.percentage}%
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-blue-600 h-2 rounded-full transition-all duration-300"
												style={{
													width: `${generationProgress.percentage}%`,
												}}
											></div>
										</div>
										<p className="text-sm text-muted-foreground">
											{generationProgress.stepDescription}
										</p>
									</div>
								)}

								{/* Resume Button for Failed Steps */}
								{!isGenerating &&
									generationProgress.canResume &&
									generationProgress.lastCompletedStep <
										6 && (
										<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm font-medium text-amber-800">
														Generation Paused
													</p>
													<p className="text-sm text-amber-700">
														You can resume from step{" "}
														{generationProgress.lastCompletedStep +
															2}
													</p>
												</div>
												<div className="flex space-x-2">
													<Button
														type="button"
														onClick={() =>
															handleGenerateStore(
																generationProgress.lastCompletedStep +
																	1
															)
														}
														size="sm"
														variant="outline"
														className="border-amber-300 text-amber-700 hover:bg-amber-100"
													>
														Resume
													</Button>
													<Button
														type="button"
														onClick={
															resetGenerationProgress
														}
														size="sm"
														variant="outline"
														className="border-gray-300 text-gray-700 hover:bg-gray-100"
													>
														Reset
													</Button>
												</div>
											</div>
										</div>
									)}

								{/* Main Generation Button */}
								<Button
									type="button"
									onClick={() => handleGenerateStore()}
									disabled={
										isGenerating ||
										!formData.brand_name.trim()
									}
									className="w-full"
									size="lg"
								>
									{isGenerating ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											{generationProgress.stepName
												? `${generationProgress.stepName}...`
												: "Generating Store..."}
										</>
									) : (
										<>
											<Zap className="h-4 w-4 mr-2" />
											{store?.shopify_store_domain
												? "Generate Store"
												: "Connect Custom App & Generate Store"}
										</>
									)}
								</Button>

								{!formData.brand_name.trim() && (
									<p className="text-sm text-muted-foreground text-center">
										Please enter a brand name before
										generating
									</p>
								)}

								{/* Generation Results Summary */}
								{(generationResults.foundation ||
									generationResults.products ||
									generationResults.publish ||
									generationResults.inventory ||
									generationResults.collections ||
									generationResults.customers ||
									generationResults.policies) && (
									<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
										<h4 className="text-sm font-medium text-green-800 mb-2">
											Generation Progress
										</h4>
										<div className="space-y-1 text-sm text-green-700">
											{generationResults.foundation && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Foundation: theme installed,{" "}
													{
														generationResults
															.foundation
															.locations_created
													}{" "}
													locations created
												</div>
											)}
											{generationResults.visuals && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Visuals: theme colors and
													fonts{" "}
													{generationResults.visuals
														.visuals_updated
														? "updated successfully"
														: "update skipped"}
												</div>
											)}
											{generationResults.products && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Products:{" "}
													{
														generationResults
															.products
															.products_created
													}{" "}
													products created, images
													added for{" "}
													{
														generationResults
															.products
															.images_added
													}{" "}
													products
												</div>
											)}
											{generationResults.publish && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Publish: variants published
													for{" "}
													{
														generationResults
															.publish
															.variants_updated
													}{" "}
													products,{" "}
													{
														generationResults
															.publish
															.products_published
													}{" "}
													products published
												</div>
											)}
											{generationResults.inventory && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Inventory:{" "}
													{
														generationResults
															.inventory
															.inventory_updated
													}{" "}
													inventory updated
												</div>
											)}
											{generationResults.collections && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Collections:{" "}
													{
														generationResults
															.collections
															.collections_created
													}{" "}
													collections created
												</div>
											)}
											{generationResults.customers && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Customers:{" "}
													{
														generationResults
															.customers
															.customers_created
													}{" "}
													customers imported
												</div>
											)}
											{generationResults.policies && (
												<div className="flex items-center">
													<svg
														className="h-4 w-4 text-green-500 mr-2"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													Policies:{" "}
													{
														generationResults
															.policies
															.policies_updated
													}{" "}
													policies updated
													{generationResults.policies
														.skipped_policies > 0 &&
														`, ${generationResults.policies.skipped_policies} skipped`}
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						{isSaving && (
							<p className="text-sm text-muted-foreground">
								Saving...
							</p>
						)}
					</div>
					<div className="flex space-x-3">
						<Button type="button" variant="outline" asChild>
							<Link href="/dashboard/clients">
								Back to Clients
							</Link>
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								"Saving..."
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save Changes
								</>
							)}
						</Button>
					</div>
				</div>
			</form>

			{/* Delete Confirmation Dialog */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<Card className="w-full max-w-md mx-4">
						<CardHeader>
							<CardTitle className="text-red-600">
								Delete Store
							</CardTitle>
							<CardDescription>
								This action cannot be undone. This will
								permanently delete the store and all associated
								data.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<p className="text-sm text-gray-600">
									Store: <strong>{store?.name}</strong>
								</p>
								<p className="text-sm text-gray-600">
									This will delete:
								</p>
								<ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
									<li>Store information and settings</li>
									<li>All uploaded files and CSV data</li>
									<li>Shopify connection (if any)</li>
									<li>All associated records</li>
								</ul>
							</div>
						</CardContent>
						<div className="flex space-x-3 p-6 pt-0">
							<Button
								variant="destructive"
								onClick={handleDeleteStore}
								disabled={isDeleting}
								className="flex-1"
							>
								{isDeleting ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="h-4 w-4 mr-2" />
										Yes, Delete Store
									</>
								)}
							</Button>
							<Button
								variant="outline"
								onClick={() => setShowDeleteConfirm(false)}
								disabled={isDeleting}
								className="flex-1"
							>
								Cancel
							</Button>
						</div>
					</Card>
				</div>
			)}
		</div>
	);
}
