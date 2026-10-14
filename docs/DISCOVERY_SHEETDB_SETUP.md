# Discovery form SheetDB setup

The public `/en/discover` and `/es/discover` forms submit through their server-side `/<locale>/discover/submit` route. This route deliberately avoids `/api/*`, which Vercel rewrites to ContractorBackend. Configure `SHEETDB_DISCOVERY_API_URL` with the SheetDB API URL supplied for this form. It is a server-only variable; do not use the existing `NEXT_PUBLIC_SHEETDB_API` signup setting. Local development uses an ignored `.env.local` file. Set the variable separately in the Vercel Development/Preview environments before testing a deployed form, then redeploy.

The spreadsheet's first row must contain these column names for the submitted values to map correctly:

`id`, `timestamp`, `contact_name`, `email`, `phone`, `business_name`, `business_type`, `business_type_other`, `team_size`, `service_areas`, `annual_revenue`, `has_google_account`, `has_business_profile`, `has_website`, `has_logo`, `estimate_method`, `current_software`, `desired_features`, `ai_receptionist_interest`, `commercial_leads_interest`.

The form sends one `data` row using SheetDB's `RAW` input mode. The success screen appears only after SheetDB reports `created: 1`. Failed submissions keep the answers on screen for retry. A browser-local marker remembers only that a submission succeeded; it does not store contact details.
