import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
export const ADMIN_IDLE_MS=10*60*1000;
const COOKIE='hpcc_admin_activity';
function signature(value:string){const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)throw new Error('Session configuration unavailable.');return createHmac('sha256',secret).update(`hpcc-admin-session:${value}`).digest('hex');}
export async function readAdminActivity(userId:string){const raw=(await cookies()).get(COOKIE)?.value;if(!raw)return null;const [id,time,mac]=raw.split('.');if(id!==userId||!/^\d+$/.test(time||'')||! /^[a-f0-9]{64}$/.test(mac||''))return null;const value=`${id}.${time}`;if(!timingSafeEqual(Buffer.from(mac),Buffer.from(signature(value))))return null;const activity=Number(time);if(activity>Date.now()+5000||Date.now()-activity>=ADMIN_IDLE_MS)return null;return activity;}
export async function writeAdminActivity(userId:string){const value=`${userId}.${Date.now()}`;(await cookies()).set(COOKIE,`${value}.${signature(value)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600});}
export async function clearAdminActivity(){(await cookies()).delete(COOKIE);}
