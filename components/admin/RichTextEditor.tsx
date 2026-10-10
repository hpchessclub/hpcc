"use client";
import { useRef, useState } from "react";
import ImageCropUpload from "@/components/ImageCropUpload";
import MeetingSummary from "@/components/MeetingSummary";
import { formatSelection } from "@/lib/contentEditing";
export default function RichTextEditor({label,value,onChange,required,plain=false,manageImages=false}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;plain?:boolean;manageImages?:boolean}) {
  const input=useRef<HTMLTextAreaElement>(null);
  const [preview,setPreview]=useState(false);
  const photos = manageImages ? Array.from((value || "").matchAll(/!\[([^\]]*)\]\(([^\s)]+)\)/g)).map((match, index) => ({ markdown: match[0], caption: match[1], url: match[2], token: `[Photo ${index + 1}]` })) : [];
  const displayedText = photos.reduce((text, photo) => text.replace(photo.markdown, photo.token), value || "");
  function updateText(text: string) { onChange(photos.reduce((content, photo) => content.replace(photo.token, photo.markdown), text)); }
  function updatePhoto(index: number, url: string, caption: string) {
    const photo = photos[index]; const start = (value || "").indexOf(photo.markdown);
    if (start < 0) return;
    const safeCaption = caption.replace(/[\[\]\n]/g, " ");
    onChange(value.slice(0, start) + (url ? `![${safeCaption}](${url})` : "") + value.slice(start + photo.markdown.length));
  }
  function format(kind:string) {
    const el=input.current; if(!el)return;
    const result=formatSelection(displayedText,el.selectionStart,el.selectionEnd,kind);
    updateText(result.value);
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(result.start,result.end);});
  }
  const controls=plain ? [["bullet","Bullet list"],["number","Numbered list"]] : [["bold","Bold"],["italic","Italic"],["heading","Heading"],["bullet","Bullet list"],["number","Numbered list"],["quote","Quote"],["link","Link"],["table","Table"]];
  return <div><span className="admin-label">{label}{required ? " *" : ""}</span><div className="mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white"><div className="flex flex-wrap gap-1 border-b bg-stone-50 p-2">{controls.map(([kind,title])=><button key={kind} type="button" disabled={preview} onClick={()=>format(kind)} className="rounded border bg-white px-2 py-1 text-sm hover:bg-stone-100 disabled:opacity-40">{title}</button>)}<button type="button" onClick={()=>setPreview(!preview)} className="ml-auto rounded border bg-white px-3 py-1 text-sm font-bold">{preview ? "Edit text" : "Preview text"}</button></div><textarea ref={input} aria-label={label} value={displayedText} onChange={e=>updateText(e.target.value)} required={required} rows={10} className={`${preview ? "sr-only" : "block"} w-full resize-y p-4 text-sm leading-7 outline-none`} />{preview && <div className="min-h-40 p-4">{plain ? <div className="whitespace-pre-wrap break-words leading-7">{value}</div> : <MeetingSummary text={value}/>}</div>}</div>{manageImages && <section className="mt-5 space-y-5"><h3 className="font-bold">Photos and logos</h3><p className="text-sm text-stone-600">Browse for a picture, choose its crop and upload it. Photo markers in the text show where each image appears. Preview the page before saving.</p>{photos.map((photo, index) => <div key={index} className="rounded-xl border p-4"><h4 className="mb-3 font-bold">Photo {index + 1}</h4><ImageCropUpload label="Browse or replace image" bucket="news-images" value={photo.url} onChange={url => updatePhoto(index, url, photo.caption)}/><label className="mt-3 block text-sm font-semibold">Image description<input className="admin-input mt-1 w-full" value={photo.caption} onChange={e => updatePhoto(index, photo.url, e.target.value)}/></label><button type="button" className="btn-secondary mt-3 py-2" onClick={() => updatePhoto(index, "", "")}>Remove photo {index + 1}</button></div>)}<div className="rounded-xl border p-4"><h4 className="mb-3 font-bold">Add a photo</h4><ImageCropUpload label="Browse for a new image" bucket="news-images" onChange={url => onChange(`${value || ""}\n\n![Interschool Chess photo](${url})`)}/></div></section>}</div>;
}
