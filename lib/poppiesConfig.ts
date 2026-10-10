export const POPPIES_CONFIG_SLUG = "hpcc-internal-poppies-settings";
export type PoppiesEvent = {year:number;title:string;date:string;time:string;venue:string;content:string;results:string;resultsUrl:string};
export type PoppiesConfig = {title:string;introduction:string;cardText:string;events:PoppiesEvent[]};
export const poppiesDefaults: PoppiesConfig = {
 title:"Poppies Chess Challenge",
 introduction:"An annual chess event at Poppies in Howick. Explore each year’s challenge, photographs and results.",
 cardText:"Discover the annual Poppies Chess Challenge in Howick, with event details, photographs and results from each year.",
 events:[{year:2026,title:"2026 Poppies Chess Challenge",date:"2026-07-25",time:"10:30am",venue:"Poppies Bookstore, 83 Picton Street, Howick, Auckland",content:`## Battle of the Sexes

CM Leo Baker versus members of New Zealand’s Women’s Olympiad squad: WFM Anya Thurner, WFM Nadia Braganza and WCM Sarah Sun.

The advertised programme was six rounds of blitz chess followed by a short presentation. These players were representing New Zealand at the 46th Chess Olympiad, including the Women’s competition, held 15–27 September 2026 in Samarkand, Uzbekistan.

Presented by Middle Game Chess Foundation, with Howick Village Association and Poppies Howick featured on the event poster.

## Olympiad fundraiser

Chess Aotearoa invited supporters to help New Zealand’s Chess Olympiad teams travel to Uzbekistan.

- Magazine: $15, with three editions available.
- Postcard: $3, with five designs available.
- Postcards were signed by two-time reigning New Zealand Champion IM Felix Xie.
- Proceeds were to be donated to the Olympiad Appeal.

For enquiries or preorders, the poster listed Weiyang at [chessmagnominations@gmail.com](mailto:chessmagnominations@gmail.com).

These are the advertised 2026 event details; future editions will be announced separately.`,results:"## 2026 match result\n\nCM Leo Baker won the six-game challenge **4½–1½** against WFM Sarah Sun, WCM Luna Lu and WCM Weiyang Yu.\n\nSarah Sun was undefeated against Leo, scoring one win and one draw.\n\nThe actual participants differed from the advance poster’s advertised lineup.\n\nThank you to Poppies Bookstore for hosting the annual event.\n\n[View the NZCF match report and event photo album](https://www.facebook.com/NewZealandChessFederation/posts/on-saturday-we-gathered-at-poppies-bookstore-for-the-annual-poppies-chess-challe/1349917040684226/)\n\nPhotographs credited by NZCF to **Weiyang Yu and Hao Yu**.",resultsUrl:"https://www.facebook.com/NewZealandChessFederation/posts/on-saturday-we-gathered-at-poppies-bookstore-for-the-annual-poppies-chess-challe/1349917040684226/"}]
};
export function validatePoppiesConfig(input: unknown): PoppiesConfig {
 if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid settings.");
 const p=input as Record<string,unknown>; const out={} as PoppiesConfig;
 for (const key of ["title","introduction","cardText"] as const) {if(typeof p[key]!=="string" || !p[key].trim() || p[key].length>2000)throw new Error(`Enter ${key} (maximum 2,000 characters).`);out[key]=p[key].trim();}
 if(!Array.isArray(p.events) || p.events.length<1 || p.events.length>100)throw new Error("Include between 1 and 100 yearly events.");
 const years=new Set<number>();
 out.events=p.events.map((row:any)=>{
  if(!row || !Number.isInteger(row.year) || row.year<1900 || row.year>2200 || years.has(row.year))throw new Error("Each event needs a unique valid year.");years.add(row.year);
  const event={year:row.year} as PoppiesEvent;
  for(const key of ["title","date","time","venue","content","results","resultsUrl"] as const){if(typeof row[key]!=="string" || row[key].length>30000)throw new Error(`Invalid ${key}.`);event[key]=row[key].trim();}
  if(!event.title)throw new Error("Event title is required.");
  if(event.date && (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || Number.isNaN(Date.parse(event.date)) || new Date(event.date).toISOString().slice(0,10)!==event.date || Number(event.date.slice(0,4))!==event.year))throw new Error("Enter an actual date within the event year, or leave it blank.");
  if(event.resultsUrl){const u=new URL(event.resultsUrl);if(!["http:","https:"].includes(u.protocol) || u.username || u.password)throw new Error("Use an HTTP or HTTPS results link.");}
  return event;
 });return out;
}
