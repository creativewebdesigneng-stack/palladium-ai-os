/**
 * Knowledge upload pipeline (client half).
 *
 * The original file is stored in the private `knowledge` bucket under the
 * caller's own user id — the only prefix their storage policy allows — and the
 * extracted text is sent to the server for chunking and embedding. Documents
 * are never public: reading one later requires a short-lived signed URL minted
 * by `getDocumentUrl`.
 */

import { supabase } from "@/integrations/supabase/client";
import { ingestKnowledgeDocument } from "./memory.functions";
import { extractDocumentText } from "./documentText";

const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name) {
  return (
    (name || "document")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "document"
  );
}

/**
 * Uploads a knowledge document and indexes it.
 * @returns {Promise<{document: object, chunks: number, storedFile: boolean}>}
 */
export async function uploadKnowledgeDocument({
  file,
  title,
  summary,
  agentId,
  orgId,
  scope,
  category,
}) {
  if (file && file.size > MAX_BYTES) {
    throw new Error("That file is larger than 25 MB. Please upload a smaller document.");
  }

  const extracted = file ? await extractDocumentText(file) : "";
  const text = [summary?.trim(), extracted].filter(Boolean).join("\n\n");
  if (!text.trim()) {
    throw new Error(
      "Nothing readable was found in that file. Add a written summary and the document will still be indexed.",
    );
  }

  let storagePath = null;
  if (file) {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new Error("Your session expired. Please sign in again.");

    const path = `${userId}/${Date.now()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from("knowledge")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw new Error(`The file could not be stored: ${error.message}`);
    storagePath = path;
  }

  try {
    const res = await ingestKnowledgeDocument({
      data: {
        title: title?.trim() || file?.name || "Untitled document",
        text,
        agent_id: agentId || null,
        org_id: scope === "private" ? null : orgId || null,
        scope: scope || "private",
        storage_path: storagePath,
        mime_type: file?.type || null,
        size_bytes: file?.size || null,
        source: file?.name || category || "upload",
      },
    });
    return { ...res, storedFile: Boolean(storagePath) };
  } catch (error) {
    // Never leave an orphaned file behind when indexing fails.
    if (storagePath)
      await supabase.storage
        .from("knowledge")
        .remove([storagePath])
        .catch(() => {});
    throw error;
  }
}
