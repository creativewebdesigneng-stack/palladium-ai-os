import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "png","jpg","jpeg","webp","avif",
  "glb","gltf","fbx","obj","usd","usdz","ply","stl","vox"
]);

function safeName(name) {
  return ((name || "asset").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(-100) || "asset");
}

export async function uploadGameFoundrySource(file) {
  if (!file) throw new Error("Choose an image or model file first.");
  if (file.size > MAX_BYTES) throw new Error("Game Foundry uploads are limited to 100 MB.");
  const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Unsupported Game Foundry upload type.");

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Your session expired. Please sign in again.");

  const path = `${userId}/sources/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from("game-foundry").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`The Game Foundry source could not be uploaded: ${error.message}`);
  return { storagePath:path, fileName:file.name, size:file.size, mimeType:file.type || null };
}
