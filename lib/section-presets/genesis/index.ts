// Genesis theme section presets - Dynamic imports for Vercel compatibility

export const GENESIS_PRESETS = {
	async collage() {
		return (await import("./collage.json")).default;
	},
	async "collection-list"() {
		return (await import("./collection-list.json")).default;
	},
	async "featured-blog"() {
		return (await import("./featured-blog.json")).default;
	},
	async "featured-collection"() {
		return (await import("./featured-collection.json")).default;
	},
	async "icon-bar"() {
		return (await import("./icon-bar.json")).default;
	},
	async "image-banner"() {
		return (await import("./image-banner.json")).default;
	},
	async "image-slider"() {
		return (await import("./image-slider.json")).default;
	},
	async "image-with-text"() {
		return (await import("./image-with-text.json")).default;
	},
	async "main-article"() {
		return (await import("./main-article.json")).default;
	},
	async "main-blog"() {
		return (await import("./main-blog.json")).default;
	},
	async "main-collection-banner"() {
		return (await import("./main-collection-banner.json")).default;
	},
	async "main-collection-product-grid"() {
		return (await import("./main-collection-product-grid.json")).default;
	},
	async "main-list-collections"() {
		return (await import("./main-list-collections.json")).default;
	},
	async "main-product"() {
		return (await import("./main-product.json")).default;
	},
	async multicolumn() {
		return (await import("./multicolumn.json")).default;
	},
	async "related-products"() {
		return (await import("./related-products.json")).default;
	},
	async results() {
		return (await import("./results.json")).default;
	},
	async "rich-text"() {
		return (await import("./rich-text.json")).default;
	},
	async "slideshow-hero"() {
		return (await import("./slideshow-hero.json")).default;
	},
	async testimonials() {
		return (await import("./testimonials.json")).default;
	},
	async video() {
		return (await import("./video.json")).default;
	},
};

export type GenesisSectionType = keyof typeof GENESIS_PRESETS;
