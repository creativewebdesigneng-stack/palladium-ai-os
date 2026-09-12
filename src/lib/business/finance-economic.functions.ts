import{createServerFn}from"@tanstack/react-start";
const BOE="https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp";
function csvRows(text:string){return text.trim().split(/\r?\n/).map(r=>r.split(",").map(x=>x.replace(/^"|"$/g,"").trim()));}
export const getFinanceEconomicData=createServerFn({method:"POST"}).handler(async()=>{
 const now=new Date(),from=new Date(Date.UTC(now.getUTCFullYear()-2,now.getUTCMonth(),1));const fmt=(d:Date)=>`${String(d.getUTCDate()).padStart(2,"0")}/${d.toLocaleString("en-GB",{month:"short",timeZone:"UTC"})}/${d.getUTCFullYear()}`;
 const url=new URL(BOE);url.searchParams.set("csv.x","yes");url.searchParams.set("Datefrom",fmt(from));url.searchParams.set("Dateto","now");url.searchParams.set("SeriesCodes","IUMABEDR");url.searchParams.set("UsingCodes","Y");url.searchParams.set("CSVF","TN");
 const res=await fetch(url,{headers:{"user-agent":"Blackstar-Finance/1.0","accept":"text/csv,text/plain"}});
 if(!res.ok)throw new Error(`Bank of England data request failed (${res.status}).`);
 const rows=csvRows(await res.text()).filter(r=>r.length>=2);let latest:null|{date:string;value:number}=null;
 for(const row of rows){const nums=row.map(x=>Number(x)).filter(Number.isFinite);const value=nums.at(-1);if(value!==undefined&&value>=0&&value<100){latest={date:row[0]??"unknown",value};}}
 if(!latest)throw new Error("Bank of England returned no parseable Bank Rate observation.");
 return{bank_rate:{...latest,series:"IUMABEDR",label:"Monthly average of official Bank Rate",source:"Bank of England"},retrieved_at:new Date().toISOString(),source_url:"https://www.bankofengland.co.uk/boeapps/database/"};
});
