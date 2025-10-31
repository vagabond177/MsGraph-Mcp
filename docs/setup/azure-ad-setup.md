# Azure AD Setup

**Type:** Procedure
**Purpose:** Create Azure AD app registration for MsGraph-Mcp
**Audience:** Users setting up MsGraph-Mcp for first time

---

## Table of Contents

- [Overview](#overview)
- [Step-by-Step Instructions](#step-by-step-instructions)
- [Collecting Configuration Values](#collecting-configuration-values)
- [Admin Consent](#admin-consent)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Overview

**What you're creating:** Azure AD application registration

**Why:** Allows MsGraph-Mcp to authenticate with Microsoft Graph API on your behalf

**Time required:** 10-15 minutes

**Prerequisites:** See `prerequisites.md`

---

## Step-by-Step Instructions

### Step 1: Access Azure Portal

1. Go to https://portal.azure.com
2. Sign in with your Microsoft 365 account
3. In the search bar (top), type "Azure Active Directory"
4. Click "Azure Active Directory" in results

### Step 2: Create App Registration

1. In left menu, click "App registrations"
2. Click "+ New registration" (top of page)
3. Fill in the form:

**Name:**
```
MsGraph-Mcp
```
_(You can customize this name)_

**Supported account types:**
- Select: "Accounts in this organizational directory only ([Your Org] only - Single tenant)"

**Redirect URI:**
- Platform: "Public client/native (mobile & desktop)"
- URI: `http://localhost:3000/auth/callback`

4. Click "Register"

**Result:** App registration created, you'll see the overview page

### Step 3: Configure Authentication

1. In left menu (under your app), click "Authentication"
2. Scroll to "Advanced settings" section
3. Find "Allow public client flows"
4. Toggle to "Yes"
5. Click "Save" (top of page)

**Why:** Enables OAuth 2.0 flow for desktop applications

### Step 4: Add API Permissions

1. In left menu, click "API permissions"
2. Click "+ Add a permission"
3. Click "Microsoft Graph"
4. Click "Delegated permissions"
5. Search and select:
   - `Mail.Read` (under Mail)
   - `User.Read` (under User)
   - `Files.Read.All` (under Files) - _For Copilot content search_
   - `Sites.Read.All` (under Sites) - _For Copilot content search_
6. Click "Add permissions"

**Result:** Four permissions added

**Note:** Files.Read.All and Sites.Read.All are required for the Copilot content search feature (`mcp__msgraph__search_content`). If you only need email search, you can skip these permissions.

### Step 5: Grant Admin Consent (if required)

**Check if needed:**
- Look at the permissions list
- If "Status" column shows "Not granted", admin consent is required

**Option A: You are admin**
1. Click "Grant admin consent for [Your Org]"
2. Click "Yes" to confirm
3. Status should change to "Granted"

**Option B: Request admin approval**
1. Copy the "Application (client) ID" from Overview page
2. Send to IT admin with this message:
```
Please grant admin consent for application: MsGraph-Mcp
Client ID: [paste your client ID]
Permissions needed: Mail.Read, User.Read

Purpose: Personal email search tool for Microsoft Graph integration

App registration link:
https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/[client-id]
```

3. Wait for admin approval
4. Refresh page to see status change

---

## Collecting Configuration Values

After app registration is created, collect these values for configuration:

### Tenant ID

1. On app registration Overview page
2. Look for "Directory (tenant) ID"
3. Click copy icon next to the value
4. Save this value

**Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID)

### Client ID

1. On app registration Overview page
2. Look for "Application (client) ID"
3. Click copy icon next to the value
4. Save this value

**Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID)

### Your Email Address

**Not from Azure portal** - this is your Microsoft 365 email address

**Example:** `brock@tbg.com`

**Why needed:** Used for mailbox queries in Graph API

---

## Admin Consent

### Why Admin Consent is Required

**Organizational policy:**
- Many M365 tenants require admin approval for custom apps
- Prevents unauthorized applications from accessing data
- One-time approval process

**Permissions requiring consent:**
- `Mail.Read` - typically requires admin consent
- `User.Read` - usually does not require consent

### Admin Consent Process

**What admin sees:**
1. List of permissions requested
2. Application name and publisher
3. Scope of access (your mailbox only, not all users)

**What admin should verify:**
- Application is legitimate (created by you)
- Permissions are reasonable for stated purpose
- Redirect URI is localhost (not external)

**Admin grants consent:**
- Approves for entire organization OR
- Approves for specific users only

### If Admin Denies Consent

**Reason:** Security policy

**Options:**
1. Request exception (provide business justification)
2. Use delegated permission instead (prompt user at runtime)
3. Use personal M365 account (if allowed)

**Note:** Some organizations prohibit custom applications entirely

---

## Troubleshooting

### Error: "You don't have permission to create app registrations"

**Cause:** Your account doesn't have required permissions

**Solution:**
1. Request IT admin create app registration for you
2. Provide them with this documentation
3. They should give you the Tenant ID and Client ID

### Error: "Redirect URI must be https"

**Cause:** Wrong platform selected during registration

**Solution:**
1. Delete and recreate app registration
2. Ensure "Public client/native" platform is selected
3. Localhost URIs are allowed for this platform type

### Permissions Not Showing in List

**Cause:** Wrong API selected

**Solution:**
1. Remove incorrect permissions
2. Click "Add permission" → "Microsoft Graph" (not Azure AD Graph)
3. Select "Delegated permissions" (not Application permissions)

### Admin Consent Status Stuck on "Not granted"

**Possible causes:**
- Browser cache issue
- Propagation delay
- Admin didn't complete process

**Solution:**
1. Refresh page (Ctrl+F5 or Cmd+Shift+R)
2. Wait 5-10 minutes for propagation
3. Confirm with admin that they clicked "Yes"
4. Check audit logs (if admin) to verify consent granted

---

## Related Documentation

**Next steps:**
- `configuration.md` - Configure environment with values collected here

**Prerequisites:**
- `prerequisites.md` - System requirements

**Architecture:**
- `../architecture/authentication.md` - OAuth 2.0 flow details

**Troubleshooting:**
- `../reference/troubleshooting.md` - Common issues and solutions

**External:**
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph Permissions](https://docs.microsoft.com/en-us/graph/permissions-reference)

---

**Last Updated:** 2025-10-31
