export type ProgrammeSection = { title: string; content: string };
export type ProgrammeYear = {year:number; title:string; sections:ProgrammeSection[]};
export function validateSections(value:unknown):ProgrammeSection[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>60)throw new Error("Use at most 60 sections per year.");
 return value.map(row=>{if(!row||typeof row.title!=="string"||!row.title.trim()||row.title.length>200||typeof row.content!=="string"||row.content.length>60000)throw new Error("Each section needs a heading (up to 200 characters) and valid content.");return {title:row.title.trim(),content:row.content};});
}
export function validateProgrammeYears(value:unknown):ProgrammeYear[]{
 if(!Array.isArray(value)||!value.length||value.length>100)throw new Error("Include between 1 and 100 years.");
 const seen=new Set<number>();return value.map(row=>{if(!row||!Number.isInteger(row.year)||row.year<1900||row.year>2200||seen.has(row.year))throw new Error("Each year must be unique and between 1900 and 2200.");seen.add(row.year);if(typeof row.title!=="string"||!row.title.trim()||row.title.length>200)throw new Error("Enter a year title (up to 200 characters).");return {year:row.year,title:row.title.trim(),sections:validateSections(row.sections)};});
}
