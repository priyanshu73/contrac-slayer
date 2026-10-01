# Goal 3: Twenty distinct layouts, one content model

Status: proposed implementation specification. Frontend: priyanshu73/contrac-slayer dev. Backend: validated template registry in sphere-trade/ContractorBackend dev. Dependencies: goals 1-2. No auto-merge, deployment or migration execution.

## Problem
Modern/Craftsman/Bold currently use the same renderer structure with CSS variants. Twenty palettes would still be one layout. Build about twenty total templates with TradeForge's variety and trade-appropriate feel, but simpler editing and honest business facts.

## Reference
Live https://tradeforge.ca/templates advertises eleven layouts, colour/font/logo-size controls and all words/photos preserved on switching. Families: Classic (utility/nav/photo/licence block), The OG (heavy conventional blocks), Heritage (family-firm cream/serif), Studio (ruled precision grid), Quiet (gallery/whitespace), Ironclad (dark industrial/phone), Blue Collar (bright call/service cards), Blueprint (drawing/spec-sheet), Craftsman (work-photo/warm numbered services), Dispatch (urgent contact/booking), Homestead (neighbourly arches/owner).
Page and actual rendered samples inspected September 30, 2026. Earlier editor inventory: the privately reviewed reference inventory . Copy the good feature/workflow patterns closely: varied compositions, owner theme controls, same content across switches, empty sections hidden. Do not copy their code, photos, text or pixel designs. Their sample credentials/reviews/response promises must not enter real business content.

## Scope
### Architecture and controls
- Typed registry: stable ID/version, label, intent tags, visibly fictional thumbnail fixture, layout module, default theme, supported section treatments. Share primitive sections, but each layout changes hierarchy, hero geometry, navigation, project presentation and/or section rhythm.
- Keep modern/craftsman/bold IDs. Preserve legacy published renderer/version until owner republish. Twenty total means existing three plus seventeen, not twenty more. Trade presets/palettes do not count.
- Switching changes presentation only; all words, asset IDs, sanitized crop masters, approvals, section order/enabled state, contacts and slug survive. "Keep my colours/fonts" is default; layout defaults are an explicit preview choice. Cancel restores previous presentation; switching never publishes.
- Controls: approved font-pair IDs, primary/accent/background/text colors with contrast warnings and safe fallback, logo size, density/button style. No arbitrary HTML/CSS/JS. Fonts have licensed approved sources.
- Picker: miniature previews, intent/trade tags, mobile/desktop compare, selection state and sparse-content guidance. No demo fixtures merged into data.
- Every template supports all v2 sections or a documented visible fallback. Respect owner order; explain fixed hero/contact constraints. Hidden content stays stored.

### Proposed catalog (original direction)
| ID | Name | Structural distinction |
| --- | --- | --- |
| modern | Modern Split | Split text/work hero, light nav, modular service tiles |
| craftsman | Craftsman Portfolio | Full-width work hero, editorial story, numbered services |
| bold | Bold Utility | Stacked high-contrast hero, contact rail, large service bands |
| established | Established | Utility hours strip, formal header, banner, factual credential table |
| heritage | Family Workshop | Story-first paired images, owner introduction, project chapters |
| precision | Precision Studio | Ruled asymmetric grid, project plates, service specification table |
| quiet-gallery | Quiet Gallery | Minimal cover and oversized single work images/captions |
| steel | Steel Works | Industrial text-first hero, phone rail, compact service index |
| neighbour | Neighbour | Owner portrait panel, friendly cards and town-coverage strip |
| field-notes | Field Notes | Drawing-inspired grid, numbered work sheets and technical details |
| rapid-contact | Rapid Contact | No-photo contact-first cover and honest hours; no ETA/fake slots |
| garden | Garden | Landscape panorama, seasonal service groups and masonry gallery |
| renovation | Renovation Story | Before/after lead, project narrative, process timeline |
| roofline | Roofline | Building-photo hero, inspection cards, full-width coverage band |
| comfort | Home Comfort | Contact sidebar, FAQ-led hierarchy, approachable hours panel |
| finish | Fine Finish | Vertical work triptych, restrained type, material/work captions |
| commercial | Commercial Partner | Capability cover, sector/service matrix, case studies |
| local-expert | Local Expert | Area-first header, coverage beside services, owner/work below |
| project-book | Project Book | Selected-work index, project chapters/lightbox, compact contact |
| service-desk | Service Desk | Grouped/searchable services, FAQ main body, mobile contact bar |

These names/choices are proposals. Any trade can use any layout. Sparse data is supported without false specialization, licences, stars, insurance, years counters or emergency claims. Booking stays the existing link if configured, never simulated live slots; quote CTA keeps current routing until phase 2.

### Build sequence
1. Desktop/mobile mockups for five very different families using identical rich and sparse fixtures; review distinction before building twenty.
2. Registry and preservation tests; upgrade existing three without breaking legacy published pages.
3. Functional batches: eight, fourteen, then twenty total. Match frontend/backend registry every batch; not a gallery of disabled cards.
4. Run full suites per batch. Independent strict code/tests and UI/UX critics must reach 8/10 after fixes before proposing merge. Do not self-certify a missing reviewer.

## Acceptance criteria
- Twenty enabled entries with ID/version, rationale, screenshot pair. Each pair differs on at least two structural axes: hero, navigation/contact, section organization or project presentation. Palette-only variants fail.
- Switch rich fixture through all twenty and compare content excluding presentation fields. Round trip A-B-A and reload loses no words/assets/approvals/order. Published pages stay unchanged during selection.
- Each template supports sparse/no-photo/no-credential/no-review, long names/services and portrait/landscape images. Unknown/version-stale IDs safely use documented compatibility behavior.
- Actual pixels inspected at 390px, tablet and desktop for all twenty. No overflow, unreadable overlay, lost focal subject or sticky CTA obscuring fields/footer. Keyboard gallery/FAQ/nav, reduced motion and contrast checked.
- Shared SSR output remains semantic and indexable. Lazy-load nonselected layout modules; homeowner does not download all template images/modules. Set and measure a performance budget before implementation.
- Typecheck/lint/frontend tests/build and backend schema tests, common publish/unpublish and tenant suites run. No real customer publication used as a fixture.

## Out of scope
New scheduler/CRM, paid stock-image procurement, scraping/cloning vendor templates, fake proof, AI editing, arbitrary customer code, subdomains/domains, automatic deployment/merge.

## Starting code
`components/websites/contractor-website.tsx`, `website.module.css`, `website-settings.tsx`, `lib/types/website.ts`; backend `app/schemas/contractor_website.py`. Paths inspected on dev September 30, 2026; proposed code locations for new registry to be chosen by implementer.
