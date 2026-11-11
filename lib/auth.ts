import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { digest } from './passwords';
export const SESSION_SECONDS=60*60*24*14;
export const cookieName=()=>import.meta.env.DEV?'fi_session':'__Host-fi_session';
export function sessionToken(h:Headers){const value=(h.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName()+'='))?.slice(cookieName().length+1);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?value:null;}
export function sessionCookie(token:string,maxAge=SESSION_SECONDS){return `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${import.meta.env.DEV?'':'; Secure'}`;}
export async function getAccountUser(request?:Request){const token=sessionToken(request?.headers||await headers());if(!token)return null;return env.DB!.prepare('SELECT u.id AS userId,u.username AS displayName FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id AND u.auth_version=s.auth_version WHERE s.token_hash=? AND s.expires_at>?').bind(digest(token),Date.now()).first<{userId:string;displayName:string}>();}
