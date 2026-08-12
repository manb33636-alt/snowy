import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

/* `npm run build`          -> normale build in dist/
   `npm run build:single`   -> alles in één losse HTML in dist-single/,
                               te openen door er dubbel op te klikken. */
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    build: single ? { outDir: "dist-single", assetsInlineLimit: 100000000 } : {},
  };
});
