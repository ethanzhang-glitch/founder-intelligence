import { getAccountUser } from "../../lib/auth";
import { readAccount,mutateAccount,validatedProfile } from "../../lib/accounts";
import { state,investorDirectory,companyDirectory,trendData,getCompany,getInvestor,recordExists } from "../../lib/hosted-data";
import { industryPreferencesSchema,watchSchema } from "../../lib/validation";
import { hash } from "../../lib/ranking";
export const dynamic="force-dynamic";
const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"}});
const fail=(error:unknown)=>respond({error:error instanceof Error?error.message:"Request failed"},400);
export async function GET(request:Request){try{const user=await getAccountUser(request),account=await readAccount(user?.userId||null),p=new URL(request.url).searchParams,action=p.get("action");
 if(action==="session")return respond({signedIn:!!user,displayName:user?.displayName||null});
 const f={...Object.fromEntries(p),page:Math.min(1000,Math.max(1,Number(p.get("page"))||1)),saved:p.get("saved")==="true",geo:p.get("geo")||p.get("geography")||""};
 if(action==="investors")return respond(investorDirectory(f,account));if(action==="companies")return respond(companyDirectory(f,account));
 if(action==="company"){const c=getCompany(p.get("id")||"");return c?respond({longDescription:c.description}):respond({error:"Record not found"},404);}
 if(action==="trends")return respond(trendData());if(action==="research")return respond([]);
 if(action==="csv")return respond({error:"Use the page filters to browse. Bulk export is not available in this edition."},403);
 return respond(state(account,f));
 }catch(e){return fail(e);}}
export async function POST(request:Request){try{
 if(request.headers.get("origin")!==new URL(request.url).origin)return respond({error:"Only same-origin requests are accepted."},403);
 const user=await getAccountUser(request);if(!user)return respond({error:"Sign in using the account link above to save your personal information.",signIn:"/account"},401);
 const raw=await request.text();if(raw.length>40000)return respond({error:"The submitted content is too long."},413);const body=JSON.parse(raw),action=String(body.action||"");
 const allowed=["profile","industry-preferences","bookmark","article-note","investor-bookmark","company-bookmark","company-note","investor-save","watch-add","watch-delete","company-watch","investor-watch","briefing","notifications-read"];
 if(!allowed.includes(action))return respond({error:"Catalog administration and paid AI are not available in the public edition. Sources are updated by the maintainer."},403);
 let result:unknown={ok:true};
 await mutateAccount(user.userId,account=>{
  if(action==="profile"){account.profile={...account.profile,...validatedProfile(body.data)};return;}
  if(action==="industry-preferences"){const p=industryPreferencesSchema.parse(body.data);account.profile={...account.profile,sectors:[...new Set(p.sectors)].join(", "),interestedSectors:[...new Set(p.interestedSectors)].join(", "),industrySetupComplete:true,updatedAt:new Date().toISOString()};return;}
  if(action==="notifications-read")return;
  if(action==="briefing"){const snapshot=state(account),day=new Date().toISOString().slice(0,10),content=JSON.stringify({day,company:account.profile.company,overview:snapshot.digest.overview,sections:[],actions:[],available:snapshot.digest.available,window:"Past 7 days",mode:"Deterministic"}),cacheKey=hash(content);const existing=account.briefings.find(b=>b.cacheKey===cacheKey);if(existing){result=existing;return;}const brief={id:crypto.randomUUID(),cacheKey,day,content,createdAt:new Date().toISOString()};account.briefings=[brief,...account.briefings].slice(0,14);result=brief;return;}
  if(action==="watch-delete"){account.watches=account.watches.filter(w=>w.id!==body.id);return;}
  if(["watch-add","company-watch","investor-watch"].includes(action)){
   if(account.watches.length>=50)throw new Error("You can save up to 50 watchlist items.");
   const record=action==="company-watch"?getCompany(String(body.id)):action==="investor-watch"?getInvestor(String(body.id)):null;
   const data=action==="watch-add"?watchSchema.parse(body.data):record?{name:record.name,terms:record.name,kind:action==="company-watch"?"Competitor":"Investor"}:null;
   if(!data)throw new Error("Record not found.");if(!account.watches.some(w=>w.kind===data.kind&&w.terms===data.terms))account.watches.push({...data,id:crypto.randomUUID(),createdAt:new Date().toISOString()});return;
  }
  const kind=action.startsWith("company")?"company":action.startsWith("investor")?"investor":"article",id=String(body.id||"");if(!recordExists(kind,id))throw new Error("Record not found.");
  const key=`${kind}:${id}`;if(!account.records[key]&&Object.keys(account.records).length>=1000)throw new Error("You can save up to 1,000 personal records.");
  const entry={...account.records[key]};
  if(action.includes("bookmark")||action==="bookmark"){if(typeof body.saved!=="boolean")throw new Error("Invalid bookmark state.");entry.saved=body.saved;}
  else {const value=action==="investor-save"?body.data?.notes:kind==="company"?body.notes:body.note;if(typeof value!=="string"||value.length>6000)throw new Error("Notes must contain fewer than 6,000 characters.");if(kind==="article")entry.note=value;else entry.notes=value;}
  account.records[key]=entry;
 });return respond(result);
 }catch(e){return fail(e);}}
