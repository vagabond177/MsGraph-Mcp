# Copilot Content Search

**Type:** Command (Reference)
**Purpose:** Search M365 content using Copilot Retrieval API
**Audience:** Users and AI agents using MsGraph-Mcp

---

## Table of Contents

- [Overview](#overview)
- [Tool: mcp__msgraph__search_content](#tool-mcp__msgraph__search_content)
- [Use Cases](#use-cases)
- [Parameters](#parameters)
- [Response Format](#response-format)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Permissions](#permissions)
- [Related Documentation](#related-documentation)

---

## Overview

The Copilot Content Search tool leverages Microsoft 365 Copilot's Retrieval API to search across SharePoint, OneDrive, and Copilot connectors using natural language queries. Unlike traditional keyword search, this uses AI-powered semantic search to find relevant content even when scattered across multiple locations.

**Key Benefits:**
- **Natural Language**: Query using conversational language instead of exact keywords
- **Semantic Understanding**: Finds conceptually related content, not just keyword matches
- **Permission-Aware**: Respects all M365 access controls and sensitivity labels
- **Relevance Scoring**: Returns results ranked by relevance
- **Text Extracts**: Provides relevant excerpts from documents, not just titles

**Requirements:**
- Microsoft 365 Copilot license (per user)
- Files.Read.All and Sites.Read.All permissions

---

## Tool: mcp__msgraph__search_content

### Description

Search across M365 content (SharePoint, OneDrive) using Microsoft Copilot Retrieval API. Returns text excerpts with relevance scores. Ideal for finding documents, files, and information when you don't know exact locations.

### Input Schema

```typescript
{
  query: string;              // Required: Natural language search query (max 1500 chars)
  dataSource?: string;        // Optional: 'sharePoint' | 'oneDriveBusiness' | 'externalItem' (default: 'sharePoint')
  filterExpression?: string;  // Optional: KQL filter expression
  maxResults?: number;        // Optional: 1-25 (default: 10)
  includeMetadata?: boolean;  // Optional: Include file metadata (default: false)
}
```

### Output Schema

Returns array of `CopilotSearchResult`:

```typescript
{
  source: string;              // Data source searched
  url: string;                 // Web URL to the content
  relevance: number;           // Relevance score (0-1)
  excerpt: string;             // Relevant text extracts from the content
  resourceType: string;        // 'listItem' or 'externalItem'
  metadata?: object;           // File metadata (if requested)
  sensitivityLabel?: string;   // Sensitivity label name (if present)
}
```

---

## Use Cases

### 1. Finding Scattered Content

**Scenario:** You need information about vendor sponsorships, but it's spread across multiple SharePoint sites and OneDrive locations.

```typescript
{
  query: "vendor sponsorship agreements and proposals",
  maxResults: 15
}
```

**Result:** Finds all relevant documents about vendor sponsorships, regardless of where they're stored.

### 2. Research Questions

**Scenario:** Answering a research question about your organization's data.

```typescript
{
  query: "customer churn analysis reports from last year",
  filterExpression: "LastModifiedTime>=2024-01-01",
  includeMetadata: true
}
```

**Result:** Locates analysis reports with metadata showing author, dates, and location.

### 3. Policy and Compliance

**Scenario:** Finding policy documents related to a specific topic.

```typescript
{
  query: "data retention and privacy policies",
  dataSource: "sharePoint",
  maxResults: 10
}
```

**Result:** Returns company policy documents with relevant sections highlighted.

### 4. Project Discovery

**Scenario:** Finding all content related to a specific project or initiative.

```typescript
{
  query: "Project Phoenix budget and timelines",
  filterExpression: "FileExtension:xlsx OR FileExtension:pdf"
}
```

**Result:** Locates Excel budgets and PDF timeline documents for the project.

---

## Parameters

### query (Required)

**Type:** `string`
**Max Length:** 1500 characters
**Recommended:** Single, clear sentence

**Natural language query describing what you're looking for.**

**Good Examples:**
- "vendor sponsorship agreements from 2024"
- "customer feedback about product reliability issues"
- "budget presentations for marketing campaigns"

**Avoid:**
- Very long, multi-sentence queries
- Boolean operators like AND/OR (use filterExpression instead)
- Overly vague terms like "documents" or "files"

### dataSource (Optional)

**Type:** `'sharePoint' | 'oneDriveBusiness' | 'externalItem'`
**Default:** `'sharePoint'`

**Where to search for content.**

- `sharePoint` - Search SharePoint sites (team sites, communication sites, document libraries)
- `oneDriveBusiness` - Search user OneDrive for Business locations
- `externalItem` - Search content ingested via Copilot connectors

**Note:** To search multiple sources, call the tool multiple times.

### filterExpression (Optional)

**Type:** `string` (KQL syntax)

**Additional filtering using Keyword Query Language (KQL).**

**Common Filters:**
- `FileExtension:pdf` - Only PDF files
- `FileExtension:(docx OR pptx)` - Word or PowerPoint files
- `LastModifiedTime>=2025-01-01` - Modified after date
- `LastModifiedTime>=2025-01-01 AND LastModifiedTime<=2025-10-31` - Date range
- `Author:"John Smith"` - Authored by specific person
- `Filename:"budget"` - Filename contains "budget"

**Example:**
```typescript
{
  query: "sales proposals",
  filterExpression: "FileExtension:pdf AND LastModifiedTime>=2025-01-01"
}
```

### maxResults (Optional)

**Type:** `number`
**Range:** 1-25
**Default:** 10

**Maximum number of results to return.**

API enforces a maximum of 25 results per request. Results are sorted by relevance (highest first).

### includeMetadata (Optional)

**Type:** `boolean`
**Default:** `false`

**Include file metadata in results.**

When `true`, the `metadata` field includes:
- `title` - Document title
- `author` - Author name
- `lastModifiedDateTime` - Last modified timestamp
- `createdDateTime` - Created timestamp
- `fileExtension` - File extension
- `size` - File size in bytes

**Token Impact:** Metadata increases token usage. Only enable when needed.

---

## Response Format

### Example Response

```json
[
  {
    "source": "sharePoint",
    "url": "https://contoso.sharepoint.com/sites/Sales/Documents/VendorAgreement2024.pdf",
    "relevance": 0.95,
    "excerpt": "Vendor Sponsorship Agreement\n\nThis agreement between Contoso and Acme Corp establishes the terms for bronze-level sponsorship...\n\n...sponsorship benefits include logo placement on website, social media mentions, and booth space at annual conference...",
    "resourceType": "listItem",
    "sensitivityLabel": "Confidential"
  },
  {
    "source": "sharePoint",
    "url": "https://contoso.sharepoint.com/sites/Marketing/Shared Documents/2024 Sponsorships.xlsx",
    "relevance": 0.87,
    "excerpt": "2024 Vendor Sponsorship Tracking\n\nAcme Corp - Bronze - $10,000 - Confirmed\nGlobal Tech - Silver - $25,000 - Pending\n...",
    "resourceType": "listItem"
  }
]
```

### Fields Explained

- **source**: Which data source was searched (`sharePoint`, `oneDriveBusiness`, etc.)
- **url**: Direct web URL to open the content
- **relevance**: AI-calculated relevance score (0.0 to 1.0, higher = more relevant)
- **excerpt**: Text extracts from the document showing relevant sections
- **resourceType**: Type of resource (`listItem` for SharePoint/OneDrive, `externalItem` for connectors)
- **metadata**: (Optional) File properties if `includeMetadata: true`
- **sensitivityLabel**: (Optional) Sensitivity label name if document is labeled

---

## Best Practices

### Query Construction

1. **Be Specific But Natural**
   - Good: "quarterly financial reports for 2024"
   - Poor: "reports"

2. **Use Filters for Precision**
   - Combine natural language query with KQL filters
   - Example: Natural query + `FileExtension:pdf`

3. **Single Sentence Preferred**
   - API works best with concise, single-sentence queries
   - Avoid multiple questions or requests

### Performance

1. **Start Small**
   - Use `maxResults: 5-10` initially
   - Increase only if needed

2. **Search Specific Sources**
   - If you know content is in SharePoint, specify `dataSource: 'sharePoint'`
   - Reduces search scope and improves speed

3. **Use Metadata Sparingly**
   - Only enable `includeMetadata: true` when you need it
   - Reduces token usage

### Iterative Search

1. **Review Top Results**
   - Start with broad query, review top results
   - Refine query based on what you find

2. **Add Filters Progressively**
   - Start without filters
   - Add filters to narrow down if needed

---

## Permissions

### Required Microsoft Graph Permissions

**For SharePoint and OneDrive:**
- `Files.Read.All` (Delegated)
- `Sites.Read.All` (Delegated)

**For External Items:**
- `ExternalItem.Read.All` (Delegated)

### Azure AD App Registration

Update your app registration to include these permissions:

1. Go to Azure Portal → App Registrations
2. Select your app
3. API Permissions → Add a permission → Microsoft Graph
4. Delegated permissions → Select:
   - Files.Read.All
   - Sites.Read.All
5. Grant admin consent

### User Requirements

- User must have Microsoft 365 Copilot license
- User must have access to content being searched (permission-trimmed)

---

## Related Documentation

**Architecture:**
- `../architecture/overview.md` - System architecture
- `../architecture/token-efficiency.md` - Token optimization strategies

**Tools:**
- `overview.md` - All available tools
- `email-search.md` - Email search tools

**Setup:**
- `../setup/azure-ad-setup.md` - Azure AD app setup
- `../setup/configuration.md` - Server configuration

**Reference:**
- `../reference/graph-api-notes.md` - Graph API details

**External:**
- [Microsoft 365 Copilot Retrieval API](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/ai-services/retrieval/overview)
- [KQL Syntax Reference](https://learn.microsoft.com/en-us/sharepoint/dev/general-development/keyword-query-language-kql-syntax-reference)

---

**Last Updated:** 2025-10-31
