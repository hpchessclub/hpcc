"use client";
import {useEffect} from 'react';
export default function AdminIdleSession(){
 useEffect(()=>{let lastActivity=Date.now(),lastSaved=0,expired=false,saving=false;
 const logout=async()=>{if(expired)return;expired=true;try{await fetch('/club-admin/logout',{method:'POST'});}finally{window.location.replace('/club-admin/login?reason=session_expired');}};
 const activity=()=>{if(expired)return;if(Date.now()-lastActivity>=600000){void logout();return;}lastActivity=Date.now();localStorage.setItem('hpcc-admin-activity',String(lastActivity));void save();};
 const save=async()=>{if(saving||expired||Date.now()-lastSaved<30000)return;saving=true;try{const res=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'activity'})});if(!res.ok){void logout();return;}lastSaved=Date.now();}catch{}finally{saving=false;}};
 const tick=()=>{if(Date.now()-lastActivity>=600000){void logout();return;}if(lastActivity>lastSaved)void save();};
 const storage=(e:StorageEvent)=>{if(e.key==='hpcc-admin-activity'&&e.newValue){const time=Number(e.newValue);if(time<=Date.now()&&time>lastActivity)lastActivity=time;}};
 const events=['pointerdown','keydown','scroll','touchstart'];events.forEach(e=>window.addEventListener(e,activity,{passive:true}));window.addEventListener('storage',storage);const timer=setInterval(tick,5000);void save();
 return()=>{clearInterval(timer);events.forEach(e=>window.removeEventListener(e,activity));window.removeEventListener('storage',storage);};
 },[]);return null;
}
