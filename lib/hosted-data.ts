import catalog from "../data/public-catalog.json";
import { emptyAccount, type Account } from "./accounts";
import { rank, split, matches } from "./ranking";
import { makeDigest, extractSummary } from "./digest";
import { recommend } from "./recommendations";
import { investorOverview } from "./investor-overview";
import { INDUSTRIES, articleIndustryMatches, selectForIndustries } from "./industries";
const sources=catalog.sources.map(s=>({...s,_count:{articles:catalog.articles.filter(a=>a.sourceId===s.id).length}}));
export const PUBLIC_UPDATED_AT=catalog.publishedAt;
export type DirectoryFilters={q?:string;sector?:string;geo?:string;stage?:string;type?:string;lead?:string;style?:string;dataset?:string;background?:string;model?:string;status?:string;hq?:string;batch?:string;saved?:boolean;sort?:string;page?:number};
const STAGES=["Pre-seed","Seed","Series A","Series B","Series C","Growth","Multi-stage"];
const hasStage=(v:string,s:string)=>s==="unknown"?!STAGES.some(t=>split(v).includes(t)):split(v).some(t=>t.toLowerCase()===s.toLowerCase());
const hist=(values:string[],limit=50)=>{const m=new Map<string,number>();for(const value of values)for(const term of new Set(split(value||"")))m.set(term,(m.get(term)||0)+1);return [...m].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([name,count])=>({name,count}));};
function overlay<T extends {id:string}>(rows:T[],kind:string,account:Account){return rows.map(r=>({...r,...account.records[`${kind}:${r.id}`]}));}
const aliases:Record<string,string>={人工智能:"artificial intelligence",化学:"chemistry",金融科技:"fintech",教育:"education",医疗:"health",加拿大:"canada",中国:"china",欧洲:"europe",生物:"bio"};
function search(row:unknown,q=""){const text=JSON.stringify(row).toLowerCase();return q.trim().split(/\s+/).slice(0,8).every(t=>text.includes(aliases[t]||t.toLowerCase()));}
export function rankedArticles(account:Account,filters:DirectoryFilters={}){
 const terms=account.watches.flatMap(w=>split(w.terms));
 const rows=overlay(catalog.articles,"article",account).filter(a=>(!filters.saved||a.saved)&&(!filters.sector||split(a.tags).includes(filters.sector))&&(!filters.geo||a.geographies.includes(filters.geo))&&search({title:a.title,description:a.description},filters.q)).map(a=>({...a,publishedAt:a.publishedAt?new Date(a.publishedAt):null,source:sources.find(s=>s.id===a.sourceId)!,summary:extractSummary(a.description,a.title,account.profile.keywords),...rank({...a,content:""},account.profile,terms)}));
 return rows.sort(filters.sort==="newest"?(a,b)=>(b.publishedAt?.getTime()||0)-(a.publishedAt?.getTime()||0):(a,b)=>b.score-a.score||(b.publishedAt?.getTime()||0)-(a.publishedAt?.getTime()||0));
}
export function state(account=emptyAccount(),filters:DirectoryFilters={}){
 const profile=account.profile,articles=rankedArticles(account,filters),personalized=selectForIndustries(articles,profile);
 const investors=overlay(catalog.investors,"investor",account);
 const recommendations=investors.map(i=>{const match=recommend(i as never,profile as never);return {id:i.id,...match,overview:investorOverview(i,match)};}).sort((a,b)=>b.score-a.score).slice(0,100);
 const now=Date.now(),recent=articles.filter(a=>a.publishedAt&&a.publishedAt.getTime()<=now&&a.publishedAt.getTime()>now-7*86400000),relevant=selectForIndustries(recent,profile);
 const formatter=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto"}),today=Date.parse(`${formatter.format(now)}T12:00:00Z`);
 const timeline=Array.from({length:7},(_,i)=>{const day=new Date(today-(6-i)*86400000).toISOString().slice(0,10);return {day,label:day.slice(5).replace("-","/"),count:recent.filter(a=>formatter.format(a.publishedAt!)===day).length};});
 const competitors=account.watches.filter(w=>w.kind==="Competitor").flatMap(w=>split(w.terms));
 const digest=makeDigest(personalized,profile.keywords,new Date(),profile),page=Math.max(1,Math.min(167,filters.page||1)),pageSize=30;
 return {articles:articles.slice((page-1)*pageSize,page*pageSize),total:articles.length,coverage:articles.length,page,pageSize,profile,sources,investors:investors.filter(i=>recommendations.some(m=>m.id===i.id)),recommendations,watches:account.watches,notifications:[],companies:overlay(catalog.companys.filter(c=>c.dataset==="curated"),"company",account),monitor:null,monitorActive:false,datasets:catalog.datasets,
 digest:{...digest,overview:{...digest.overview,editorial:null}},desk:{timeline,industryCoverage:INDUSTRIES.map(i=>({...i,count:recent.filter(a=>split(a.tags).includes(i.id)).length})),recommended:relevant.slice(0,6).map(a=>({...a,matchedIndustries:articleIndustryMatches(a,profile)})),relevantCount:relevant.length,recent:[...recent].sort((a,b)=>b.publishedAt!.getTime()-a.publishedAt!.getTime()).slice(0,6),competitors:relevant.filter(a=>competitors.some(t=>matches(`${a.title} ${a.description}`,t))).slice(0,6),opportunities:relevant.filter(a=>a.tags.includes("Funding Opportunities")).slice(0,5)},counts:{articles:catalog.articles.length,investors:catalog.investors.length,companies:catalog.companys.length,saved:catalog.articles.filter(a=>account.records[`article:${a.id}`]?.saved).length,unread:0},briefings:account.briefings,usage:[],ai:{autoBriefing:false,available:false,model:"Disabled",tokenLimit:0,usdLimit:0,topArticles:5},facets:{sectors:[...INDUSTRIES.map(i=>i.id),"Venture Capital","Funding Opportunities","Regulation"],geographies:["Canada","United States","China","Singapore","Europe"]},publicUpdatedAt:PUBLIC_UPDATED_AT};
}
export function investorDirectory(f:DirectoryFilters={},account=emptyAccount()){
 const meta=overlay(catalog.investors,"investor",account);
 const all=meta.filter(i=>search(i,f.q)&&(!f.saved||i.saved)&&Object.entries({sectors:f.sector,geographies:f.geo,type:f.type,leadPreference:f.lead,style:f.style,headquarters:f.hq,founderFit:f.background,dataset:f.dataset}).every(([k,v])=>!v||String(i[k as keyof typeof i]).toLowerCase().includes(v.toLowerCase())));
 const filtered=f.stage?all.filter(i=>hasStage(i.stages,f.stage!)):all;
 const rows=filtered.map(i=>{const match=recommend(i as never,account.profile as never);return {...i,match,overview:investorOverview(i,match)};});
 const shortlist=[...rows].sort((a,b)=>b.match.score-a.match.score).slice(0,3);rows.sort(f.sort==="name"?(a,b)=>a.name.localeCompare(b.name):(a,b)=>b.match.score-a.match.score||a.name.localeCompare(b.name));
 const pageSize=30,page=Math.min(Math.max(1,f.page||1),Math.max(1,Math.ceil(rows.length/pageSize)));
 return {kind:"investors" as const,rows:rows.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:rows.length,overall:meta.length,shortlist,stageCounts:[...STAGES,"unknown"].map(name=>({name,count:all.filter(i=>hasStage(i.stages,name)).length})),summary:{sectors:hist(filtered.map(i=>i.sectors),5),knownChecks:filtered.filter(i=>i.checkSize).length,leads:filtered.filter(i=>/Lead/.test(i.leadPreference)).length,unknownStage:filtered.filter(i=>!i.stages).length,contactable:rows.filter(i=>i.overview.contacts.some(c=>c.kind!=="website")).length,company:account.profile.company,stage:account.profile.stage},facets:{sectors:hist(meta.map(i=>i.sectors),45),geographies:hist(meta.map(i=>i.geographies),35),types:hist(meta.map(i=>i.type),20),headquarters:hist(meta.map(i=>i.headquarters),50)}};
}
export function companyDirectory(f:DirectoryFilters={},account=emptyAccount()){
 const meta=overlay(catalog.companys,"company",account),rows=meta.filter(c=>search(c,f.q)&&(!f.saved||c.saved)&&Object.entries({sectors:f.sector,geographies:f.geo,backgroundTags:f.background,businessModel:f.model,operatingStatus:f.status,batch:f.batch,dataset:f.dataset}).every(([k,v])=>!v||String(c[k as keyof typeof c]).toLowerCase().includes(v.toLowerCase()))&&(!f.stage||c.stage===f.stage));
 rows.sort(f.sort==="team"?(a,b)=>(b.teamSize||0)-(a.teamSize||0):f.sort==="newest"?(a,b)=>(b.retrievedAt||"").localeCompare(a.retrievedAt||""):(a,b)=>a.name.localeCompare(b.name));
 const pageSize=30,page=Math.min(Math.max(1,f.page||1),Math.max(1,Math.ceil(rows.length/pageSize)));
 return {kind:"companies" as const,rows:rows.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:rows.length,overall:meta.length,summary:{curated:meta.filter(c=>c.dataset==="curated").length,backgrounds:meta.filter(c=>c.backgroundTags).length,regions:hist(meta.map(c=>c.geographies),5)},facets:{sectors:hist(meta.map(c=>c.sectors)),geographies:hist(meta.map(c=>c.geographies)),backgrounds:hist(meta.map(c=>c.backgroundTags),20),models:hist(meta.map(c=>c.businessModel),25),batches:hist(meta.map(c=>c.batch),100),statuses:hist(meta.map(c=>c.operatingStatus),10)}};
}
export function trendData(){const rows=catalog.articles.filter(a=>a.publishedAt&&new Date(a.publishedAt).getTime()>Date.now()-30*86400000&&a.tags.includes("Venture Capital"));const sectors:Record<string,number>={};for(const a of rows)for(const t of split(a.tags))if(t!=="Venture Capital")sectors[t]=(sectors[t]||0)+1;return {total:rows.length,sourceCount:new Set(rows.map(a=>a.sourceId)).size,sectors,weeks:Array.from({length:5},(_,i)=>{const start=Date.now()-(5-i)*7*86400000;return {label:new Date(start).toISOString().slice(5,10),count:rows.filter(a=>new Date(a.publishedAt!).getTime()>=start&&new Date(a.publishedAt!).getTime()<start+7*86400000).length};}),articles:rows.slice(0,30).map(a=>({...a,date:a.publishedAt,source:sources.find(s=>s.id===a.sourceId)?.name||""}))};}
export function recordExists(kind:string,id:string){return (kind==="article"?catalog.articles:kind==="investor"?catalog.investors:catalog.companys).some(r=>r.id===id);}
export function getCompany(id:string){return catalog.companys.find(c=>c.id===id);}
export function getInvestor(id:string){return catalog.investors.find(i=>i.id===id);}
