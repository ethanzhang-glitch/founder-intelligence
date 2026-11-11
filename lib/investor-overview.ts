// Public business contacts checked against the linked official pages; never infer emails.
const verifiedContacts:Record<string,{email:string;label:string;source:string;checked:string}[]>={
 "High-Tech Gründerfonds":[{email:"lifescience@htgf.de",label:"Life sciences / Chemistry team",source:"https://www.htgf.de/kontakt/",checked:"2026-11-08"}],
 "IQ Capital":[{email:"hello@iqcapital.vc",label:"General contact",source:"https://www.iqcapital.vc/contact",checked:"2026-11-08"}],
 "Linear Capital":[{email:"bp@linear.vc",label:"Pitch submissions",source:"https://www.linear.vc/home-cn",checked:"2026-11-08"}]
};
type ContactRecord={name:string;contact:string;pitchUrl:string;website:string;sourceUrl?:string;references:string};
export type ContactLink={label:string;href:string;kind:"email"|"pitch"|"link"|"website";source:string;checked?:string};
export function publicUrl(value:string){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}catch{return "";}}
export function publicContacts(i:ContactRecord):ContactLink[]{
 const source=publicUrl(i.sourceUrl||"")||i.references.split("\n").map(publicUrl).find(Boolean)||publicUrl(i.website);
 const contacts:ContactLink[]=(verifiedContacts[i.name]||[]).map(c=>({label:`${c.label} · ${c.email}`,href:`mailto:${c.email}`,kind:"email",source:c.source,checked:c.checked}));
 for(const email of i.contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])contacts.push({label:email,href:`mailto:${email}`,kind:"email",source});
 if(publicUrl(i.pitchUrl))contacts.push({label:"Application / Pitch portal",href:publicUrl(i.pitchUrl),kind:"pitch",source});
 for(const url of i.contact.match(/https?:\/\/[^\s<>"\])]+/gi)||[]){const href=publicUrl(url.replace(/[.,;]+$/,""));if(href)contacts.push({label:`Public contact link · ${new URL(href).hostname.replace(/^www\./,"")}`,href,kind:"link",source});}
 const unique=contacts.filter((c,index)=>contacts.findIndex(x=>x.href.toLowerCase()===c.href.toLowerCase())===index);
 if(!unique.length&&publicUrl(i.website))unique.push({label:"Website · No direct contact recorded",href:publicUrl(i.website),kind:"website",source});
 return unique;
}
type Match={score:number;reasons:string[];gaps:string[];parts:{sector:number;stage:number;geography:number;background:number;keywords:number}};
const terms:Record<string,string>={"Artificial Intelligence":"Artificial Intelligence","Chemistry":"Chemistry","Biotechnology":"Biotechnology","Deep Tech":"Deep Tech","Scientific Software":"Scientific Software","United States":"United States","Canada":"Canada","Europe":"Europe","China":"China","Singapore":"Singapore","PhD":"PhD","Researcher":"Researcher","Technical founder":"Technical founder"};
const translate=(text:string)=>Object.entries(terms).reduce((s,[en,zh])=>s.replaceAll(en,zh),text);
export function investorOverview(i:ContactRecord&{stages:string;sectors:string;eligibility:string;exclusions:string;checkSize:string},m:Match){
 const reason=(prefix:string)=>translate(m.reasons.find(r=>r.startsWith(prefix))?.slice(prefix.length).trim()||"");
 const sector=reason("Sector overlap:"),stage=reason("Stage:"),geo=reason("Target-region overlap:"),background=reason("Background alignment:");
 const why=[sector?`Overlaps with your interests in ${sector}`:m.parts.sector?"Generalist investor; confirm specific industry interests":"No recorded industry overlap",stage?`Covers your ${stage} stage`:m.parts.stage?"Invests in early-stage companies; confirm the exact round":"Your funding stage is not yet matched",geo?`Investment coverage includes your target regions: ${geo}`:m.parts.geography?"Listed as investing globally":"Cross-border eligibility needs verification",background?`Preferred founder experience aligns with your background in ${background}`:""].filter(Boolean);
 const caveats=[i.eligibility?`Eligibility (source wording): ${i.eligibility}`:"",i.exclusions?`Exclusions (source wording): ${i.exclusions}`:"",!m.parts.stage?"Confirm whether the firm invests at your current stage":"",!m.parts.geography?"Confirm eligibility for your place of incorporation":"",!i.checkSize?"Check-size range is not recorded":"",m.gaps.includes("Add your background to assess founder fit")?"Add your founder background to assess alignment":""].filter(Boolean);
 return {why:why.join("; ")+".",caveats,contacts:publicContacts(i),next:stage&&m.parts.geography?"Prepare a one-page introduction covering technical validation, customer needs and round milestones. First confirm eligibility and whether the firm is accepting pitches.":"Confirm stage and incorporation eligibility before submitting materials."};
}
