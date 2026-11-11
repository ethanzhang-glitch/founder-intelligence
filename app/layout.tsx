import type {Metadata} from "next";
import "./globals.css";
import "./workspace.css";
import "./studio.css";
import "./public.css";
export const metadata:Metadata={title:"Founder Intelligence · Startup Research",description:"Explore global companies and investors. Discover news by industry and sign in to save your preferences, bookmarks and research notes."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
