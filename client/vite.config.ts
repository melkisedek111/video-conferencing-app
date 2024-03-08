import path from "path"
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dotenv from "dotenv";

// Load environment variables from .env
const env = dotenv.config().parsed;

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
		"import.meta.env": {
			...env,
      VITE_PRODUCTION_API: process.env.VITE_PRODUCTION_API
		},
	},
})
