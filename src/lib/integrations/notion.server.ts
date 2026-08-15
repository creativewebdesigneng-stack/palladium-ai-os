/**
 * Notion provider executor. Server-only and read-only.
 *
 * Exposes bounded workspace page search and bounded page/block text extraction.
 * No create, update, archive/trash or delete operations are implemented here.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2026-03-11";
const MAX_PAGE_SIZE = 50;
const MAX_BLOCKS = 200;
const MAX_DEPTH = 3;
const MAX_TEXT_CHARS = 40_000;

type FetchLike = typeof fetch;

type NotionRichText = { plain_text?: unknown };

export class NotionIntegrationError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "NotionIntegrationError";
  }
}

async function notionFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const token = await getIntegrationAccessToken(userId, "notion");
  if (!token) {
    throw new NotionIntegrationError(
      "Notion is not connected, or the connection needs to be renewed.",
      401,
    );
  }

  const response = await fetchImpl(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Notion-Version": NOTION_VERSION,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  if (response.ok) return response;

  let reason = "Notion request failed.";
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    reason = String(payload["message"] ?? payload["code"] ?? reason);
  } catch {
    /* provider error body is optional */
  }
  throw new NotionIntegrationError(reason.slice(0, 300), response.status);
}

function boundedQuery(value: string): string {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function richTextPlain(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .slice(0, 100)
    .map((item) => {
      const plain = (item as NotionRichText | null)?.plain_text;
      return typeof plain === "string" ? plain : "";
    })
    .join("")
    .slice(0, 10_000);
}

function pageTitle(page: any): string {
  const properties = page?.properties;
  if (properties && typeof properties === "object") {
    for (const value of Object.values(properties as Record<string, any>).slice(0, 100)) {
      if (value?.type === "title") {
        const title = richTextPlain(value?.title);
        if (title) return title.slice(0, 500);
      }
    }
  }
  return "Untitled page";
}

export type NotionPageResult = {
  id: string;
  title: string;
  url: string | null;
  createdTime: string | null;
  lastEditedTime: string | null;
  inTrash: boolean;
};

export async function searchNotionPages(args: {
  userId: string;
  query: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<{ pages: NotionPageResult[]; hasMore: boolean; nextCursor: string | null }> {
  const query = boundedQuery(args.query);
  if (!query) throw new NotionIntegrationError("A Notion page search query is required.");
  const limit = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), MAX_PAGE_SIZE);
  const response = await notionFetch(
    args.userId,
    "/search",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        page_size: limit,
        filter: { property: "object", value: "page" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
      }),
      ...(args.signal ? { signal: args.signal } : {}),
    },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return {
    pages: results.slice(0, limit).map((page: any) => ({
      id: String(page?.id ?? "").slice(0, 100),
      title: pageTitle(page),
      url: typeof page?.url === "string" ? page.url.slice(0, 2000) : null,
      createdTime: typeof page?.created_time === "string" ? page.created_time : null,
      lastEditedTime: typeof page?.last_edited_time === "string" ? page.last_edited_time : null,
      inTrash: page?.in_trash === true,
    })),
    hasMore: payload?.has_more === true,
    nextCursor: typeof payload?.next_cursor === "string" ? payload.next_cursor.slice(0, 200) : null,
  };
}

function validateNotionId(value: string): string {
  const id = String(value ?? "").trim();
  if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) {
    throw new NotionIntegrationError("A valid Notion page ID is required.");
  }
  return id;
}

function blockText(block: any): string {
  const type = typeof block?.type === "string" ? block.type : "";
  const data = type && block?.[type] && typeof block[type] === "object" ? block[type] : null;
  if (!data) return "";
  const rich = richTextPlain(data.rich_text ?? data.caption ?? data.title);
  if (rich) return rich;
  if (typeof data.expression === "string") return data.expression.slice(0, 5000);
  if (typeof data.url === "string") return data.url.slice(0, 2000);
  return "";
}

async function collectBlockText(args: {
  userId: string;
  blockId: string;
  depth: number;
  state: { blocks: number; chars: number; chunks: string[] };
  signal?: AbortSignal;
  fetchImpl: FetchLike;
}): Promise<void> {
  if (args.depth > MAX_DEPTH || args.state.blocks >= MAX_BLOCKS || args.state.chars >= MAX_TEXT_CHARS) return;

  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (cursor) params.set("start_cursor", cursor);
    const response = await notionFetch(
      args.userId,
      `/blocks/${encodeURIComponent(args.blockId)}/children?${params.toString()}`,
      { method: "GET", ...(args.signal ? { signal: args.signal } : {}) },
      args.fetchImpl,
    );
    const payload = (await response.json()) as any;
    const blocks = Array.isArray(payload?.results) ? payload.results : [];

    for (const block of blocks) {
      if (args.state.blocks >= MAX_BLOCKS || args.state.chars >= MAX_TEXT_CHARS) break;
      args.state.blocks += 1;
      const text = blockText(block).trim();
      if (text) {
        const remaining = MAX_TEXT_CHARS - args.state.chars;
        const bounded = text.slice(0, remaining);
        args.state.chunks.push(bounded);
        args.state.chars += bounded.length;
      }
      if (block?.has_children === true && args.depth < MAX_DEPTH) {
        const childId = String(block?.id ?? "");
        if (childId) {
          await collectBlockText({
            ...args,
            blockId: childId,
            depth: args.depth + 1,
          });
        }
      }
    }

    cursor =
      args.state.blocks < MAX_BLOCKS &&
      args.state.chars < MAX_TEXT_CHARS &&
      payload?.has_more === true &&
      typeof payload?.next_cursor === "string"
        ? payload.next_cursor
        : null;
  } while (cursor);
}

export type NotionPageContent = {
  id: string;
  title: string;
  url: string | null;
  lastEditedTime: string | null;
  text: string;
  blockCount: number;
  truncated: boolean;
};

export async function readNotionPage(args: {
  userId: string;
  pageId: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<NotionPageContent> {
  const pageId = validateNotionId(args.pageId);
  const fetchImpl = args.fetchImpl ?? fetch;
  const pageResponse = await notionFetch(
    args.userId,
    `/pages/${encodeURIComponent(pageId)}`,
    { method: "GET", ...(args.signal ? { signal: args.signal } : {}) },
    fetchImpl,
  );
  const page = (await pageResponse.json()) as any;
  if (page?.in_trash === true) throw new NotionIntegrationError("That Notion page is in the trash.", 410);

  const state = { blocks: 0, chars: 0, chunks: [] as string[] };
  await collectBlockText({
    userId: args.userId,
    blockId: pageId,
    depth: 0,
    state,
    ...(args.signal ? { signal: args.signal } : {}),
    fetchImpl,
  });

  return {
    id: String(page?.id ?? pageId).slice(0, 100),
    title: pageTitle(page),
    url: typeof page?.url === "string" ? page.url.slice(0, 2000) : null,
    lastEditedTime: typeof page?.last_edited_time === "string" ? page.last_edited_time : null,
    text: state.chunks.join("\n").slice(0, MAX_TEXT_CHARS),
    blockCount: state.blocks,
    truncated: state.blocks >= MAX_BLOCKS || state.chars >= MAX_TEXT_CHARS,
  };
}
