#!/usr/bin/env node
/**
 * dotenv MCP server. Two tools: `parse`, `stringify`.
 *
 * Parse `.env`-style files (KEY=value, optional quotes, # comments) into a
 * map, and stringify back. Quoting is applied automatically on stringify
 * when values contain spaces or special chars.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parse as dotenvParse } from 'dotenv';

const VERSION = '0.1.0';

export function parse(text: string): Record<string, string> {
  return dotenvParse(Buffer.from(text)) as unknown as Record<string, string>;
}

const NEEDS_QUOTES = /[\s"'`$#=]/;
// Inside double quotes, dotenv's parser only un-escapes \n and \r; backslash,
// double quote, $ and backtick all stay literal. So a value containing any of
// those cannot be round-tripped with double quotes (there is no backslash
// escape to recover). Such values fall back to single quotes, which dotenv
// treats as fully literal (only the outer quotes are stripped).
const DQ_UNSAFE = /[\\"$`]/;

export function stringify(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([k, v]) => {
      const s = String(v ?? '');
      // Unquoted only when there is nothing dotenv would interpret, including
      // backslashes (a bare `\n` would be read back as a newline by dotenv).
      if (s !== '' && !NEEDS_QUOTES.test(s) && !s.includes('\\')) return `${k}=${s}`;

      const hasNewline = /[\r\n]/.test(s);
      if (!DQ_UNSAFE.test(s)) {
        // Safe to double-quote: only newlines need encoding (dotenv restores
        // them); the previous \\, \" and \$ escapes were wrong because dotenv
        // never un-escapes them and would corrupt the value on parse.
        return `${k}="${encodeNewlines(s)}"`;
      }
      // dotenv-unsafe characters present. Single quotes are fully literal and
      // round-trip safely as long as there is no embedded single quote and no
      // newline (a single-quoted newline would split the line on re-parse).
      if (!s.includes("'") && !hasNewline) return `${k}='${s}'`;
      // Last resort (e.g. an embedded single quote): double-quote and encode
      // newlines. Remaining literal backslashes/quotes round-trip as-is.
      return `${k}="${encodeNewlines(s)}"`;
    })
    .join('\n');
}

function encodeNewlines(s: string): string {
  return s.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

const server = new Server({ name: 'dotenv', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'parse',
    description: 'Parse a .env-style text into a string map. Handles quotes and # comments.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'stringify',
    description: 'Serialize a string map back to .env format. Quoting applied automatically.',
    inputSchema: {
      type: 'object',
      properties: { env: { type: 'object', additionalProperties: { type: 'string' } } },
      required: ['env'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'parse') {
      const a = args as unknown as { text: string };
      return jsonResult({ env: parse(a.text) });
    }
    if (name === 'stringify') {
      const a = args as unknown as { env: Record<string, string> };
      return textResult(stringify(a.env));
    }
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('dotenv failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function textResult(text: string) {
  return { content: [{ type: 'text', text }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`dotenv MCP server v${VERSION} ready on stdio\n`);
}
