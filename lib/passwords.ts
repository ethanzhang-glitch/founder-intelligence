import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
// OWASP scrypt option: 16 MiB memory, five passes. No plaintext credentials stored.
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(e,key)=>e?reject(e):resolve(key)));
export const secret=()=>randomBytes(32).toString('base64url');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const equal=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function username(value:unknown){if(typeof value!=='string'||! /^[a-zA-Z0-9_]{3,32}$/.test(value))throw new Error("Username must contain 3–32 letters, numbers or underscores.");return value.toLowerCase();}
export function password(value:unknown){if(typeof value!=='string'||value.length<12||value.length>128)throw new Error("Password must contain 12–128 characters.");if(/^(password|123456|qwerty|admin|letmein)/i.test(value)||new Set(value).size<5)throw new Error("Choose a stronger password or a longer passphrase.");return value;}
export async function hashPassword(value:string){const salt=randomBytes(16).toString('hex');return `scrypt$16384$8$5$${salt}$${(await derive(value,salt)).toString('hex')}`;}
export async function verifyPassword(value:string,encoded:string|null){const parts=(encoded||'').split('$'),valid=parts.length===6&&parts.slice(0,4).join('$')==='scrypt$16384$8$5'&&/^[a-f0-9]{32}$/.test(parts[4])&&/^[a-f0-9]{64}$/.test(parts[5]);const key=await derive(value,valid?parts[4]:'00000000000000000000000000000000');return equal(key.toString('hex'),valid?parts[5]:'0'.repeat(64))&&valid;}
