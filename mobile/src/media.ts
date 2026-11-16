// Official, match-specific media is served from our own reviewed registry.
// Never turn an arbitrary user-provided URL into an embedded player.
export type OfficialMedia={youtubeId:string;label:string;kind:'broadcast'|'replay';source:string};
const URL='https://snitkonikita1706.github.io/HOCKEY-LIVE/pilot/videos.json';
export async function getOfficialMedia(id:string):Promise<OfficialMedia|null>{
 if(!/^PHL-20\d\d-\d{1,4}$/.test(id))return null;
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),10000);
 try{
  const response=await fetch(URL,{signal:abort.signal,headers:{Accept:'application/json'}});
  if(!response.ok)return null;
  const body:unknown=await response.json();
  if(!body||typeof body!=='object')return null;
  const games=(body as {games?:unknown}).games;
  if(!games||typeof games!=='object'||Array.isArray(games))return null;
  const entry=(games as Record<string,unknown>)[id];
  if(!entry||typeof entry!=='object')return null;
  const x=entry as Partial<OfficialMedia>;
  if(typeof x.youtubeId!=='string'||!/^[-_A-Za-z0-9]{11}$/.test(x.youtubeId))return null;
  if(typeof x.source!=='string')return null;
  const fromLeague=/^https:\/\/pro\.ligasy\.kz\/ru\/game\//.test(x.source);
  const fromOfficialYouTube=x.source==='https://www.youtube.com/watch?v='+x.youtubeId;
  if(!fromLeague&&!fromOfficialYouTube)return null;
  return {youtubeId:x.youtubeId,source:x.source,label:typeof x.label==='string'?x.label:'Видео матча',kind:x.kind==='replay'?'replay':'broadcast'};
 }catch{return null}finally{clearTimeout(timer)}
}
