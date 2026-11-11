// Shared, deterministic taxonomy. IDs are stable storage values; labels are for display.
export const INDUSTRIES = [
 {id:"Artificial Intelligence",label:"Artificial Intelligence",terms:["人工智能","AI","artificial intelligence","machine learning","LLM","neural","deep learning","人工智能","大模型"]},
 {id:"Chemistry",label:"Chemistry",terms:["化学与化工","chemistry","chemical","molecular","molecule","synthesis","retrosynthesis","cheminformatics","catalyst","化学","化工"]},
 {id:"Biotechnology",label:"Biotechnology",terms:["生物技术","biotech","biotechnology","life sciences","protein","drug discovery","biology","genome","therapeutics","生物技术","药物研发"]},
 {id:"Healthcare",label:"Healthcare",terms:["医疗与健康","healthcare","healthtech","health tech","digital health","medical","clinical","hospital","patient","医疗","健康科技"]},
 {id:"Deep Tech",label:"Deep Tech",terms:["硬科技","deep tech","deep-tech","quantum","robotics","semiconductor","fusion","硬科技","半导体","机器人"]},
 {id:"Scientific Software",label:"Scientific Software",terms:["科研软件","scientific software","simulation","computational","AI for science","科研软件","科学计算"]},
 {id:"SaaS",label:"SaaS",terms:["企业软件","SaaS","enterprise software","software as a service","B2B software","developer tools","企业软件","开发者工具"]},
 {id:"Fintech",label:"Fintech",terms:["金融科技","fintech","financial technology","banking","payments","insurtech","lending","金融科技","支付","保险科技"]},
 {id:"Cybersecurity",label:"Cybersecurity",terms:["网络安全","cybersecurity","cyber security","infosec","ransomware","data breach","网络安全","数据安全"]},
 {id:"Climate & Energy",label:"Climate & Energy",terms:["气候与能源","climate tech","climatetech","cleantech","clean energy","renewable","solar","battery","batteries","carbon capture","energy storage","能源","气候科技","储能"]},
 {id:"Education",label:"Education",terms:["教育科技","edtech","education technology","education","e-learning","online learning","教育","在线学习"]},
 {id:"Commerce & Retail",label:"Commerce & Retail",terms:["电商与零售","ecommerce","e-commerce","retail","shopping","marketplace","电商","零售"]},
 {id:"Consumer",label:"Consumer",terms:["消费与生活","consumer","wellness","beauty","fashion","apparel","消费品","美妆","时尚"]},
 {id:"Media & Entertainment",label:"Media & Entertainment",terms:["传媒与娱乐","media","entertainment","gaming","video game","creator economy","streaming","music","游戏","娱乐","传媒"]},
 {id:"Food & Agriculture",label:"Food & Agriculture",terms:["食品与农业","agtech","agritech","agriculture","farming","foodtech","food tech","food","食品","农业"]},
 {id:"Mobility & Logistics",label:"Mobility & Logistics",terms:["交通与物流","mobility","logistics","transportation","automotive","autonomous vehicle","electric vehicle","supply chain","物流","交通","汽车"]},
 {id:"Manufacturing",label:"Manufacturing",terms:["工业与制造","manufacturing","industrial","factory","3D printing","automation","工业","制造","工厂"]},
 {id:"Real Estate & Construction",label:"Real Estate & Construction",terms:["地产与建筑","real estate","proptech","construction","building technology","地产","建筑"]},
 {id:"Travel & Hospitality",label:"Travel & Hospitality",terms:["旅游与酒店","travel","tourism","hospitality","hotel","旅游","酒店"]},
 {id:"Space & Aerospace",label:"Space & Aerospace",terms:["航天与航空","spacetech","aerospace","satellite","rocket","aviation","航天","航空","卫星"]},
 {id:"Telecommunications",label:"Telecommunications",terms:["通信与网络","telecommunications","telecom","5G","6G","broadband","通信","电信"]},
 {id:"Web3",label:"Web3",terms:["Web3 与区块链","web3","blockchain","crypto","cryptocurrency","decentralized finance","区块链","加密货币"]},
 {id:"Materials",label:"Materials",terms:["新材料","materials","materials science","advanced materials","nanotechnology","材料","纳米技术"]},
 {id:"Professional Services",label:"Professional Services",terms:["专业与商业服务","professional services","legaltech","legal tech","HR tech","HRtech","recruiting","consulting","法律科技","人力资源","咨询"]}
] as const;
export const industryLabel=(id:string)=>INDUSTRIES.find(i=>i.id===id)?.label||id;
function has(text:string,term:string){
 if(/[\u3400-\u9fff]/.test(term))return text.includes(term);
 const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`,"iu").test(text);
}
export function detectIndustries(text:string){return INDUSTRIES.filter(i=>[i.id,...i.terms].some(t=>has(text,t))).map(i=>i.id as string);}
export function normalizeIndustries(value:string){const values=value.split(/[,，\n]/).map(s=>s.trim().toLowerCase());return INDUSTRIES.filter(i=>[i.id,i.label,...i.terms].some(t=>values.includes(t.toLowerCase()))).map(i=>i.id as string);}
export type IndustryProfile={sectors?:string;interestedSectors?:string};
export function preferredIndustries(profile:IndustryProfile){return [...new Set([...normalizeIndustries(profile.sectors||""),...normalizeIndustries(profile.interestedSectors||"")])];}
export function articleIndustryMatches(article:{tags:string},profile:IndustryProfile){const tags=article.tags.split(",").map(s=>s.trim());return preferredIndustries(profile).filter(id=>tags.includes(id));}
export function selectForIndustries<T extends {tags:string}>(articles:T[],profile:IndustryProfile):T[]{return preferredIndustries(profile).length?articles.filter(a=>articleIndustryMatches(a,profile).length>0):articles;}
