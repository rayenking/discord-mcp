import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ToolModule } from "./types.js";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);
const DOWNLOAD_DIR = join(tmpdir(), "discord-mcp-downloads");

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_download_attachment",
    description:
      "Download a Discord attachment from a CDN URL to a local temp file. Only accepts URLs from cdn.discordapp.com or media.discordapp.net.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description:
            "The Discord CDN URL to download (must be from cdn.discordapp.com or media.discordapp.net).",
        },
        filename: {
          type: "string",
          description:
            "Optional filename to save as. Defaults to the original filename from the URL.",
        },
      },
      required: ["url"],
    },
  },
];

function extractFilename(urlPath: string): string {
  const segments = urlPath.split("/");
  const last = segments[segments.length - 1] || "attachment";
  return last.split("?")[0] || "attachment";
}

const handlers: ToolModule["handlers"] = {
  async discord_download_attachment(args) {
    const url = args.url as string;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return {
        content: [{ type: "text" as const, text: "Invalid URL provided." }],
        isError: true,
      };
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Rejected: hostname "${parsed.hostname}" is not an allowed Discord CDN domain. Only cdn.discordapp.com and media.discordapp.net are permitted.`,
          },
        ],
        isError: true,
      };
    }

    const filename =
      (args.filename as string | undefined) || extractFilename(parsed.pathname);

    mkdirSync(DOWNLOAD_DIR, { recursive: true });

    const response = await fetch(url);
    if (!response.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Download failed: HTTP ${response.status} ${response.statusText}`,
          },
        ],
        isError: true,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = join(DOWNLOAD_DIR, filename);
    writeFileSync(filePath, buffer);

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    return text({
      path: filePath,
      size: buffer.length,
      contentType,
    });
  },
};

export const attachmentsModule: ToolModule = { definitions, handlers };
