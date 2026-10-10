export const SEASON_RESULTS_SLUG = "hpcc-internal-season-results";
export type SeasonResult = {year:number;title:string;winner:string;score:string;note:string;url:string;published:boolean};
export type ResultsLink = {label:string;url:string;note:string};
export type SeasonResultsConfig = {rows:SeasonResult[];events:ResultsLink[];archives:ResultsLink[]};
const base = "http://hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com";
const row=(title:string,winner:string,score:string,note="",url=""):SeasonResult=>({year:2026,title,winner,score,note,url,published:true});
export const seasonResultsDefaults:SeasonResultsConfig={rows:[
 row("Parkinson Cup","Andrew Janisz","7/8","",`${base}/documents/parkinson-cup-2026-results.pdf`),
 row("Autumn Lightning Cup","","","Finished Tuesday 28 April — result to come"),
 row("Fairhurst Pawn","Peter McKenzie","5.5/6","","https://www.vegaresults.com/vega/index.php?id=7979"),
 row("R Sutton Rapid","Jaden Lee","7/8","","https://www.vegaresults.com/vega/index.php?id=8291"),
 row("Club Championship","Sai Somaraju","6/7","","https://www.vegaresults.com/vega/index.php?id=8549"),
 row("Club Reserve Championship","Jamie Shizie Wang, Jacob Carr","6/7","","https://www.vegaresults.com/vega/index.php?id=8548"),
 row("President’s Cup (Lightning)","Jaden Lee","7.5/8","","https://www.vegaresults.com/vega/index.php?id=8976"),
 row("Ross Spiller Cup (Allegro Rapid)","","","Finished Tuesday 6 October — result to come"),
 row("Booth Shield","","","Starts Tuesday 13 October","https://www.vegaresults.com/vega/9144"),
 row("Gentil Knight Blitz Championship","","","Starts Tuesday 1 December")
],events:[
 {label:"Latvian Tournament 2026",url:`${base}/events/latvian-tournament-2026/`,note:"21 March 2026"},
 {label:"2026 NZCF East Auckland Interschool Chess Championships",url:"https://hpcc-flax.vercel.app/interschools",note:"20 May – 17 June 2026"},
 {label:"Club Night Tetra Titans 4 vs 4",url:`${base}/events/tetra-titans-2026/`,note:"14 July 2026"},
 {label:"HPCC v Auckland Central Chess Club",url:`${base}/news/hpcc-v-accc-club-match/`,note:"Auckland Central won the 11-board inter-club match 7½–3½."}
],archives:[2026,2025,2024,2023,2022,2021].map(year=>({label:`${year} results`,url:`${base}/results/${year}/`,note:""})).concat([{label:"Honours board",url:`${base}/honours/`,note:"Every winner of a club trophy"}])};
export function validateSeasonResults(input:unknown):SeasonResultsConfig{
 if(!input||typeof input!=="object")throw new Error("Invalid results configuration.");
 const p=input as any;
 const text=(v:unknown,max=2000)=>{if(typeof v!=="string"||v.length>max)throw new Error("Invalid result text.");return v.trim();};
 const url=(v:unknown)=>{const s=text(v);if(s){const u=new URL(s);if(!["http:","https:"].includes(u.protocol)||u.username||u.password)throw new Error("Use an HTTP or HTTPS link.");}return s;};
 if(!Array.isArray(p.rows)||p.rows.length>300)throw new Error("Maximum 300 results.");
 const rows=p.rows.map((r:any)=>{if(!r||!Number.isInteger(r.year)||r.year<1900||r.year>2200||typeof r.published!=="boolean")throw new Error("Enter a valid year and publication setting.");const title=text(r.title);if(!title)throw new Error("Tournament title is required.");return {year:r.year,title,winner:text(r.winner),score:text(r.score,100),note:text(r.note),url:url(r.url),published:r.published};});
 const links=(a:any)=>{if(!Array.isArray(a)||a.length>100)throw new Error("Maximum 100 links.");return a.map((r:any)=>{const label=text(r.label),u=url(r.url);if(!label||!u)throw new Error("Each link needs a label and URL.");return {label,url:u,note:text(r.note)};});};
 return {rows,events:links(p.events),archives:links(p.archives)};
}
