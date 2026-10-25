# Club contacts, committee and history
26 October 2026

The homepage shows three contact cards: Club Secretary, Junior Club Captain and Senior Club Captain. Names, emails and phone numbers are read on each request; public pages are invalidated when settings save. Blank fields are omitted, not invented or copied from another role. Clickable email and telephone links use the configured details.

Admin: open Club Settings. Edit the three role sections, and edit Additional Committee Members one name per line. Reorder names by moving their lines. Select Publish Settings, then refresh the homepage or About Us. These updates do not need a code deployment. Vyshnavi Bandi is included in the initial Additional Committee Members list. Existing committee and secretary details initialise the new editor; the secretary phone starts blank because none was supplied.

Captain fields remain in the existing HPCC club_settings record. New secretary and committee fields use one unpublished internal news_posts configuration record, hpcc-internal-club-public-settings. This avoids a new schema migration. Public contact data is extracted server-side; email provider credentials are never rendered in the contact cards. Generic news editing cannot alter internal settings records. Existing accounts, member IDs and payment records are not modified.

The About Us history contains the full eleven paragraphs supplied by HPCC on 26 October 2026, rather than the previous shortened summary. Its wider layout preserves paragraph breaks for readability.


Yearly committee update: use Settings → Committee by year for all role contacts and additional members. Preview and Save year, then Publish the selected year as current when ready. The general Settings save buttons no longer save committee fields, preventing stale contact values from overwriting a newly selected committee. See COMMITTEE_BY_YEAR.md for archives and concurrency handling.
