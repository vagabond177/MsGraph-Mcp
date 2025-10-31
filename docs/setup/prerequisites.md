# Prerequisites

**Type:** Procedure
**Purpose:** Verify system requirements before installation
**Audience:** First-time users setting up MsGraph-Mcp

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Microsoft 365 Requirements](#microsoft-365-requirements)
- [Development Tools](#development-tools)
- [Verification Steps](#verification-steps)
- [Related Documentation](#related-documentation)

---

## System Requirements

### Operating System

**Supported:**
- macOS 10.15+ (Catalina or later)
- Windows 10/11
- Linux (Ubuntu 20.04+, Debian 11+, or equivalent)

**Note:** Any OS that supports Node.js 18+ should work

### Node.js

**Required version:** Node.js 18.0.0 or later

**Check version:**
```bash
node --version
```

**Expected output:** `v18.x.x` or higher

**Install Node.js:**
- Download from [nodejs.org](https://nodejs.org/)
- Use nvm: `nvm install 18`
- Use package manager:
  - macOS: `brew install node`
  - Windows: `choco install nodejs`
  - Linux: `sudo apt install nodejs`

### npm or Yarn

**npm** (comes with Node.js)
```bash
npm --version
```

**Yarn** (optional, alternative to npm)
```bash
yarn --version
```

### Disk Space

- **Minimum:** 100 MB
- **Recommended:** 500 MB (includes dependencies)

### Network Access

**Required:**
- HTTPS access to `graph.microsoft.com`
- HTTPS access to `login.microsoftonline.com`
- Localhost access on port 3000 (OAuth callback)

**Firewall rules:**
- Allow outbound HTTPS (443)
- Allow inbound on localhost:3000 (temporary, during auth)

---

## Microsoft 365 Requirements

### Account Access

**Required:**
- Active Microsoft 365 account
- Email address ending in your organization domain
- Permissions to read your own mailbox

**Not supported:**
- Personal Microsoft accounts (live.com, outlook.com, hotmail.com)
- Guest accounts in other tenants
- Accounts without mailboxes

### Azure AD Access

**For setup only:**
- Access to Azure portal (portal.azure.com)
- Permissions to register applications in Azure AD
- OR: Assistance from Azure AD administrator

**Permissions needed:**
- Application.ReadWrite.OwnedBy (to create app registration)
- OR: Have admin create app registration for you

**Note:** After setup, no Azure AD access needed for daily use

### API Permissions (Admin Consent)

**Required:**
- `Mail.Read` - Read user email
- `User.Read` - Read user profile

**Admin consent:**
- May require tenant admin approval
- One-time process
- Admin can pre-approve for all users

**Check with IT:** Confirm your organization allows custom applications

---

## Development Tools

### Required for Development

**Only needed if contributing code or running from source:**

### TypeScript

```bash
npm install -g typescript
```

### Git

**For cloning repository:**
```bash
git --version
```

### Code Editor (Recommended)

**Options:**
- Visual Studio Code (recommended)
- JetBrains Rider
- Sublime Text
- Vim/Emacs

**VS Code extensions:**
- TypeScript and JavaScript Language Features (built-in)
- ESLint (optional)
- Prettier (optional)

---

## Verification Steps

### Step 1: Check Node.js

```bash
node --version
npm --version
```

**Expected:**
- Node: v18.0.0 or higher
- npm: 8.0.0 or higher

### Step 2: Check Network Access

```bash
curl https://graph.microsoft.com
```

**Expected:** Response (may be error, but proves connectivity)

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri https://graph.microsoft.com
```

### Step 3: Verify M365 Account

**Test login:**
1. Go to https://portal.office.com
2. Sign in with your M365 account
3. Verify you can access Outlook
4. Note your email address (needed for config)

### Step 4: Check Azure AD Access

**Option A: You have access**
1. Go to https://portal.azure.com
2. Sign in
3. Navigate to "Azure Active Directory"
4. Check "App registrations" in left menu
5. If accessible, you can proceed to setup

**Option B: Request admin assistance**
1. Contact your IT department
2. Request app registration creation
3. Provide them with `azure-ad-setup.md` document

### Step 5: Verify Localhost Port 3000

**Check if port is available:**
```bash
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**Expected:** No output (port is free)

**If port is in use:**
- Stop the application using it
- OR: Configure MsGraph-Mcp to use different port (in `.env`)

---

## Related Documentation

**Next steps:**
- `azure-ad-setup.md` - Create Azure AD app registration
- `configuration.md` - Configure environment variables

**Architecture:**
- `../architecture/overview.md` - System architecture
- `../architecture/authentication.md` - OAuth 2.0 details

---

**Last Updated:** 2025-10-31
