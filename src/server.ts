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

export function stringify(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([k, v]) => {
      const s = String(v ?? '');
      if (!NEEDS_QUOTES.test(s)) return `${k}=${s}`;
      // Double-quote with embedded-quote escape; preserve $ literally with backslash.
      const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');
      return `${k}="${escaped}"`;
    })
    .join('\n');
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
