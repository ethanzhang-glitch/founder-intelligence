export function parseCsv(text:string) {
  const rows:string[][]=[];let row:string[]=[];let field="";let quoted=false;
  const input=text.replace(/^\uFEFF/,"");
  for(let i=0;i<input.length;i++) {
    const c=input[i];
    if(c==='"') {if(quoted&&input[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===","&&!quoted){row.push(field);field="";}
    else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&input[i+1]==="\n")i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field="";}
    else field+=c;
  }
  if(quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field);if(row.some(Boolean))rows.push(row);
  if(rows.length<2) throw new Error("CSV needs a header and at least one data row.");
  const [headers,...data]=rows;
  if(!headers.includes("name")||!headers.includes("website"))throw new Error("CSV must include name and website headers.");
  if(new Set(headers).size!==headers.length) throw new Error("CSV headers must be unique.");
  if(data.length>10000)throw new Error("Import at most 10,000 investor records at a time.");
  return data.map((values,i)=>{if(values.length!==headers.length)throw new Error(`CSV row ${i+2} has the wrong number of fields.`);return Object.fromEntries(headers.map((h,j)=>[h.trim(),values[j]]));});
}
export function exportCsv(rows:Record<string,unknown>[],columns:string[]) {
  const cell=(v:unknown)=>{let s=v instanceof Date?v.toISOString().slice(0,10):String(v??"");if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return [columns.join(","),...rows.map(r=>columns.map(c=>cell(r[c])).join(","))].join("\r\n");
}
