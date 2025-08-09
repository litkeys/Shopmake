// Section presets system with theme support and dynamic imports

import { GENESIS_PRESETS, type GenesisSectionType } from "./genesis";

// Theme registry - add new themes here
export const THEMES = {
	genesis: GENESIS_PRESETS,
} as const;

export type ThemeName = keyof typeof THEMES;
export type SectionType = GenesisSectionType; // Union with other theme types when added

/**
 * Load a section preset for a specific theme and section type
 * @param theme - The theme name (e.g., 'genesis')
 * @param sectionType - The section type (e.g., 'featured-collection')
 * @returns Promise<any> - The section preset data
 */
export async function loadSectionPreset(
	theme: ThemeName,
	sectionType: string
): Promise<any> {
	try {
		const themePresets = THEMES[theme];
		if (!themePresets) {
			console.error(`Theme '${theme}' not found`);
			return {};
		}

		const presetLoader =
			themePresets[sectionType as keyof typeof themePresets];
		if (!presetLoader) {
			console.error(
				`Section type '${sectionType}' not found in theme '${theme}'`
			);
			return {};
		}

		const preset = await presetLoader();
		return preset;
	} catch (error) {
		console.error(
			`Error loading section preset for ${theme}/${sectionType}:`,
			error
		);
		return {};
	}
}

/**
 * Get all available section types for a theme
 * @param theme - The theme name
 * @returns Array of section type names
 */
export function getAvailableSections(theme: ThemeName): string[] {
	const themePresets = THEMES[theme];
	if (!themePresets) {
		return [];
	}
	return Object.keys(themePresets);
}

/**
 * Check if a section type exists in a theme
 * @param theme - The theme name
 * @param sectionType - The section type to check
 * @returns boolean
 */
export function sectionExists(theme: ThemeName, sectionType: string): boolean {
	const themePresets = THEMES[theme];
	if (!themePresets) {
		return false;
	}
	return sectionType in themePresets;
}
