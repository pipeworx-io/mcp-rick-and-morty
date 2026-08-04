# mcp-rick-and-morty

Rick and Morty MCP — wraps the Rick and Morty API (free, no auth)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_characters` | Search Rick and Morty characters by name with optional filters for status (alive/dead/unknown), species (Human/Alien/etc.), and gender. Returns up to 20 matching characters per page with status, species, origin, current location, and episode appearances. |
| `get_character` | Get a single Rick and Morty character by numeric ID. Returns name, status, species, origin, current location, episode appearances, and image URL. |
| `search_episodes` | Search Rick and Morty episodes by name or episode code (S01E03 style). Returns episode metadata including air date, character list, and ID. |
| `get_episode` | Get a single Rick and Morty episode by numeric ID. Returns title, code (e.g. "S01E03"), air date, and the list of characters that appear. |
| `get_location` | Get a single Rick and Morty location/planet/dimension by ID. Returns name, type, dimension, and residents. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "rick-and-morty": {
      "url": "https://gateway.pipeworx.io/rick-and-morty/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Rick And Morty data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
