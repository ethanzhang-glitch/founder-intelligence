import { INDUSTRIES, industryLabel, preferredIndustries, selectForIndustries, detectIndustries } from "./industries";
import { matches,split } from "./ranking";
import type { Editorial } from "./editorial";

// Extract sentences already present in publisher excerpts; no generated factual claims.
export function extractSummary(description:string,title:string,keywords:string,limit=320){
 const clean=description.replace(/The post [\s\S]*?(?:appeared first on|first appeared on)[\s\S]*$/i,"").replace(/Read (?:the )?(?:full|complete) (?:story|article)[\s\S]*$/i,"").replace(/\s+/g," ").trim();
 if(!clean||clean.toLowerCase()===title.toLowerCase())return "No separate summary was provided. Open the original source to read more.";
 const sentences=Array.from(new Intl.Segmenter("en",{granularity:"sentence"}).segment(clean),s=>s.segment.trim()).filter(Boolean);
 const words=split(keywords);const scored=sentences.map((text,index)=>({text,index,score:words.filter(k=>matches(text,k)).length*2+(index===0?3:0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
 let chosen=scored.slice(0,2).sort((a,b)=>a.index-b.index).map(s=>s.text).join(" ");
 if(chosen.length>limit)chosen=chosen.slice(0,limit).replace(/\s+\S*$/,"")+"…";
 return chosen;
}
export type DigestArticle={id:string;title:string;description:string;publishedAt:Date|null;tags:string;score:number;reasons:string[];source:{name:string};url:string;saved:boolean};
type Context={company?:string;stage?:string;sectors?:string;interestedSectors?:string};
// Group evidence, quote source facts, and attach explicitly rule-based implications.
// Counts describe this feed sample, never market growth or aggregate invested capital.
function overview(recent:DigestArticle[],keywords:string,now:Date,context:Context){
 const money=(a:DigestArticle)=>/\b(?:funding|fundrais\w*|raises?|raised|investors?|pre-seed|seed round|series [a-f]|venture capital)\b/i.test(`${a.title} ${a.description}`);
 const policy=(a:DigestArticle)=>/\b(?:regulat\w*|legislation|antitrust|tariffs?|applications open|grants?|deadline)\b/i.test(`${a.title} ${a.description}`);
 const topics=[
  {id:"funding",title:"Funding: identify potential backers",rows:recent.filter(money),why:`${context.stage?`At the ${context.stage} stage, comparable`:"Comparable"} rounds can help you identify investors and compare fundraising narratives. Large late-stage rounds provide context, not a valuation benchmark for your company.`,action:"Check the lead investor, round and investment focus, then compare firms in the investor directory.",href:"/investors"},
  {id:"science",title:"Industries & products: follow demand and change",rows:recent.filter(a=>!money(a)&&!policy(a)),why:`${preferredIndustries(context).length?`Your focus: ${preferredIndustries(context).map(industryLabel).slice(0,3).join(", ")}. `:""}Prioritize changes in products, customer needs and business models that affect you. One case does not represent an entire industry.`,action:"Check the customers, product and supporting evidence in the original report before researching the company or testing the direction.",href:"/companies"},
  {id:"policy",title:"Policy & programs: verify requirements and dates",rows:recent.filter(a=>!money(a)&&policy(a)),why:"Policy can affect market access, while programs may offer funding or support. A report's publication date does not establish eligibility or an application deadline.",action:"Check official documents or program pages for deadlines, incorporation requirements and eligibility.",href:"/watchlists"}
 ];
 const sections=topics.filter(t=>t.rows.length).map(t=>{
  const relevant=t.rows.filter(a=>split(keywords).some(k=>matches(`${a.title} ${a.description}`,k)));
  const chosen=(relevant.length?relevant:t.rows).slice(0,2);
  const facts=chosen.map(a=>{
   // Only translate a narrow, unambiguous fundraising clause from its source.
   const clause=a.description.match(/^([A-Z][\w&.'’ -]{1,55}?)\s+(?:has raised|raised)\s+([$€£]\d[\d,.]*(?:\s*(?:million|billion|[MB]))?)(?:\s+in\s+(pre-seed|seed|Series [A-F]))?/i)||a.title.match(/^(.{2,55}?)\s+raises\s+([$€£]\d[\d,.]*(?:\s*(?:million|billion|[MB]))?)(?:\s+(Series [A-F]))?/i);
   return {id:a.id,title:a.title,url:a.url,source:a.source.name,date:a.publishedAt?.toISOString()||null,text:clause?`${clause[1]} reported funding of ${clause[2]}${clause[3]?` (${clause[3]})`:""}. `:extractSummary(a.description,a.title,keywords,220),translated:!!clause};
  });
  const themes=[...new Set(chosen.flatMap(a=>detectIndustries(`${a.title} ${a.description}`)))].slice(0,3).map(industryLabel);
  return {id:t.id,title:t.title,count:t.rows.length,summary:`This snapshot includes ${t.rows.length} relevant reports${themes.length?`, with a focus on ${themes.join(", ")}`:""}. ${relevant.length?`Of these, ${relevant.length} match your keywords.`:"Examples below are selected by research priority."}`,why:t.why,action:t.action,href:t.href,facts};
 });
 const newCount=recent.filter(a=>a.publishedAt!.getTime()>now.getTime()-86400000).length;
 return {title:recent.length?"Start here, then choose what to read":"No recent news to summarize",intro:recent.length?`Past 7 days — ${preferredIndustries(context).length?"related to your industries:":"collected:"} ${recent.length} stories; ${newCount} published in the past 24 hours. Organized into ${sections.length} priorities, with up to two supporting sources each.`:"No stories in the collected sources match your industries over the past 7 days. Adjust your industries or browse all news.",sections,newCount,method:"Free rules-based summary · Source facts and interpretation are separate · Source excerpts retained; funding statements are structured without adding facts"};
}
export type DailyOverview=ReturnType<typeof overview>&{editorial?:Editorial|null};
export function makeDigest(articles:DigestArticle[],keywords:string,now=new Date(),context:Context={}){
 const recent=selectForIndustries(articles,context).filter(a=>a.publishedAt&&a.publishedAt<=now&&a.publishedAt.getTime()>now.getTime()-7*86400000);
 const sourceCounts=new Map<string,number>();const selected:DigestArticle[]=[];
 const titleWords=(s:string)=>new Set(s.toLowerCase().match(/[a-z]{4,}/g)||[]);
 for(const article of recent){if(selected.length>=8)break;if((sourceCounts.get(article.source.name)||0)>=3)continue;
  const words=titleWords(article.title);if(selected.some(a=>{const other=titleWords(a.title);return words.size>3&&[...words].filter(w=>other.has(w)).length/Math.max(words.size,other.size)>.7;}))continue;
  selected.push(article);sourceCounts.set(article.source.name,(sourceCounts.get(article.source.name)||0)+1);
 }
 const groups=[{name:"Funding & investment",tags:["Venture Capital","Funding Opportunities"],action:"Check funding stages and investors, then add relevant firms to your shortlist."},{name:"Industries you follow",tags:preferredIndustries(context).length?preferredIndustries(context):INDUSTRIES.map(i=>i.id),action:"Assess product and demand changes before choosing which source to read."},{name:"Industry & policy",tags:["Deep Tech","Regulation","SaaS"],action:"Check whether the development affects your positioning, customers or launch plans."}];
 return {window:"Past 7 days",available:recent.length,sources:new Set(recent.map(a=>a.source.name)).size,overview:overview(recent,keywords,now,context),selected:selected.map(a=>({...a,summary:extractSummary(a.description,a.title,keywords)})),groups:groups.map(g=>({...g,count:recent.filter(a=>g.tags.some(t=>split(a.tags).includes(t))).length,headlines:recent.filter(a=>g.tags.some(t=>split(a.tags).includes(t))).slice(0,2).map(a=>({id:a.id,title:a.title,url:a.url}))})),generatedAt:now.toISOString()};
}
