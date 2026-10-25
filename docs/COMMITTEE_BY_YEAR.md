# Committee by year
26 October 2026

Open Admin → Settings → Committee by year. The table shows Current, Published archive and Draft records. Edit each year's President, Secretary, Treasurer, Senior Club Captain, Junior Club Captain and additional committee members, including approved public email/phone details. Missing fields stay blank. Move additional member names between lines to reorder them.

Add a unique year. New years start blank, unless you explicitly select Copy selected year. Preview changes before Save year. Saving a new draft does not replace the current public committee. Publish the selected year as current to switch the website. Previous published years remain in About Us year links. The homepage always uses the explicitly selected current committee rather than switching automatically on 1 January.

The existing 2026 committee and configured contacts initialise the first record without deleting or modifying history on page load. On first Save, they are stored alongside any new drafts. Existing year records cannot be removed by the save endpoint. Current-year contact updates also synchronise the existing contact consumers. The general settings Save no longer submits stale copies of committee contacts.

Yearly records use an unpublished internal news_posts configuration document, hpcc-internal-committee-years. Its JSON contains separate records per year and an explicit activeYear. No SQL migration is needed. Saves use an updated_at version guard so concurrent editors must reload rather than silently overwrite one another. Server-side settings permissions apply. No emails, membership changes or payments are triggered.
