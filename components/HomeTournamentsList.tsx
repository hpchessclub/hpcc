"use client";
import {useState} from "react";
import TournamentCard from "@/components/TournamentCard";
export default function HomeTournamentsList({tournaments}:{tournaments:any[]}){
 const [visible,setVisible]=useState(3);
 return <div><div className="grid gap-4">{tournaments.slice(0,visible).map(t=><TournamentCard key={t.id} tournament={t}/>)}</div>{tournaments.length>visible&&<button type="button" onClick={()=>setVisible(v=>v+3)} className="btn-secondary mt-5 w-full sm:w-auto">Load More Tournaments</button>}</div>;
}
