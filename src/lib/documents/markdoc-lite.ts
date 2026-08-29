export type MarkdocPreview = {
  markdown: string;
  tags: string[];
};

const CALLOUT_OPEN = /{%\s*callout(?:\s+type=["']?([a-zA-Z0-9_-]+)["']?)?\s*%}/g;
const CALLOUT_CLOSE = /{%\s*\/callout\s*%}/g;
const BADGE = /{%\s*badge\s+text=["']([^"']{1,120})["']\s*%}/g;

/**
 * A deliberately small, safe subset of Markdoc-style tags for PalladiumAI
 * document previews. It converts supported tags to ordinary Markdown before
 * react-markdown renders them, so no arbitrary HTML/JS or tag execution is
 * introduced into the existing Documents surface.
 */
export function transformMarkdocPreview(source: string): MarkdocPreview {
  const tags = new Set<string>();
  let markdown = source;

  markdown = markdown.replace(CALLOUT_OPEN, (_match, type: string | undefined) => {
    tags.add('callout');
    const label = escapeMarkdownInline((type || 'note').replaceAll('-', ' '));
    return `\n> **${label.toUpperCase()}**\n> `;
  });
  markdown = markdown.replace(CALLOUT_CLOSE, () => {
    tags.add('callout');
    return '\n';
  });
  markdown = markdown.replace(BADGE, (_match, text: string) => {
    tags.add('badge');
    return `**[${escapeMarkdownInline(text)}]**`;
  });

  // Keep unsupported Markdoc syntax visible rather than executing or silently
  // discarding it. Users can still edit/save the original body unchanged.
  return { markdown, tags: [...tags].sort() };
}

function escapeMarkdownInline(value: string) {
  return value.replace(/[\\`*_{}\[\]()#+.!|>~-]/g, '\\$&');
}
