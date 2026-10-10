export const INTERSCHOOL_CONFIG_SLUG = "hpcc-internal-interschool-settings";
export const interschoolDefaults = {
 title: "Interschool Chess",
 introduction: "Bring your school into the game. Explore East Auckland school chess, team participation and opportunities for students.",
 cardText: "Bring your school into the game. Ask about school chess events, team participation and opportunities for students.",
 content: `## East Auckland school chess

HPCC organises school team chess for primary, intermediate and secondary students. Contact the club about future events and school participation.

## 2026 regional championship results

### Secondary

Seventeen teams from four schools competed at Bucklands & Eastern Beach War Memorial Hall on 17 June 2026.

1. Macleans College — Team A
2. St Kentigern College — Team A
3. Macleans College — Team B

[Full secondary results](https://interschools.chessclub.nz/2026/east-auckland/secondary/results/)

### Intermediate

Seventeen teams from five schools took part.

1. Bucklands Beach Intermediate School — Team A
2. Somerville Intermediate School — Team A
3. St Kentigern College — Team A

[Full intermediate results](https://interschools.chessclub.nz/2026/east-auckland/intermediate/results/)

### Primary

Thirty-eight teams from sixteen schools participated.

1. Pigeon Mountain Primary School — Team A
2. Willowbank School — Team A
3. Cockle Bay Primary School — Team A

Thank you to the teachers, parents, volunteers and arbiters who supported these events.

[Original HPCC report, player names, board prizes and photographs](https://www.hpchessclub.org/clubnews)

## School enquiries

Please contact HPCC for upcoming dates, entry arrangements and opportunities for your school.`,
 enquiryUrl: "/contact?programme=interschool"
};
export type InterschoolConfig = typeof interschoolDefaults;
export function validateInterschoolConfig(input: unknown): InterschoolConfig {
 if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid settings.");
 const result = {} as InterschoolConfig;
 for (const key of Object.keys(interschoolDefaults) as (keyof InterschoolConfig)[]) {
  const value = (input as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value.trim() || value.length > 30000) throw new Error(`Enter ${key} (maximum 30,000 characters).`);
  result[key] = value.trim();
 }
 const url = new URL(result.enquiryUrl, "https://hpcc-flax.vercel.app");
 if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || result.enquiryUrl.startsWith('//')) throw new Error("Use a valid enquiry link.");
 return result;
}
