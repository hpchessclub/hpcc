# Poppies and Interschool yearly content
Revision: 25 October 2026

Open Poppies Chess Challenge or Interschool Chess in Club Admin. Select a year, or choose **Add year** and enter a unique year. Earlier years remain available. Add additional sections for announcements, programmes, school divisions, winners, results or photographs. Each section has a heading and a rich text editor with image browsing/cropping. Move sections up or down to change their display order.

Preview the page and then Save changes. Saving updates the public programme page and its homepage description. All years are displayed newest first with year navigation links. Poppies retains its existing date, time, venue, programme and results fields.

Storage uses HPCC's existing `news_posts` table. Each saved year has an individual unpublished internal record with a stable `hpcc-internal-…-settings-year-YYYY` slug. The parent settings record retains the full configuration for backward compatibility. All records are upserted in a single database statement and returned content is checked before success is reported. Public programme pages read these internal records through the server; they are not published as news or social posts.

Existing settings are read without writing or removing anything. On the first successful admin save, the existing content and new yearly records are saved together. No SQL migration is required. No dates or results are invented for a new year. Removing a section affects only that year and requires confirmation followed by Preview and Save; this editor does not delete historical year records.

## Record list and photo ordering
Both admin pages show a Yearly records table with display position, year, title, section count and photo count. Select **Edit / Photos** to jump to that year's editor. Use the row arrows to change the public year order. Order is stored with the yearly record and is retained after reloading; records without an explicit order initially use newest year first.

Use **Browse for a new image** in the selected record's content or section editor to add more photographs, then crop and upload. Each existing photo has Move photo up/down controls as well as replace, description and remove controls. Photo order changes swap the image positions without deleting surrounding text. Sections retain their separate Move up/down controls. Preview and Save changes after any edits or reordering.
