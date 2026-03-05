# SEO Action Plan: Fiji IT Solutions

**Website:** https://www.fijiitsolutions.com
**Current Score:** 38/100
**Target Score:** 75/100 (achievable within 90 days)
**Generated:** March 5, 2026

---

## Priority Legend

| Priority | Timeline | Impact |
|----------|----------|--------|
| CRITICAL | Fix immediately (this week) | Blocks indexing or causes penalties |
| HIGH | Fix within 1-2 weeks | Significantly impacts rankings |
| MEDIUM | Fix within 1 month | Optimization opportunity |
| LOW | Backlog (within 3 months) | Nice to have |

---

## CRITICAL Priority (Fix This Week)

### 1. Generate and Submit XML Sitemap
**Impact:** Indexing + Crawlability
**Effort:** 30 minutes

- Install Yoast SEO or Rank Math plugin (both auto-generate sitemaps)
- Verify sitemap at `https://www.fijiitsolutions.com/sitemap_index.xml`
- Submit sitemap in Google Search Console
- Submit sitemap in Bing Webmaster Tools
- Add `Sitemap:` directive to robots.txt

### 2. Fix Broken Statistics Counters
**Impact:** Trust + Conversion
**Effort:** 1-2 hours

- The homepage shows "0+ Active Clients", "0+ Years of Experience", "0% Satisfaction"
- This is a JavaScript animation bug — the counter animation never triggers
- Check if the Elementor counter widget or equivalent is configured correctly
- Set real numbers (e.g., "150+ Active Clients", "10+ Years", "99% Satisfaction")
- Test on mobile and desktop

### 3. Add Business Hours
**Impact:** Local SEO + Google Business Profile
**Effort:** 30 minutes

- Add hours to Contact Us page
- Add hours to footer (sitewide)
- Add `openingHoursSpecification` to schema
- Ensure hours match Google Business Profile exactly

### 4. Fix robots.txt
**Impact:** Crawlability
**Effort:** 15 minutes

Replace current robots.txt:
```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: https://www.fijiitsolutions.com/sitemap_index.xml
```
- Remove `Crawl-delay: 10` (hurts Bing crawling)
- Add sitemap reference
- Block wp-admin from crawlers

### 5. Add Alt Text to All Images
**Impact:** Accessibility + Image SEO
**Effort:** 2-3 hours

Priority images:
- Logo: `alt="Fiji IT Solutions - Managed IT Services in Fremont CA"`
- Hero images: Descriptive alt text with service keywords
- Team/review photos: Include person names
- Service icons: Describe the service

---

## HIGH Priority (Fix Within 1-2 Weeks)

### 6. Implement LocalBusiness Schema
**Impact:** Local Pack + Knowledge Panel
**Effort:** 1-2 hours

- Add `ProfessionalService` JSON-LD (see full report for code)
- Include all 11 service area cities in `areaServed`
- Add `hasOfferCatalog` with all services
- Validate at https://validator.schema.org/

### 7. Implement FAQPage Schema
**Impact:** Featured Snippets
**Effort:** 1 hour

- Extract FAQ questions and answers from homepage FAQ section
- Wrap in `FAQPage` JSON-LD schema
- Validate at Google Rich Results Test

### 8. Fix Duplicate Meta Descriptions
**Impact:** CTR from Search Results
**Effort:** 1 hour

| Page | Current | Recommended |
|------|---------|-------------|
| Home | "We specialize in reliable, responsive IT support..." | "Fiji IT Solutions provides managed IT services, computer repair & network cabling in Fremont & Bay Area. Call +1-650-242-5306 for a free consultation." |
| About | Same as homepage (DUPLICATE) | "Meet the Fiji IT Solutions team — experienced IT professionals serving Bay Area businesses with managed support, repairs & cabling since [year]. Learn our story." |
| Services | Keyword list | "Explore our IT services: managed support, hardware repair, data recovery, structured cabling & more. Serving Fremont, San Jose, Palo Alto & Bay Area." |

### 9. Optimize Title Tags
**Impact:** Rankings + CTR
**Effort:** 1 hour

| Page | Current | Recommended |
|------|---------|-------------|
| Home | "Best Managed IT Services in Fremont & IT Services in Bay Area" | "Managed IT Services in Fremont & Bay Area \| Fiji IT Solutions" |
| About | "Managed IT Service In Bay Area & Computer Repair" | "About Fiji IT Solutions \| Bay Area IT Support & Computer Repair" |
| Services | "Services - FIJI IT SOLUTIONS" | "IT Services: Managed Support, Repair & Cabling \| Fiji IT Solutions" |

### 10. Add Google Reviews & More Testimonials
**Impact:** Trust + Local SEO
**Effort:** Ongoing

- Request Google Reviews from existing customers
- Display Google Reviews on the website (use plugin or embed)
- Aim for 20+ reviews on Google
- Add review schema with `AggregateRating`
- Show reviews from multiple platforms (Google, Yelp, Facebook)

### 11. Create Dedicated Service Pages
**Impact:** Rankings for Service Keywords
**Effort:** 1-2 weeks

Each service needs its own page (1,000+ words):
- `/services/managed-it-support/`
- `/services/computer-repair/`
- `/services/data-recovery/`
- `/services/website-development/`
- `/services/structured-cabling/`
- `/services/voip-phone-systems/`
- `/services/security-cameras/`
- `/services/wifi-solutions/`
- `/services/fiber-optic-cabling/`

Each page should include:
- Detailed service description
- Benefits and features
- Process/how it works
- FAQs specific to that service
- CTA + contact form
- Related services cross-links

### 12. Improve Internal Linking
**Impact:** Crawlability + Page Authority
**Effort:** 2-3 hours

- Blog posts should link to relevant service pages
- Service pages should cross-link to related services
- Add visible breadcrumb navigation
- Add "Related Services" section to each service page
- Link from service area cities to relevant services

---

## MEDIUM Priority (Fix Within 1 Month)

### 13. Create Location/Service Area Pages
**Impact:** Local Rankings for Each City
**Effort:** 1-2 weeks

Create pages for each service area:
- `/service-areas/fremont-it-services/`
- `/service-areas/san-jose-it-support/`
- `/service-areas/palo-alto-computer-repair/`
- etc.

Each page (800+ words) should include:
- City-specific content (not just find-and-replace)
- Local landmarks/business districts mentioned
- Unique testimonials from clients in that area
- Google Map embed for that area
- Local phone number

### 14. Add Team Bios & Credentials
**Impact:** E-E-A-T + Trust
**Effort:** 3-4 hours

- Create team page with photos, names, roles
- List certifications (CompTIA, Microsoft, Cisco, etc.)
- Add individual bio pages for key team members
- Link blog posts to author bios
- Add `Person` schema for team members

### 15. Add Blog Author Attribution
**Impact:** E-E-A-T
**Effort:** 1 hour

- Add author name and bio to every blog post
- Create author archive pages
- Add `BlogPosting` schema with `author` property
- Link author to team bio page

### 16. Optimize Images for Performance
**Impact:** Core Web Vitals (LCP, CLS)
**Effort:** 2-3 hours

- Convert all images to WebP format (keep PNG/JPG fallback)
- Compress images (target < 100KB for hero images)
- Add explicit `width` and `height` attributes to prevent CLS
- Implement lazy loading for below-fold images
- Rename files descriptively (e.g., `managed-it-services-bay-area.webp`)

### 17. Add Google Maps Embed to Contact Page
**Impact:** Local SEO + UX
**Effort:** 30 minutes

- Embed Google Maps on contact page
- Pin exact business location
- Include driving directions text

### 18. Set Up Google Search Console
**Impact:** Monitoring + Indexing
**Effort:** 30 minutes

- Verify site ownership
- Submit sitemap
- Monitor index coverage
- Check for manual actions
- Review Core Web Vitals report

---

## LOW Priority (Within 3 Months)

### 19. Create llms.txt File
**Impact:** AI Search Visibility
**Effort:** 30 minutes

Create `/llms.txt` with structured info about the business for AI crawlers.

### 20. Add Case Studies / Portfolio
**Impact:** E-E-A-T + Conversion
**Effort:** Ongoing

- Document 3-5 client success stories
- Include before/after metrics
- Add photos of completed installations (cabling, cameras, etc.)
- Use `Article` schema

### 21. Implement Blog Categories & Tags
**Impact:** Site Structure + Internal Linking
**Effort:** 1-2 hours

- Categorize blog posts (Cybersecurity, Managed IT, Networking, etc.)
- Add category archive pages
- Add tag taxonomy
- Link categories in navigation

### 22. Add Security Headers at Origin
**Impact:** Security + Trust Signals
**Effort:** 1 hour

- Add HSTS header
- Add Content-Security-Policy
- Add X-Frame-Options
- Add X-Content-Type-Options
- Verify via securityheaders.com

### 23. Build Backlink Strategy
**Impact:** Domain Authority
**Effort:** Ongoing

- Get listed in local Bay Area business directories
- Join Fremont Chamber of Commerce (link from their site)
- Partner content with local business organizations
- Submit to IT-specific directories (Clutch, UpCity, etc.)
- Guest posts on local business blogs

---

## 90-Day Milestone Targets

| Milestone | Week | Expected Score |
|-----------|------|---------------|
| Critical fixes complete | Week 1 | 50/100 |
| High priority complete | Week 3 | 62/100 |
| Medium priority complete | Week 8 | 72/100 |
| Low priority started | Week 12 | 75/100 |

---

## Key Metrics to Track

| Metric | Current (Estimated) | 30-Day Target | 90-Day Target |
|--------|---------------------|---------------|---------------|
| Google Search Console Impressions | Unknown | Baseline set | +50% |
| Organic Traffic | Unknown | Baseline set | +40% |
| Local Pack Appearances | Likely 0 | 3-5 keywords | 15+ keywords |
| Core Web Vitals (LCP) | ~3.5-5s | < 3.0s | < 2.5s |
| Indexed Pages | Unknown | 30+ | 50+ |
| Google Reviews | 0 | 5+ | 15+ |
| Blog Posts/Month | ~1 | 2 | 4 |
