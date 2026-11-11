import { INDUSTRIES } from "./industries";
import { z } from "zod";
export const webUrl=z.string().max(2000).refine(value=>{try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},"Use a complete HTTP(S) URL.");
const text=z.string().max(10000).default("");
export const investorSchema=z.object({
  name:z.string().trim().min(1).max(200),website:webUrl,
  headquarters:text,geographies:text,stages:text,sectors:text,checkSize:text,team:text,contact:text,
  leadPreference:text,style:text,exclusions:text,checkPolicy:z.string().max(10000).default("").refine(v=>{if(!v)return true;try{const j=JSON.parse(v);return j!==null&&typeof j==="object"&&!Array.isArray(j);}catch{return false;}},"Check-size policy must be a JSON object or left blank."),
  type:z.string().max(100).default("Venture capital"),thesis:text,founderFit:text,eligibility:text,evidence:text,
  pitchUrl:z.union([webUrl,z.literal("")]).default(""),portfolio:text,investments:text,
  references:z.string().max(12000).default("").refine(v=>v.split("\n").filter(s=>s.trim()).every(s=>webUrl.safeParse(s.trim()).success),"Use one source URL per line."),
  verifiedAt:z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/),z.literal(""),z.null()]).optional().transform(v=>v?new Date(v):null),
  notes:text,status:z.enum(["Researching","Shortlisted","Contacted","In discussion","Passed"]).default("Researching")
}).superRefine((v,ctx)=>{
  if(v.verifiedAt && (!v.references.trim()||v.verifiedAt.getTime()>Date.now()))ctx.addIssue({code:"custom",message:"A verification date needs source references and cannot be in the future."});
  if((v.checkSize||v.contact||v.team||v.investments)&&!v.references.trim())ctx.addIssue({code:"custom",message:"Check sizes, contacts, team members and investments need source references."});
});
export const profileSchema=z.object({
  company:z.string().trim().min(1).max(100),description:z.string().max(2000),keywords:z.string().max(3000),sectors:z.string().max(1000),geographies:z.string().max(1000),stage:z.string().max(100),location:z.string().max(150),
  founderBackground:text,education:text,expertise:text,traction:text,fundingGoal:text,teamSize:text,constraints:text,
  interestedSectors:z.string().max(1000).optional(),industrySetupComplete:z.boolean().optional(),
  alertsEnabled:z.boolean().optional(),alertIntervalHours:z.number().int().min(1).max(24).optional(),
  aiEnabled:z.boolean(),dailyTokens:z.number().int().min(0).max(1000000),dailyUsd:z.number().min(0).max(100)
});
export const watchSchema=z.object({name:z.string().trim().min(1).max(100),kind:z.enum(["Keyword","Technology","Industry","Competitor","Investor","Startup","Funding opportunity"]),terms:z.string().trim().min(1).max(1000)});

const industryId=z.string().refine(id=>INDUSTRIES.some(i=>i.id===id),"Choose an industry from the list.");
export const industryPreferencesSchema=z.object({sectors:z.array(industryId).max(24),interestedSectors:z.array(industryId).max(24)});
