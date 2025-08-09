/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
	output: "standalone",
	webpack: (config, { isServer }) => {
		if (isServer) {
			config.output.path = path.join(process.cwd(), ".next/server");
		}
		return config;
	},
};

module.exports = nextConfig;
