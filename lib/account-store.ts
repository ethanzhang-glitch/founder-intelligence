import type { Account } from "./accounts";
export async function readAccountFrom(db:Pick<D1Database,"prepare">,userId:string|null,emptyAccount:()=>Account):Promise<Account>{if(!userId)return emptyAccount();const row=await db.prepare("SELECT document FROM accounts WHERE user_id = ?").bind(userId).first<{document:string}>();return row?JSON.parse(row.document):emptyAccount();}
export async function mutateAccountIn(db:Pick<D1Database,"prepare">,userId:string,mutate:(a:Account)=>void,emptyAccount:()=>Account):Promise<void>{
 for(let attempt=0;attempt<3;attempt++){
  const row=await db.prepare("SELECT document,revision FROM accounts WHERE user_id = ?").bind(userId).first<{document:string;revision:number}>();
  const a:Account=row?JSON.parse(row.document):emptyAccount();mutate(a);const document=JSON.stringify(a);
  if(document.length>250000)throw new Error("Personal storage is full. Remove some notes or saved briefings.");
  const now=new Date().toISOString();
  const result=row?await db.prepare("UPDATE accounts SET document = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?").bind(document,now,userId,row.revision).run():await db.prepare("INSERT OR IGNORE INTO accounts(user_id, document, revision, updated_at) VALUES (?, ?, 0, ?)").bind(userId,document,now).run();
  if(result.meta.changes===1)return;
 }
 throw new Error("Another page is saving changes. Please try again.");
}
