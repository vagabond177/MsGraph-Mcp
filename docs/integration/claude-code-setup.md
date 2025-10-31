# Claude Code Setup

**Type:** Procedure
**Purpose:** Configure MsGraph-Mcp in Claude Code
**Audience:** Users integrating MCP server with Claude Code

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration Steps](#configuration-steps)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Prerequisites

**Required:**
- Claude Code installed and working
- MsGraph-Mcp server set up (see `../setup/`)
- Server tested and authenticated

**Check server status:**
```bash
cd ~/RiderProjects/MsGraph-Mcp
npm start
```

**Expected:** Server starts without errors, authentication succeeds

---

## Configuration Steps

### Step 1: Locate Claude Code Config

**Config file location:**
- macOS/Linux: `~/.claude/config.json`
- Windows: `%USERPROFILE%\.claude\config.json`

**If file doesn't exist:** Create it

### Step 2: Add MCP Server Configuration

**Open config file:**
```bash
# macOS/Linux
open ~/.claude/config.json

# Windows
notepad %USERPROFILE%\.claude\config.json
```

**Add MsGraph-Mcp server:**
```json
{
  "mcpServers": {
    "msgraph": {
      "command": "node",
      "args": ["/Users/brock/RiderProjects/MsGraph-Mcp/dist/index.js"],
      "env": {
        "TENANT_ID": "your-tenant-id",
        "CLIENT_ID": "your-client-id",
        "USER_EMAIL": "your-email@tbg.com"
      }
    }
  }
}
```

**Adjust paths:**
- Replace `/Users/brock/` with your home directory
- Windows: Use backslashes or double forward slashes
  - Example: `C:\\Users\\brock\\RiderProjects\\MsGraph-Mcp\\dist\\index.js`
  - Or: `C:/Users/brock/RiderProjects/MsGraph-Mcp/dist/index.js`

**Replace credentials:**
- Use values from your `.env` file
- Same `TENANT_ID`, `CLIENT_ID`, `USER_EMAIL`

### Step 3: Add to Existing Configuration

**If you already have MCP servers configured:**

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": [...]
    },
    "msgraph": {
      "command": "node",
      "args": ["/Users/brock/RiderProjects/MsGraph-Mcp/dist/index.js"],
      "env": {
        "TENANT_ID": "your-tenant-id",
        "CLIENT_ID": "your-client-id",
        "USER_EMAIL": "your-email@tbg.com"
      }
    }
  }
}
```

**Note:** Comma between server definitions

### Step 4: Save Configuration

- Save file
- Close editor

### Step 5: Restart Claude Code

**Restart methods:**
- Quit and reopen Claude Code app
- OR: Use `/restart` command in conversation
- OR: Reload window (if available)

**Why restart needed:** Claude Code loads MCP config on startup

---

## Verification

### Step 1: Check MCP Server Status

**In Claude Code, type:**
```
/mcp
```

**Expected output:**
```
Connected MCP servers:
- msgraph (Microsoft Graph MCP)
  Tools: 4 available
```

**If not listed:**
- Check config.json syntax (valid JSON?)
- Verify file paths are correct
- Ensure server builds successfully
- Check Claude Code console for errors

### Step 2: List Available Tools

**Ask Claude:**
```
What Microsoft Graph tools do you have available?
```

**Expected response:**
Claude should mention:
- `mcp__msgraph__search_emails_by_entities`
- `mcp__msgraph__search_emails`
- `mcp__msgraph__get_email`
- `mcp__msgraph__list_mail_folders`

### Step 3: Test Simple Tool

**Ask Claude:**
```
List my mailbox folders
```

**Expected behavior:**
1. Claude invokes `mcp__msgraph__list_mail_folders`
2. MCP server calls Graph API
3. Results returned to Claude
4. Claude summarizes folders for you

**Successful output:**
```
You have the following mailbox folders:
- Inbox (523 items, 45 unread)
  - Important (87 items)
  - ...
```

### Step 4: Test Batch Tool

**Ask Claude:**
```
Check my email for messages from Acme Corp and TechVentures
mentioning "invoice"
```

**Expected behavior:**
1. Claude invokes `mcp__msgraph__search_emails_by_entities`
2. Parameters: `entities: ["Acme Corp", "TechVentures"], keywords: ["invoice"]`
3. Batch search executed
4. Grouped results returned

**Successful output:**
Claude provides summary of matching emails per company

---

## Troubleshooting

### Error: "Server not found"

**Possible causes:**
- Incorrect path to `index.js`
- Server not built (missing `dist/` folder)
- Wrong home directory path

**Solutions:**
1. Verify path:
```bash
ls /Users/brock/RiderProjects/MsGraph-Mcp/dist/index.js
```

2. Rebuild server:
```bash
cd ~/RiderProjects/MsGraph-Mcp
npm run build
```

3. Use absolute path (no `~` shorthand)

### Error: "Authentication failed"

**Possible causes:**
- Missing or incorrect credentials in config
- Tokens expired
- Azure AD app misconfigured

**Solutions:**
1. Verify credentials in `config.json` match `.env`
2. Test server standalone:
```bash
cd ~/RiderProjects/MsGraph-Mcp
npm start
```
3. Re-authenticate (delete `~/.msgraph-mcp/tokens.json`)
4. Check Azure AD app settings

### Error: "Command not found: node"

**Cause:** Node.js not in PATH or not installed

**Solutions:**
1. Check Node.js installed:
```bash
node --version
```

2. Use full path to node:
```json
{
  "command": "/usr/local/bin/node",
  "args": [...]
}
```

3. Find node location:
```bash
which node
```

### Server Starts but No Tools Available

**Possible causes:**
- Server crashing after start
- Authentication failing silently
- Port conflict

**Solutions:**
1. Check server logs:
```bash
cd ~/RiderProjects/MsGraph-Mcp
LOG_LEVEL=debug npm start
```

2. Verify no errors in Claude Code console
3. Test server independently before MCP integration

### JSON Syntax Error in Config

**Symptom:** Claude Code won't start or shows config error

**Solution:**
1. Validate JSON:
```bash
cat ~/.claude/config.json | python3 -m json.tool
```

2. Common mistakes:
- Missing comma between objects
- Trailing comma after last item
- Unescaped backslashes in Windows paths
- Unmatched braces/brackets

**Use JSON validator:** https://jsonlint.com/

---

## Related Documentation

**Setup:**
- `../setup/prerequisites.md` - System requirements
- `../setup/azure-ad-setup.md` - Azure AD configuration
- `../setup/configuration.md` - Environment variables

**Usage:**
- `usage-examples.md` - How to use tools in conversations

**Troubleshooting:**
- `../reference/troubleshooting.md` - Common issues

**External:**
- [Claude Code MCP Documentation](https://docs.claude.com/claude-code/mcp)

---

**Last Updated:** 2025-10-31
