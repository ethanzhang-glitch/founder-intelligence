import { detectIndustries, normalizeIndustries } from "./industries";
import type { Investor, Profile } from "@prisma/client";
import { matches as has, split } from "./ranking";

const concepts:Record<string,string[]>={
  "Artificial Intelligence":["artificial intelligence","ai","ai / data","人工智能"],
  "Chemistry":["chemistry","chemical","化学"],"Biotechnology":["biotechnology","biotech","life sciences","healthcare","生物"],
  "Deep Tech":["deep tech","deep-tech","硬科技","深科技"],"Scientific Software":["scientific software","科学软件"],
  "SaaS":["saas","enterprise software"],"Materials":["materials","材料"],
  "Pre-seed":["pre-seed","preseed","idea","company formation","创意","种子前"],"Seed":["seed","种子"],
  "Series A":["series a","a轮"],"Growth":["growth","series b","series c","成长期"],
  "Canada":["canada","canadian","montreal","montréal","toronto","vancouver","加拿大","蒙特利尔"],
  "United States":["united states","usa","美国"],"China":["china","中国"],"Singapore":["singapore","新加坡"],
  "Europe":["europe","germany","france","united kingdom","欧洲","德国","法国","英国"],
  "PhD":["phd","ph.d","博士"],"Researcher":["researcher","scientist","academic","科研","研究员"],
  "Student":["student","学生","在读"],"Recent graduate":["recent graduate","应届"],
  "Technical founder":["technical founder","engineer","developer","工程师","技术创始人"],
  "University spinout":["university spinout","spin-out","高校成果转化"],"Industry operator":["industry operator","industry experience","产业经验"],
  "Dropout":["dropout","退学"]
};
function matches(text:string,term:string){return (concepts[term]||[term]).some(t=>/[\u3400-\u9fff]/.test(t)?text.includes(t):has(text,t));}
function overlap(left:string,right:string,allowed?:string[]){return (allowed||Object.keys(concepts)).filter(term=>matches(left,term)&&matches(right,term));}
const stages=["Pre-seed","Seed","Series A","Growth"];
const regions=["Canada","United States","China","Singapore","Europe"];
const backgrounds=["PhD","Researcher","Student","Recent graduate","Technical founder","University spinout","Industry operator","Dropout"];
export function recommend(investor:Omit<Investor,"rawJson">,profile:Profile){
  const reasons:string[]=[];const gaps:string[]=[];
  const investorSectors=detectIndustries(investor.sectors);
  const sectorMatches=normalizeIndustries(profile.sectors).filter(s=>investorSectors.includes(s));
  const generalist=(has(investor.sectors,"Generalist")||investor.style==="Generalist");
  const sector=sectorMatches.length?Math.min(40,20+sectorMatches.length*10):generalist?10:0;
  if(sectorMatches.length)reasons.push(`Sector overlap: ${sectorMatches.join(", ")}`);else if(generalist)reasons.push("Generalist mandate; confirm interest in your category");else gaps.push("No documented sector overlap");
  // Pre-seed must not accidentally count as a standalone seed match.
  const cleanStage=(s:string)=>s.replace(/pre-seed|preseed/gi,"company formation");
  const stageMatches=overlap(cleanStage(profile.stage),cleanStage(investor.stages),stages);
  const broadEarly=has(investor.stages,"Early stage")&&overlap(cleanStage(profile.stage),"company formation, seed",stages).length>0;
  const stage=stageMatches.length?25:broadEarly?12:0;
  if(stageMatches.length)reasons.push(`Stage: ${stageMatches.join(", ")}`);else if(broadEarly)reasons.push("Broad early-stage mandate; precise entry stage unconfirmed");else gaps.push(investor.stages?"Your stage is not in the recorded entry stages":"Entry stage not recorded");
  const geoMatches=overlap(profile.geographies,investor.geographies,regions);
  const geography=geoMatches.length||has(investor.geographies,"Global")?15:0;
  if(geoMatches.length)reasons.push(`Target-region overlap: ${geoMatches.join(", ")}`);else if(geography)reasons.push("International / global program scope");else gaps.push("Geographic eligibility needs confirmation");
  const biography=`${profile.founderBackground} ${profile.education} ${profile.expertise}`;
  const backgroundMatches=overlap(biography,investor.founderFit,backgrounds);
  const background=backgroundMatches.length?15:0;
  if(backgroundMatches.length)reasons.push(`Background alignment: ${backgroundMatches.join(", ")}`);
  if(!biography.trim())gaps.push("Add your background to assess founder fit");
  if(investor.founderFit&&!backgroundMatches.length&&biography.trim())gaps.push(`Founder focus to check: ${investor.founderFit}`);
  const keywords=split(profile.keywords).filter(k=>k.length>3&&has(`${investor.thesis} ${investor.evidence}`,k));
  const keyword=keywords.length?5:0;
  if(keywords.length)reasons.push(`Thesis terms: ${keywords.slice(0,3).join(", ")}`);
  if(investor.eligibility)gaps.push(investor.eligibility);
  if(investor.exclusions)gaps.push(`Source-stated exclusions: ${investor.exclusions}`);
  if(profile.fundingGoal)gaps.push(`Check-size fit is unscored: confirm capacity for ${profile.fundingGoal}`);
  if(profile.constraints)gaps.push(`Discuss your constraints directly: ${profile.constraints}`);
  return {score:sector+stage+geography+background+keyword,reasons,gaps,parts:{sector,stage,geography,background,keywords:keyword}};
}
