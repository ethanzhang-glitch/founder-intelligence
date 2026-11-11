import { readAccountFrom,mutateAccountIn } from "./account-store";
import { englishBriefing } from "./english-briefing";
import { env } from "cloudflare:workers";
import { profileSchema } from "./validation";
export const defaultProfile={id:"main",company:"My project",description:"",keywords:"",sectors:"",interestedSectors:"",industrySetupComplete:false,geographies:"",stage:"",location:"",founderBackground:"",education:"",expertise:"",traction:"",fundingGoal:"",teamSize:"",constraints:"",alertsEnabled:false,alertIntervalHours:6,aiEnabled:false,dailyTokens:20000,dailyUsd:.1,updatedAt:""};
export type Account={profile:typeof defaultProfile;records:Record<string,{saved?:boolean;note?:string;notes?:string;status?:string}>;watches:{id:string;name:string;kind:string;terms:string;createdAt:string}[];briefings:{id:string;cacheKey:string;day:string;content:string;createdAt:string}[]};
export const emptyAccount=():Account=>({profile:{...defaultProfile},records:{},watches:[],briefings:[]});
export const readAccount=async(userId:string|null)=>{const account=await readAccountFrom(env.DB!,userId,emptyAccount);if(account.profile.company==="我的项目")account.profile.company="My project";account.briefings=account.briefings.map(b=>({...b,content:englishBriefing(b.content)}));return account;};
export const mutateAccount=(userId:string,mutate:(a:Account)=>void)=>mutateAccountIn(env.DB!,userId,mutate,emptyAccount);
export function validatedProfile(data:unknown){return {...profileSchema.parse(data),aiEnabled:false,alertsEnabled:false,updatedAt:new Date().toISOString()};}
