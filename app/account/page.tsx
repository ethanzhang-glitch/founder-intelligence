import AccountForm from '../../components/account-form';
import {getAccountUser} from '../../lib/auth';
export const dynamic='force-dynamic';
export const metadata={title:"Account · Founder Intelligence",robots:{index:false,follow:false}};
export default async function AccountPage(){const user=await getAccountUser();return <AccountForm username={user?.displayName||null}/>;}
