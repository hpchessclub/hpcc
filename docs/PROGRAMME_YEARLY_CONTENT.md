# Poppies and Interschool yearly content
Revision: 25 October 2026

Open Poppies Chess Challenge or Interschool Chess in Club Admin. Select a year, or choose **Add year** and enter a unique year. Earlier years remain available. Add additional sections for announcements, programmes, school divisions, winners, results or photographs. Each section has a heading and a rich text editor with image browsing/cropping. Move sections up or down to change their display order.

Preview the page and then Save changes. Saving updates the public programme page and its homepage description. All years are displayed newest first with year navigation links. Poppies retains its existing date, time, venue, programme and results fields.

Storage uses HPCC's existing `news_posts` table. Each saved year has an individual unpublished internal record with a stable `hpcc-internal-…-settings-year-YYYY` slug. The parent settings record retains the full configuration for backward compatibility. All records are upserted in a single database statement and returned content is checked before success is reported. Public programme pages read these internal records through the server; they are not published as news or social posts.

Existing settings are read without writing or removing anything. On the first successful admin save, the existing content and new yearly records are saved together. No SQL migration is required. No dates or results are invented for a new year. Removing a section affects only that year and requires confirmation followed by Preview and Save; this editor does not delete historical year records.
