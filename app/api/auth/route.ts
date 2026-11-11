import { env } from 'cloudflare:workers';
import { getAccountUser,sessionToken,sessionCookie,SESSION_SECONDS } from '../../../lib/auth';
import { digest,equal,secret,username,password,hashPassword,verifyPassword } from '../../../lib/passwords';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200,cookie?:string)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
class AuthError extends Error{constructor(message:string,public status=400){super(message);}}
async function limit(key:string,max:number,seconds:number){const now=Date.now(),bucket=Math.floor(now/(seconds*1000)),id=digest(`${key}:${bucket}`);const row=await env.DB!.prepare('INSERT INTO auth_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(id,(bucket+1)*seconds*1000).first<{attempts:number}>();if(!row||row.attempts>max)throw new AuthError("Too many attempts. Please try again later.",429);}
async function readBody(request:Request){const reader=request.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new AuthError("The submitted content is too long.",413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);}
async function issue(userId:string,version:number){const token=secret();await env.DB!.prepare('INSERT INTO auth_sessions (token_hash,user_id,auth_version,expires_at) VALUES (?,?,?,?)').bind(digest(token),userId,version,Date.now()+SESSION_SECONDS*1000).run();return token;}
export async function POST(request:Request){try{
 const origin=new URL(request.url).origin;if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:"Only submissions from this site are accepted."},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:"Invalid request format."},415);
 const raw=await readBody(request);const body=JSON.parse(raw),action=String(body.action||'');
 if(action==='logout'){const token=sessionToken(request.headers);if(token)await env.DB!.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(digest(token)).run();return json({ok:true},200,sessionCookie('',0));}
 if(!['register','login','recover','change-password'].includes(action))return json({error:"Unknown action."},400);
 const ip=request.headers.get('cf-connecting-ip')||'shared-network';await limit(`ip:${ip}`,40,900);await limit('global-auth',600,900);
 await env.DB!.batch([env.DB!.prepare('DELETE FROM auth_limits WHERE expires_at<?').bind(Date.now()),env.DB!.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(Date.now())]);
 if(action==='change-password'){
  const user=await getAccountUser(request);if(!user)return json({error:"Please sign in first."},401);await limit(`change:${user.userId}`,8,900);
  const row=await env.DB!.prepare('SELECT password_hash,auth_version FROM auth_users WHERE id=?').bind(user.userId).first<{password_hash:string;auth_version:number}>();
  const current=typeof body.currentPassword==='string'&&body.currentPassword.length<=128?body.currentPassword:'';
  if(!row||!await verifyPassword(current,row.password_hash))return json({error:"Your current password is incorrect."},401);
  const next=await hashPassword(password(body.password));const result=await env.DB!.prepare('UPDATE auth_users SET password_hash=?,auth_version=auth_version+1 WHERE id=? AND auth_version=?').bind(next,user.userId,row.auth_version).run();
  if(!result.meta.changes)throw new AuthError("Your account has changed. Please sign in again.",409);
  await env.DB!.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(user.userId).run();return json({ok:true},200,sessionCookie(await issue(user.userId,row.auth_version+1)));
 }
 const name=username(body.username);await limit(`name:${name}`,10,900);
 if(action==='register'){
  await limit(`signup:${ip}`,8,3600);await limit('global-signup',100,86400);
  const encoded=await hashPassword(password(body.password)),id=`account_${crypto.randomUUID()}`,recovery=secret();
  const result=await env.DB!.prepare('INSERT OR IGNORE INTO auth_users (id,username,password_hash,recovery_hash,auth_version,created_at) VALUES (?,?,?,?,0,?)').bind(id,name,encoded,digest(recovery),new Date().toISOString()).run();
  if(!result.meta.changes)return json({error:"This username is already taken. Choose another or sign in."},409);
  return json({ok:true,username:name,recoveryCode:recovery},201,sessionCookie(await issue(id,0)));
 }
 const row=await env.DB!.prepare('SELECT id,password_hash,recovery_hash,auth_version FROM auth_users WHERE username=?').bind(name).first<{id:string;password_hash:string;recovery_hash:string;auth_version:number}>();
 if(action==='login'){
  const value=typeof body.password==='string'&&body.password.length<=128?body.password:'';const valid=await verifyPassword(value,row?.password_hash||null);
  if(!row||!valid)return json({error:"Incorrect username or password."},401);
  return json({ok:true},200,sessionCookie(await issue(row.id,row.auth_version)));
 }
 const code=typeof body.recoveryCode==='string'?body.recoveryCode.trim():'';
 if(!row||!equal(digest(code),row.recovery_hash))return json({error:"Incorrect username or recovery code."},401);
 const encoded=await hashPassword(password(body.password)),recovery=secret();
 const changed=await env.DB!.prepare('UPDATE auth_users SET password_hash=?,recovery_hash=?,auth_version=auth_version+1 WHERE id=? AND recovery_hash=? AND auth_version=?').bind(encoded,digest(recovery),row.id,row.recovery_hash,row.auth_version).run();
 if(!changed.meta.changes)return json({error:"This recovery code has been used. Use your latest code."},409);
 await env.DB!.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(row.id).run();return json({ok:true,username:name,recoveryCode:recovery},200,sessionCookie(await issue(row.id,row.auth_version+1)));
 }catch(e){if(e instanceof AuthError)return json({error:e.message},e.status);if(e instanceof SyntaxError)return json({error:"Invalid request format."},400);if(e instanceof Error&&/^(Username must|Password must|Choose a stronger)/.test(e.message))return json({error:e.message},400);console.error('Account operation failed');return json({error:"Account services are temporarily unavailable. Please try again later."},503);}}
