# Usage Examples

**Type:** Procedure
**Purpose:** Common usage patterns for MsGraph-Mcp tools
**Audience:** Users learning how to use the MCP tools effectively

---

## Table of Contents

- [Email Search Scenarios](#email-search-scenarios)
- [Batch Operations](#batch-operations)
- [Advanced Queries](#advanced-queries)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

---

## Email Search Scenarios

### Scenario 1: Find Customer Feedback

**Goal:** Search emails from customers mentioning "feedback"

**User request:**
```
Search my email for messages from customer domains mentioning feedback
```

**What Claude does:**
1. Invokes `mcp__msgraph__search_emails`
2. Parameters: `{ query: "from:customer.com AND feedback" }`
3. Returns email summaries

**Result:**
```
Found 12 emails with feedback from customers:

Most recent:
- Oct 28: "Product feedback" from john@customer.com
  Snippet: "We've been using the product for 3 months..."

- Oct 25: "Feature request" from jane@customer.com
  ...
```

### Scenario 2: Track Project Communications

**Goal:** Find all emails about specific project

**User request:**
```
Show me recent emails about the Q4 Planning project
```

**What Claude does:**
1. Invokes `mcp__msgraph__search_emails`
2. Parameters: `{ query: "subject:Q4 Planning OR body:Q4 Planning" }`
3. Returns matching emails

### Scenario 3: Find Emails with Attachments

**Goal:** Locate emails with specific attachments

**User request:**
```
Find emails from last month with PDF attachments
```

**What Claude does:**
1. Calculates date range (last 30 days)
2. Invokes `mcp__msgraph__search_emails`
3. Parameters:
```json
{
  "query": "hasAttachment:true",
  "startDate": "2025-10-01",
  "endDate": "2025-10-31"
}
```

**Result:** List of emails with attachment metadata

### Scenario 4: Read Full Email

**Goal:** Get complete content of specific email

**User request:**
```
Show me the full email from Oct 28 about the proposal
```

**What Claude does:**
1. First searches: `search_emails({ query: "subject:proposal", startDate: "2025-10-28" })`
2. Gets message ID from results
3. Then retrieves full email: `get_email({ messageId: "AAMkAG..." })`
4. Presents full content to user

---

## Batch Operations

### Scenario 1: Cancellation Detection

**Goal:** Check 50 companies for cancellation signals

**User request:**
```
For these companies, check my email for any cancellation signals:
[List of 50 company names]
```

**What Claude does:**
1. Extracts company names from user's list
2. Invokes `mcp__msgraph__search_emails_by_entities`
3. Parameters:
```json
{
  "entities": ["Company A", "Company B", ..., "Company ZZ"],
  "keywords": ["cancel", "cancellation", "terminate", "churn", "leaving"]
}
```

**Result:**
```
Analyzed 50 companies. Found concerning signals in 3:

Company A (2 emails):
- Oct 28: "Contract review" - Mentioned cancellation clause
- Oct 15: "Renewal discussion" - Reconsidering renewal

Company M (1 email):
- Oct 20: "Budget cuts" - May need to cancel services

Company Z (1 email):
- Oct 5: "Vendor evaluation" - Considering alternatives
```

**Token efficiency:** ~5,000 tokens for 50 companies vs ~300,000 without batching/summarization

### Scenario 2: Cross-Reference with Data

**Goal:** Cross-reference email with business data

**User request:**
```
I have a list of top revenue customers from RTP benchmarks.
Check my email to see if any have sent concerning messages recently.

[Claude uses RTP MCP to get top customers]
[Then uses MsGraph MCP to search emails]
```

**What Claude does:**
1. Calls RTP MCP: Get top 20 customers by revenue
2. Extracts company names
3. Calls MsGraph MCP: `search_emails_by_entities`
4. Keywords: ["issue", "problem", "complaint", "cancel"]
5. Cross-references results

**Result:** Combined analysis showing revenue risk

### Scenario 3: Multi-Keyword Search

**Goal:** Search for any of several related terms

**User request:**
```
Check if companies A, B, C have sent any negative feedback
```

**What Claude does:**
```json
{
  "entities": ["Company A", "Company B", "Company C"],
  "keywords": [
    "disappointed",
    "frustrated",
    "unhappy",
    "not satisfied",
    "complaint",
    "issue"
  ]
}
```

**Benefit:** Single call searches all entities for all keywords

---

## Advanced Queries

### Scenario 1: Date Range with Folder Filter

**User request:**
```
Search my "Inbox/Important" folder for emails from last week
mentioning "urgent"
```

**Parameters:**
```json
{
  "query": "urgent",
  "folder": "Inbox/Important",
  "startDate": "2025-10-24",
  "endDate": "2025-10-31"
}
```

### Scenario 2: Complex Boolean Query

**User request:**
```
Find emails about either invoice OR payment, but NOT from accounting team
```

**Query:**
```json
{
  "query": "(invoice OR payment) AND NOT from:accounting@tbg.com"
}
```

### Scenario 3: Drill-Down Pattern

**Step 1: Summary search**
```
User: Check email from 20 vendors for overdue invoices
Claude: [Searches, returns summaries]
Result: 3 vendors have overdue invoice mentions
```

**Step 2: Detail request**
```
User: Show me the full email from Vendor X about the invoice
Claude: [Uses message ID from summary to get full email]
Result: Complete email with all details
```

**Benefit:** Only retrieve full content when needed (token-efficient)

---

## Best Practices

### For Users

**Be specific with entities:**
- ✅ "Acme Corporation"
- ✅ "acme.com"
- ❌ "Acme" (may match unrelated emails)

**Use natural language:**
- ✅ "Check my email for cancellation signals from these companies..."
- ❌ "Invoke mcp__msgraph__search..." (Claude will handle the tool call)

**Provide context:**
- ✅ "For companies with declining revenue, check email for..."
- Better results when Claude understands the goal

**Request drill-down when needed:**
- Start with summaries (fast, token-efficient)
- Request full emails only when necessary
- Example: "Show me more details about that Oct 28 email"

### For Claude

**When to use which tool:**

**`search_emails_by_entities`:**
- Multiple companies/entities to search
- Same keywords across all entities
- Need grouped results
- Batch efficiency important

**`search_emails`:**
- Single search query
- Complex boolean logic
- Ad-hoc exploration
- Folder-specific search

**`get_email`:**
- User asks for "full email" or "complete message"
- Need body content or attachments
- After summary search (drill-down)

**`list_mail_folders`:**
- User asks about folder structure
- Before folder-specific search
- Understanding mailbox organization

### Token Optimization

**Default to summaries:**
- Always start with summary/search tools
- Only use `get_email` when explicitly requested

**Batch when possible:**
- Use `search_emails_by_entities` for multiple entities
- Single API call vs multiple sequential calls

**Respect limits:**
- Default result limits are optimized
- Don't request `limit: 1000` unless necessary

**Progressive disclosure:**
- Show summaries first
- Offer to drill down
- Example: "I found 5 matches. Would you like to see the full content of any?"

---

## Related Documentation

**Tools:**
- `../tools/overview.md` - All available tools
- `../tools/email-search.md` - Detailed tool reference

**Setup:**
- `claude-code-setup.md` - Configure MCP in Claude Code

**Architecture:**
- `../architecture/token-efficiency.md` - Token optimization strategies

---

**Last Updated:** 2025-10-31
