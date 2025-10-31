# Configuration

**Type:** Procedure
**Purpose:** Configure MsGraph-Mcp environment
**Audience:** Users completing setup after Azure AD app registration

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration File Setup](#configuration-file-setup)
- [Verification](#verification)
- [Advanced Configuration](#advanced-configuration)
- [Related Documentation](#related-documentation)

---

## Environment Variables

### Required Variables

MsGraph-Mcp requires these environment variables:

| Variable | Description | Example | Source |
|----------|-------------|---------|--------|
| `TENANT_ID` | Azure AD tenant ID | `abc123...` | Azure portal |
| `CLIENT_ID` | App registration client ID | `def456...` | Azure portal |
| `USER_EMAIL` | Your M365 email address | `brock@tbg.com` | Your account |

**Where these come from:** See `azure-ad-setup.md` for collection steps

### Optional Variables

| Variable | Description | Default | When to Use |
|----------|-------------|---------|-------------|
| `REDIRECT_PORT` | OAuth callback port | `3000` | If port 3000 is unavailable |
| `TOKEN_STORAGE_PATH` | Token file location | `~/.msgraph-mcp/` | Custom storage location |
| `LOG_LEVEL` | Logging verbosity | `info` | Debugging (`debug`) or production (`warn`) |
| `API_TIMEOUT` | Graph API timeout (ms) | `30000` | Slow networks |

---

## Configuration File Setup

### Step 1: Create .env File

1. Navigate to project directory:
```bash
cd ~/RiderProjects/MsGraph-Mcp
```

2. Create `.env` file:
```bash
touch .env
```

3. Open in editor:
```bash
# macOS
open .env

# Linux
nano .env

# Windows
notepad .env
```

### Step 2: Add Required Values

Copy this template and fill in your values:

```env
# Azure AD Configuration
TENANT_ID=your-tenant-id-here
CLIENT_ID=your-client-id-here

# User Configuration
USER_EMAIL=your-email@your-domain.com

# Optional: Uncomment and customize if needed
# REDIRECT_PORT=3000
# TOKEN_STORAGE_PATH=~/.msgraph-mcp/
# LOG_LEVEL=info
# API_TIMEOUT=30000
```

### Step 3: Replace Placeholders

**Replace these values:**
- `your-tenant-id-here` → Paste Tenant ID from Azure portal
- `your-client-id-here` → Paste Client ID from Azure portal
- `your-email@your-domain.com` → Your M365 email address

**Example (filled in):**
```env
TENANT_ID=a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890
CLIENT_ID=f1e2d3c4-b5a6-9876-f1e2-d3c4b5a69876
USER_EMAIL=brock@tbg.com
```

### Step 4: Save File

- Save and close editor
- **Important:** Never commit `.env` to git
- `.gitignore` already includes `.env` (verified during setup)

---

## Verification

### Step 1: Verify File Exists

```bash
ls -la .env
```

**Expected:** File exists with restricted permissions

**If not found:**
- Ensure you're in project root directory
- Check you saved the file

### Step 2: Check File Permissions

```bash
# macOS/Linux
chmod 600 .env
ls -l .env
```

**Expected:** `-rw-------` (only you can read/write)

**Windows:**
```powershell
icacls .env /grant:r "$env:USERNAME:(R,W)" /inheritance:r
```

### Step 3: Verify Values Loaded

**Test configuration:**
```bash
npm run verify-config
```

**Expected output:**
```
✓ TENANT_ID configured
✓ CLIENT_ID configured
✓ USER_EMAIL configured
✓ Configuration valid
```

**If errors:**
- Check spelling of variable names (case-sensitive)
- Verify no extra spaces around `=`
- Ensure UUIDs are complete (36 characters)
- Confirm email address format is valid

### Step 4: Test Authentication

```bash
npm start
```

**Expected flow:**
1. Server starts
2. Browser opens to Microsoft login
3. You sign in and grant permissions
4. Browser redirects to "Success" page
5. Server confirms authentication

**If authentication fails:** See `../reference/troubleshooting.md`

---

## Advanced Configuration

### Custom Token Storage

**Default location:** `~/.msgraph-mcp/tokens.json`

**Change location:**
```env
TOKEN_STORAGE_PATH=/path/to/custom/location/
```

**Use case:**
- Encrypted volume for extra security
- Shared network drive (not recommended)
- Different user profile directory

**Permissions:** Ensure directory is readable/writable by your user

### Custom Redirect Port

**Default port:** 3000

**Change port:**
```env
REDIRECT_PORT=8080
```

**Important:** Must also update in Azure AD:
1. Go to app registration
2. Authentication → Redirect URIs
3. Change to `http://localhost:8080/auth/callback`
4. Save

### Logging Configuration

**Log levels:**
- `error` - Only errors
- `warn` - Errors and warnings (recommended for production)
- `info` - Normal operational messages (default)
- `debug` - Detailed debugging information

**Set level:**
```env
LOG_LEVEL=debug
```

**Use cases:**
- Development: `debug`
- Production: `warn`
- Troubleshooting: `debug`

**Log location:** stdout (console)

### API Timeout

**Default:** 30 seconds (30000ms)

**Increase for slow networks:**
```env
API_TIMEOUT=60000
```

**Decrease for faster failure:**
```env
API_TIMEOUT=10000
```

**Note:** Microsoft Graph typically responds within 5 seconds

---

## Related Documentation

**Setup:**
- `prerequisites.md` - System requirements
- `azure-ad-setup.md` - How to get TENANT_ID and CLIENT_ID

**Next steps:**
- `../integration/claude-code-setup.md` - Configure MCP in Claude Code
- `../integration/usage-examples.md` - Start using the tools

**Architecture:**
- `../architecture/authentication.md` - How authentication works

**Troubleshooting:**
- `../reference/troubleshooting.md` - Configuration issues

---

**Last Updated:** 2025-10-31
