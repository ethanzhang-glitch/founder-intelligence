import Workstation from "../../components/workstation";
import AccountBar from "../../components/account-bar";
import {getAccountUser} from "../../lib/auth";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{view?:string[]}>}){const {view=[]}=await params;const name=view[0]||"overview",allowed=["overview","investors","companies","matches","feed","watchlists","briefing","trends","saved","settings"],user=await getAccountUser();return <><AccountBar username={user?.displayName||null}/><Workstation view={allowed.includes(name)?name:"overview"}/></>}
