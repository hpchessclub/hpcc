import { POPPIES_CONFIG_SLUG } from "@/lib/poppiesConfig";
import { INTERSCHOOL_CONFIG_SLUG } from "@/lib/interschoolConfig";
import { JUNIOR_CONFIG_SLUG } from "@/lib/juniorConfig";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import CrudManager from "@/components/admin/CrudManager";
import { canUseSocialMedia } from "@/lib/roles";

export default async function NewsAdmin(){
  const admin = await requireAdmin("news");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("news_posts").select("*").neq("slug", JUNIOR_CONFIG_SLUG).neq("slug", INTERSCHOOL_CONFIG_SLUG).neq("slug", POPPIES_CONFIG_SLUG).neq("slug", "hpcc-internal-season-results").order("created_at",{ascending:false});
  const fields:any[] = [
    {name:'title',label:'News title',required:true},
    {name:'slug',label:'Slug - optional, auto generated if blank'},
    {name:'summary',label:'Short summary',textarea:true},
    {name:'image_url',label:'News image',type:'image',imageBucket:'news-images'},
    {name:'content',label:'News content',type: "richtext",required:true},
    {name:'is_published',label:'Publish this news post',type:'checkbox'},
    {name:'published_at',label:'Published date',type:'date'}
  ];
  if (canUseSocialMedia(admin.profile.role)) {
    fields.push({name:'publish_to_social',label:'Create social media post draft when saving',type:'checkbox'});
    fields.push({name:'social_platforms',label:'Select social media platforms',type:'multi_options',options:['Facebook','Instagram','YouTube','X','LinkedIn'],help:'A share-ready draft will be created under Social Posts.'});
  }
  return <div><CrudManager table="news_posts" title="Manage Weekly News" rows={data||[]} fields={fields} /><div className="card mt-6 p-5 text-sm text-slate-600"><b>Social media:</b> Select “Create social media post draft” and choose platforms to create a ready-to-copy post under Social Posts. Direct API auto-posting requires platform approval.</div></div>;
}
