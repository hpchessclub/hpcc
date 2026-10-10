export const HPCC_RESULTS_SOURCE = "http://hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com/results/";
export type ImportedResult={title:string;year:number;winner:string;score:string;url:string};
function text(html:string){return html.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim();}
export function parseTournamentResults(html:string):ImportedResult[]{
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];if(!main)throw new Error('Results page content could not be read.');
 const year=Number(text(main).match(/(20\d{2}) season results/i)?.[1]);if(!year)throw new Error('Results season could not be identified.');
 const table=main.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];if(!table)throw new Error('Tournament results table was not found.');
 const rows:ImportedResult[]=[];
 for(const tr of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(m=>m[1]);if(cells.length!==4)continue;
  const [title,winner,score]=cells.map(text);if(!title||!winner||!/^\d+(?:\.\d+)?\s*\/\s*\d+$/.test(score))continue;
  const href=cells[3].match(/href=["']([^"']+)["']/i)?.[1];const url=href?new URL(text(href),HPCC_RESULTS_SOURCE):null;
  if(url&&(!['http:','https:'].includes(url.protocol)||!['www.vegaresults.com','vegaresults.com','hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com'].includes(url.hostname)))throw new Error('An unexpected results link was found.');
  rows.push({title,year,winner,score,url:url?.href||''});
 }
 if(!rows.length)throw new Error('No completed tournament results were found.');
 if(new Set(rows.map(r=>r.title.toLowerCase())).size!==rows.length)throw new Error('Duplicate source tournament titles need review.');
 return rows;
}
