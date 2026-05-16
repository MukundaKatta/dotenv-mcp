# dotenv-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/dotenv-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/dotenv-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: parse and serialize `.env`-style files. Backed by the `dotenv`
package on parse; stringify quotes values automatically when they contain
spaces or special characters.

## Tools

- `parse` — `FOO=bar\nMSG="hello world"` → `{ FOO: "bar", MSG: "hello world" }`
- `stringify` — inverse

## Configure

```json
{ "mcpServers": { "dotenv": { "command": "npx", "args": ["-y", "@mukundakatta/dotenv-mcp"] } } }
```

## License

MIT.
