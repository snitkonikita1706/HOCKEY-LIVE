import type{HockeyGame,League,MatchStatus}from './types';
const BASE='https://snitkonikita1706.github.io/HOCKEY-LIVE/data';
const NHL='https://api-web.nhle.com/v1/score/now';
const NHL_SCHEDULE='https://api-web.nhle.com/v1/schedule/now';
const str=(v:unknown)=>typeof v==='string'?v:'';
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined;
const logo=(v:unknown)=>{const x=str(v);return /^https:\/\//.test(x)?x:undefined;};
const status=(s:unknown):MatchStatus=>s==='live'?'live':s==='done'?'done':'scheduled';
const get=async(url:string)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(t);}};
export async function fetchKHL():Promise<HockeyGame[]>{const d=await get(BASE+'/khl.json');return (Array.isArray(d.games)?d.games:[]).map((x:any)=>({id:'KHL-'+String(x.id),league:'KHL',home:str(x.home),away:str(x.away),homeLogo:logo(x.homeLogo),awayLogo:logo(x.awayLogo),homeScore:num(x.homeScore),awayScore:num(x.awayScore),date:str(x.time||x.date),status:status(x.status),watch:str(x.watch)})).filter((x:HockeyGame)=>x.home&&x.away);}
export async function fetchKLHL():Promise<HockeyGame[]>{const d=await get(BASE+'/klhl.json');return (Array.isArray(d.games)?d.games:[]).map((x:any)=>({id:'KLHL-'+String(x.id),league:'KLHL',home:str(x.home),away:str(x.away),homeScore:num(x.homeScore),awayScore:num(x.awayScore),date:str(x.date)+(x.clock?'T'+String(x.clock)+':00+05:00':''),status:status(x.status),division:str(x.division),watch:str(x.watch)})).filter((x:HockeyGame)=>x.home&&x.away);}
function nhlStatus(v:unknown):MatchStatus{const s=str(v);return s==='LIVE'||s==='CRIT'?'live':s==='FINAL'||s==='OFF'?'done':'scheduled';}
function teamName(t:any){return str(t?.name?.default)||str(t?.placeName?.default)||str(t?.abbrev)||'Команда';}
function mapNHL(x:any):HockeyGame{return{id:'NHL-'+String(x.id),league:'NHL',home:teamName(x.homeTeam),away:teamName(x.awayTeam),homeLogo:logo(x.homeTeam?.logo),awayLogo:logo(x.awayTeam?.logo),homeScore:num(x.homeTeam?.score),awayScore:num(x.awayTeam?.score),date:str(x.startTimeUTC||x.gameDate),status:nhlStatus(x.gameState),period:num(x.periodDescriptor?.number)?String(x.periodDescriptor.number)+' период':undefined,watch:'https://www.dazn.com/'};}
export async function fetchNHL():Promise<HockeyGame[]>{
 const results=await Promise.allSettled([get(NHL_SCHEDULE),get(NHL)]);
 if(results.every(r=>r.status==='rejected'))throw Error('NHL API unavailable');
 const [week,score]=results;
 const scheduled:any[]=week.status==='fulfilled'&&Array.isArray(week.value.gameWeek)?week.value.gameWeek.flatMap((day:any)=>Array.isArray(day.games)?day.games:[]):[];
 const today:any[]=score.status==='fulfilled'&&Array.isArray(score.value.games)?score.value.games:[];
 const merged=new Map<string,HockeyGame>();
 for(const g of scheduled)if(g&&g.id)merged.set(String(g.id),mapNHL(g));
 // Score endpoint overrides weekly schedule with most recent game status and results.
 for(const g of today)if(g&&g.id)merged.set(String(g.id),mapNHL(g));
 return [...merged.values()];
}
export async function fetchAll():Promise<{games:HockeyGame[];errors:string[]}>{const sources:[League,()=>Promise<HockeyGame[]>][]=[['NHL',fetchNHL],['KHL',fetchKHL],['KLHL',fetchKLHL]];const a=await Promise.allSettled(sources.map(([,f])=>f()));const games:HockeyGame[]=[],errors:string[]=[];a.forEach((r,i)=>{if(r.status==='fulfilled')games.push(...r.value);else errors.push(sources[i][0]+': недоступен источник');});return{games:games.sort((x,y)=>x.date.localeCompare(y.date)),errors};}
