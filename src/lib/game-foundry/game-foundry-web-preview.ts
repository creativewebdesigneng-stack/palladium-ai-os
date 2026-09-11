type SourceFile = { path?: unknown; content?: unknown };
type SourceManifest = { files?: unknown };

const MAX_PREVIEW_BYTES = 250_000;
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; child-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

function filesFrom(manifest: unknown): Array<{path:string;content:string}> {
  if (!manifest || typeof manifest !== "object") return [];
  const raw = (manifest as SourceManifest).files;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const file = entry as SourceFile;
    if (typeof file.path !== "string" || typeof file.content !== "string") return [];
    return [{ path:file.path.replace(/^\/+/, ""), content:file.content }];
  });
}

function escapeScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function escapeStyle(value: string) {
  return value.replace(/<\/style/gi, "<\\/style");
}

export function buildGameFoundryWebPreviewDocument(sourceManifest: unknown) {
  const files = filesFrom(sourceManifest);
  const html = files.find((file) => /(^|\/)index\.html$/i.test(file.path));
  if (!html) throw new Error("The Web game source must include index.html before it can be previewed.");

  const css = files.filter((file) => /\.css$/i.test(file.path)).map((file) => escapeStyle(file.content)).join("\n\n");
  const js = files.filter((file) => /\.(?:js|mjs)$/i.test(file.path)).map((file) => escapeScript(file.content)).join("\n\n");

  const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
  const additions = `${css ? `<style>\n${css}\n</style>` : ""}${js ? `<script>\n${js}\n<\/script>` : ""}`;

  let output = html.content;
  if (/<head(?:\s[^>]*)?>/i.test(output)) {
    output = output.replace(/<head(?:\s[^>]*)?>/i, (match) => `${match}${meta}`);
  } else {
    output = `<!doctype html><html><head>${meta}</head><body>${output}</body></html>`;
  }
  if (/<\/body>/i.test(output)) output = output.replace(/<\/body>/i, `${additions}</body>`);
  else output += additions;

  if (new TextEncoder().encode(output).byteLength > MAX_PREVIEW_BYTES) throw new Error("The generated Web preview exceeds Blackstar's 250 KB preview safety limit.");
  return output;
}
