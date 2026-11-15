import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las acciones aceptan 1 MB por defecto; la imagen de un producto puede pesar 2 MB más el resto del formulario.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
