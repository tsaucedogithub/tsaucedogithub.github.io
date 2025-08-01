# Design Document

## Overview

This design implements two standalone policy pages (privacy policy and support policy) for an app within the existing Jekyll website. The pages will be accessible via direct URLs (`/privacy.html` and `/support.html`) but will remain hidden from the site's navigation system. The implementation leverages Jekyll's standard page structure and the existing site layout to ensure consistency.

## Architecture

The solution uses Jekyll's built-in page generation system with custom front matter configuration to create standalone pages that integrate with the existing site structure while remaining hidden from navigation.

### Key Design Decisions

1. **Standard Jekyll Pages**: Use regular Markdown files with Jekyll front matter rather than custom plugins or complex configurations
2. **Layout Inheritance**: Utilize the existing `default.html` layout to maintain visual consistency
3. **Navigation Exclusion**: Avoid adding pages to the `site.navigation` array in `_config.yml` to keep them hidden
4. **Direct URL Access**: Pages will be accessible at root-level URLs (`/privacy.html` and `/support.html`)

## Components and Interfaces

### Page Structure

Each policy page will be implemented as a standard Jekyll page with the following structure:

```markdown
---
layout: default
title: [Page Title]
permalink: /[page-name].html
---

[Page Content]
```

### Layout Integration

The pages will use the existing `default.html` layout which provides:
- Standard HTML structure with meta tags
- Site header with title
- Navigation menu (policy pages won't appear here)
- Main content area
- Footer with social links
- CSS and JavaScript includes

### Navigation System

The current navigation system in `_config.yml` defines a `navigation` array that populates the header menu. The policy pages will intentionally be excluded from this array to keep them hidden from the main site navigation.

## Data Models

### Page Front Matter Schema

```yaml
layout: string        # "default" - uses existing layout
title: string         # Page title for <title> tag and potential h1
permalink: string     # URL path (e.g., "/privacy.html")
```

### Content Structure

Each page will contain:
- **Header Section**: Brief introduction to the policy
- **Policy Content**: Structured policy information relevant to the app
- **Contact Information**: How users can reach out regarding the policy
- **Last Updated**: Date information for policy version tracking

## Error Handling

### 404 Handling
- Jekyll's existing 404.html will handle invalid URLs
- Policy pages will be included in the site build, so they won't trigger 404s when accessed directly

### Build Errors
- Standard Jekyll validation will catch syntax errors in front matter
- Markdown parsing errors will be caught during build process

### Content Validation
- Manual review of policy content for accuracy
- Standard Jekyll build process will validate page structure

## Testing Strategy

### Build Testing
1. **Local Development**: Test pages using `bundle exec jekyll serve`
2. **Build Validation**: Ensure pages generate correctly in `_site` directory
3. **URL Testing**: Verify direct access to `/privacy.html` and `/support.html`

### Navigation Testing
1. **Hidden Verification**: Confirm pages don't appear in site navigation
2. **Layout Consistency**: Verify pages use the same styling as other site pages
3. **Responsive Testing**: Ensure pages work on different screen sizes

### Content Testing
1. **Markdown Rendering**: Verify all markdown elements render correctly
2. **Link Testing**: Test any internal or external links within policy content
3. **Cross-browser Testing**: Ensure consistent rendering across browsers

## Implementation Approach

### File Creation
1. Create `privacy.md` in the root directory
2. Create `support.md` in the root directory
3. Both files will use identical front matter structure with different titles and permalinks

### Content Strategy
- Use placeholder content initially that can be easily updated
- Structure content with clear headings for readability
- Include standard policy sections (data collection, usage, contact, etc.)

### Deployment
- Pages will be automatically included in Jekyll build process
- No additional configuration needed in `_config.yml`
- Pages will be generated as static HTML files in the `_site` directory