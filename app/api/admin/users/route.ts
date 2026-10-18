import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ROLES } from "@/lib/roles";

async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (admin?.profile.role !== "super_admin") return null;
  return admin;
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  const s = createSupabaseServiceClient();
  try {
    const profiles: any[] = [];
    for (let start = 0; ; start += 1000) {
      const {data,error} = await s.from("profiles").select("*").order("id").range(start,start+999);
      if(error) throw new Error(error.message);
      profiles.push(...(data||[])); if((data||[]).length<1000)break;
    }
    const authUsers: any[] = [];
    for (let page=1; ; page++) {
      const {data,error}=await s.auth.admin.listUsers({page,perPage:1000});
      if(error)throw new Error(error.message);
      authUsers.push(...data.users.filter((user:any)=>!user.deleted_at));
      if(data.users.length<1000)break;
    }
    const merged = new Map(profiles.map(profile=>[profile.id,{...profile,has_profile:true,has_auth:false}]));
    for(const user of authUsers){
      const existing=merged.get(user.id);const meta=user.user_metadata||{};
      merged.set(user.id,existing?{...existing,email:user.email||existing.email,has_auth:true}:{id:user.id,email:user.email,first_name:meta.first_name||"",last_name:meta.last_name||"",full_name:meta.full_name||"",role:"member",is_active:false,created_at:user.created_at,has_profile:false,has_auth:true});
    }
    const users=[...merged.values()].sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")));
    return NextResponse.json({users,current_user_id:admin.user.id},{headers:{"Cache-Control":"no-store"}});
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to load users."},{status:400});}
}

export async function POST(req: Request) {
  if(req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Invalid request origin."},{status:403});
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  const body = await req.json();
  const s = createSupabaseServiceClient();

  if (body.action === "create") {
    const first_name = String(body.first_name || "").trim();
    const last_name = String(body.last_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = ROLES.includes(body.role) ? body.role : "member";
    if (!email || !password || !first_name) return NextResponse.json({ error: "First name, email and password are required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const { data: created, error: createError } = await s.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, full_name: [first_name, last_name].filter(Boolean).join(" ") },
    });
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    const id = created.user?.id;
    if (!id) return NextResponse.json({ error: "User was not created." }, { status: 400 });
    const full_name = [first_name, last_name].filter(Boolean).join(" ");
    const { error } = await s.from("profiles").upsert({ id, email, first_name, last_name, full_name, role, is_active: true, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { id, role, is_active, first_name, last_name } = body;
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  const full_name = [first_name, last_name].filter(Boolean).join(" ");
  if(typeof is_active!=="boolean")return NextResponse.json({error:"Invalid active setting."},{status:400});
  if(id===admin.user.id && (role!=="super_admin"||!is_active))return NextResponse.json({error:"You cannot remove your own Super Admin access."},{status:400});
  const {data:authUser,error:authError}=await s.auth.admin.getUserById(id);
  if(authError||!authUser.user)return NextResponse.json({error:"This account has no Auth login. Remove the stale profile or recreate the login."},{status:400});
  const { data: saved, error } = await s.from("profiles").upsert({id,email:authUser.user.email,role,is_active,first_name:String(first_name||""),last_name:String(last_name||""),full_name,updated_at:new Date().toISOString()}).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if(!saved)return NextResponse.json({error:"Profile update could not be verified."},{status:400});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if(req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Invalid request origin."},{status:403});
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (id === admin.user.id) return NextResponse.json({ error: "You cannot delete your own Super Admin account while logged in." }, { status: 400 });
  const s = createSupabaseServiceClient();
  const {data:target,error:lookupError}=await s.auth.admin.getUserById(id);
  if(lookupError && lookupError.status!==404)return NextResponse.json({error:lookupError.message},{status:400});
  if(target.user){
    const {error}=await s.auth.admin.deleteUser(id);
    if(error){
      // Preserve owned club photos and content while removing application access.
      const {data:blocked,error:blockError}=await s.from("profiles").upsert({id,email:target.user.email,role:"member",is_active:false,updated_at:new Date().toISOString()}).select("id,role,is_active").single();
      if(blockError||!blocked||blocked.is_active||blocked.role!=="member")return NextResponse.json({error:`Account deletion failed: ${error.message}. Access removal also failed: ${blockError?.message||"not verified"}`},{status:400});
      return NextResponse.json({ok:true,removed:false,message:`Admin access removed. The Auth account was retained because Supabase blocked deletion: ${error.message}. Club photos and records were preserved.`});
    }
    const {data:remaining,error:verifyError}=await s.auth.admin.getUserById(id);
    if(remaining.user || (verifyError && verifyError.status!==404))return NextResponse.json({error:"Auth account deletion could not be verified."},{status:400});
  }
  const {error:profileError}=await s.from("profiles").delete().eq("id",id);
  if(profileError)return NextResponse.json({error:`Login removed, but profile cleanup failed: ${profileError.message}`},{status:400});
  const {data:remainingProfile,error:verifyProfileError}=await s.from("profiles").select("id").eq("id",id).maybeSingle();
  if(verifyProfileError||remainingProfile)return NextResponse.json({error:"Profile deletion could not be verified."},{status:400});
  return NextResponse.json({ok:true,removed:true,message:"User login and profile removed."});
}
