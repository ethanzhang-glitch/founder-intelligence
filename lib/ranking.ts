import { detectIndustries, normalizeIndustries, industryLabel } from "./industries";
import { createHash } from "node:crypto";

export const split = (value: string) => value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function matches(text: string, term: string) {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}
const topics: Record<string,string[]> = {
 "Venture Capital":["venture capital","venture","funding","fundraise","seed round","series A","series B","raised","investor","融资","投资"],
 "Funding Opportunities":["accelerator","grant","applications open","pitch competition","incubator","fellowship","加速器","孵化器","资助"],
 "Regulation":["regulation","legislation","regulatory","antitrust","AI Act","监管","法规"]
};
const regions: Record<string, string[]> = {
  "Canada": ["Canada", "Canadian", "Montreal", "Montréal", "Toronto", "Quebec", "Vancouver"],
  "United States": ["United States", "U.S.", "USA", "American", "San Francisco", "Boston", "New York", "Silicon Valley"],
  "China": ["China", "Chinese", "Beijing", "Shanghai", "Shenzhen"],
  "Singapore": ["Singapore", "Singaporean"],
  "Europe": ["Europe", "European", "UK", "United Kingdom", "London", "France", "Germany", "Switzerland", "Sweden", "Netherlands"]
};
export function classify(text: string) {
  return {
    tags: [...detectIndustries(text),...Object.entries(topics).filter(([, words]) => words.some(w => /[\u3400-\u9fff]/.test(w)?text.includes(w):matches(text, w))).map(([tag]) => tag)].join(", "),
    geographies: Object.entries(regions).filter(([, words]) => words.some(w => matches(text, w))).map(([tag]) => tag).join(", ")
  };
}
export type RankingProfile = { keywords: string; sectors: string; interestedSectors?: string; geographies: string; stage: string };
export type Rankable = { title: string; description: string; content: string; tags: string; geographies: string; publishedAt: Date | string | null; saved?: boolean };
export function rank(article: Rankable, profile: RankingProfile, watchTerms: string[] = [], now = new Date()) {
  const text = `${article.title} ${article.description}`;
  const keywords = split(profile.keywords).filter(t => matches(text, t));
  const sectorHits = normalizeIndustries(profile.sectors).filter(s => split(article.tags).includes(s));
  const interestHits = normalizeIndustries(profile.interestedSectors||"").filter(s=>split(article.tags).includes(s)&&!sectorHits.includes(s));
  const geoHits = split(profile.geographies).filter(s => split(article.geographies).includes(s));
  const watches = watchTerms.filter(t => matches(text, t));
  const stage = split(profile.stage).some(t => matches(text, t));
  const age = article.publishedAt ? (now.getTime() - new Date(article.publishedAt).getTime()) / 86400000 : Infinity;
  const recency = age >= 0 && age <= 1 ? 15 : age >= 0 && age <= 7 ? 10 : age >= 0 && age <= 30 ? 5 : 0;
  const parts = {
    keywords: Math.min(35, keywords.length * 9), sector: Math.min(20, sectorHits.length * 10 + interestHits.length * 10),
    geography: Math.min(10, geoHits.length * 5), stage: stage ? 5 : 0,
    watchlist: Math.min(10, watches.length * 5), saved: article.saved ? 5 : 0, recency
  };
  const reasons = [keywords.length ? `Matches ${keywords.slice(0, 3).join(", ")}` : "", sectorHits.length ? `Your industry: ${sectorHits.map(industryLabel).join(", ")}` : "", interestHits.length ? `Your interests: ${interestHits.map(industryLabel).join(", ")}` : "", geoHits.length ? `Mentions ${geoHits.join(", ")}` : "", watches.length ? `Watchlist: ${watches.join(", ")}` : "", stage ? "Matches your funding stage" : ""].filter(Boolean);
  return { score: Object.values(parts).reduce((a,b) => a+b, 0), reasons, parts };
}
export function canonicalUrl(value: string) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("A public HTTP(S) URL is required.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_cid|mc_eid)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString();
}
