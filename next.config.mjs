import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fija la raíz de Turbopack a este proyecto para evitar conflicto
  // con otros lockfiles detectados en directorios superiores (os error 5)
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
