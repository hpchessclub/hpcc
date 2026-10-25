export type ProgrammeSection = { title: string; content: string };
export type ProgrammeYear = {year:number; title:string; displayOrder?:number; sections:ProgrammeSection[]};
export function validateSections(value:unknown):ProgrammeSection[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>60)throw new Error("Use at most 60 sections per year.");
 return value.map(row=>{if(!row||typeof row.title!=="string"||!row.title.trim()||row.title.length>200||typeof row.content!=="string"||row.content.length>60000)throw new Error("Each section needs a heading (up to 200 characters) and valid content.");return {title:row.title.trim(),content:row.content};});
}
export function validateProgrammeYears(value:unknown):ProgrammeYear[]{
 if(!Array.isArray(value)||!value.length||value.length>100)throw new Error("Include between 1 and 100 years.");
 const seen=new Set<number>();return value.map(row=>{if(!row||!Number.isInteger(row.year)||row.year<1900||row.year>2200||seen.has(row.year))throw new Error("Each year must be unique and between 1900 and 2200.");seen.add(row.year);if(typeof row.title!=="string"||!row.title.trim()||row.title.length>200)throw new Error("Enter a year title (up to 200 characters).");return {year:row.year,title:row.title.trim(),...(row.displayOrder===undefined?{}:{displayOrder:validateDisplayOrder(row.displayOrder)}),sections:validateSections(row.sections)};});
}
export function orderedProgrammeYears<T extends {year:number;displayOrder?:number}>(rows:T[]):T[]{
 return [...rows].sort((a,b)=>(a.displayOrder??-a.year)-(b.displayOrder??-b.year)||b.year-a.year);
}
export function reorderProgrammeYears<T extends {year:number;displayOrder?:number}>(rows:T[],year:number,offset:number):T[]{
 const next=orderedProgrammeYears(rows);const index=next.findIndex(row=>row.year===year);const target=index+offset;
 if(index<0||target<0||target>=next.length)return rows;
 [next[index],next[target]]=[next[target],next[index]];
 return next.map((row,displayOrder)=>({...row,displayOrder}));
}
export function validateDisplayOrder(value:unknown):number|undefined{
 if(value===undefined)return undefined;
 if(!Number.isInteger(value)||Number(value)<0||Number(value)>10000)throw new Error("Invalid display order.");return Number(value);
}
export function moveProgrammePhoto(content:string,index:number,offset:number):string{
 const photos=Array.from(content.matchAll(/!\[([^\]]*)\]\(([^\s)]+)\)/g));const target=index+offset;
 if(!photos[index]||!photos[target])return content;
 const first=photos[Math.min(index,target)],last=photos[Math.max(index,target)];
 return content.slice(0,first.index)+last[0]+content.slice(first.index!+first[0].length,last.index)+first[0]+content.slice(last.index!+last[0].length);
}
