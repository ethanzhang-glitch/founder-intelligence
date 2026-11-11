import { z } from "zod";
import { hash } from "./ranking";

const section=z.object({title:z.string().min(1),body:z.string().min(1),why:z.string().min(1),action:z.string().min(1),sourceIds:z.array(z.string()).min(1).max(5)});
export const editorialDraftSchema=z.object({title:z.string().min(1),lead:z.string().min(1),sections:z.array(section).min(1).max(5)});
type Article={id:string;title:string;description:string;url:string;publishedAt:Date|null;source:{name:string}};
type Profile={keywords:string;stage:string;sectors:string;interestedSectors?:string};
const sourceSchema=z.object({id:z.string(),title:z.string(),url:z.string().url(),source:z.string(),date:z.string(),fingerprint:z.string()});
const cacheSchema=editorialDraftSchema.extend({version:z.literal(1),generatedAt:z.string().datetime(),contextKey:z.string(),sources:z.array(sourceSchema).min(1).max(8)});
export type Editorial=z.infer<typeof cacheSchema>&{newArticles:number};
const contextKey=(p:Profile)=>hash(JSON.stringify([p.keywords,p.stage,p.sectors,...(p.interestedSectors?[p.interestedSectors]:[])]));
const fingerprint=(a:Article)=>hash(JSON.stringify([a.title,a.description,a.url,a.publishedAt?.toISOString()]));

// A saved synthesis must stay attached to the exact excerpts it summarized.
export function cacheEditorial(draft:unknown,articles:Article[],profile:Profile,now=new Date()){
 const parsed=editorialDraftSchema.parse(draft);
 const sourceIds=[...new Set(parsed.sections.flatMap(s=>s.sourceIds))];
 const sources=sourceIds.map(id=>{
  const a=articles.find(a=>a.id===id);
  if(!a?.publishedAt||a.publishedAt>now||a.publishedAt.getTime()<=now.getTime()-7*86400000)throw new Error(`Missing or out-of-window source: ${id}`);
  return {id:a.id,title:a.title,url:a.url,source:a.source.name,date:a.publishedAt.toISOString(),fingerprint:fingerprint(a)};
 });
 return cacheSchema.parse({...parsed,version:1,generatedAt:now.toISOString(),contextKey:contextKey(profile),sources});
}
export function readEditorial(content:string|undefined,articles:Article[],profile:Profile,now=new Date()):Editorial|null{
 if(!content)return null;
 try{
  const cached=cacheSchema.parse(JSON.parse(content));
  const generated=new Date(cached.generatedAt).getTime();
  if(generated>now.getTime()||generated<=now.getTime()-7*86400000||cached.contextKey!==contextKey(profile))return null;
  if(cached.sections.some(s=>s.sourceIds.some(id=>!cached.sources.some(a=>a.id===id))))return null;
  if(cached.sources.some(s=>{const a=articles.find(a=>a.id===s.id);return !a?.publishedAt||a.publishedAt>now||a.publishedAt.getTime()<=now.getTime()-7*86400000||fingerprint(a)!==s.fingerprint;}))return null;
  return {...cached,newArticles:articles.filter(a=>a.publishedAt&&a.publishedAt<=now&&a.publishedAt.getTime()>generated).length};
 }catch{return null;}
}
