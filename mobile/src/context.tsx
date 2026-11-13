import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from 'react';
import{AppState}from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import{fetchAll}from './api';
import type{HockeyGame,LoadState}from './types';
type Ctx=LoadState&{refresh:()=>Promise<void>;favorites:string[];toggle:(team:string)=>void;cached:boolean};
const FAVORITES_KEY='hockey-live:v4:favorites';
const CACHE_KEY='hockey-live:v4:matches';
const REFRESH_MS=90000;
const Context=createContext<Ctx|null>(null);
function validGames(value:unknown):value is HockeyGame[]{
 return Array.isArray(value)&&value.every(g=>g&&typeof g==='object'&&typeof g.id==='string'&&['NHL','KHL','KLHL'].includes(g.league)&&typeof g.home==='string'&&typeof g.away==='string'&&typeof g.date==='string');
}
export function HockeyProvider({children}:{children:React.ReactNode}){
 const[load,setLoad]=useState<LoadState>({games:[],loading:true,error:null,updatedAt:null});
 const[favorites,setFavorites]=useState<string[]>([]);
 const[hydrated,setHydrated]=useState(false);
 const[cached,setCached]=useState(false);
 const request=useRef(0);
 const mounted=useRef(true);
 const refresh=useCallback(async()=>{
  const current=++request.current;
  setLoad(p=>({...p,loading:p.games.length===0,error:null}));
  try{
   const data=await fetchAll();
   if(!mounted.current||current!==request.current)return;
   // Keep older data for a league only if its latest request failed.
   setLoad(p=>{
    if(!data.games.length&&p.games.length)return {...p,loading:false,error:data.errors.join(' · ')||'Источники временно недоступны'};
    const failed=new Set(data.errors.map(e=>e.split(':')[0]));
    const fallback=p.games.filter(g=>failed.has(g.league));
    const byId=new Map<string,HockeyGame>();
    for(const game of [...fallback,...data.games])byId.set(game.id,game);
    const games=[...byId.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const result={games,loading:false,error:data.errors.length?data.errors.join(' · '):null,updatedAt:new Date()};
    if(games.length)void AsyncStorage.setItem(CACHE_KEY,JSON.stringify({games,updatedAt:Date.now()})).catch(()=>{});
    return result;
   });
   if(data.games.length)setCached(false);
  }catch{
   if(mounted.current&&current===request.current)setLoad(p=>({...p,loading:false,error:'Не удалось загрузить матчи'}));
  }
 },[]);
 useEffect(()=>{
  mounted.current=true;
  let alive=true;
  (async()=>{
   try{
    const raw=await AsyncStorage.getItem(CACHE_KEY);
    if(!raw||!alive||!mounted.current)return;
    const saved:unknown=JSON.parse(raw);
    if(!saved||typeof saved!=='object')return;
    const obj=saved as {games?:unknown;updatedAt?:unknown};
    if(!validGames(obj.games))return;
    setLoad(prev=>prev.updatedAt?prev:{
     games:obj.games as HockeyGame[],loading:false,error:null,
     updatedAt:typeof obj.updatedAt==='number'&&Number.isFinite(obj.updatedAt)?new Date(obj.updatedAt):null
    });
    setCached(true);
   }catch{/* No usable offline cache */}
  })().finally(()=>{if(alive)void refresh();});
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},REFRESH_MS);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{alive=false;mounted.current=false;request.current++;clearInterval(timer);subscription.remove();};
 },[refresh]);
 useEffect(()=>{
  let alive=true;
  AsyncStorage.getItem(FAVORITES_KEY).then(raw=>{
   if(!alive)return;
   if(raw){
    try{
     const data:unknown=JSON.parse(raw);
     if(Array.isArray(data))setFavorites(data.filter((v):v is string=>typeof v==='string'));
    }catch{/* Ignore invalid saved data */}
   }
  }).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});
  return()=>{alive=false;};
 },[]);
 useEffect(()=>{
  if(hydrated)void AsyncStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites)).catch(()=>{});
 },[favorites,hydrated]);
 const toggle=useCallback((team:string)=>setFavorites(p=>p.includes(team)?p.filter(x=>x!==team):[...p,team]),[]);
 const value=useMemo(()=>({...load,refresh,favorites,toggle,cached}),[load,refresh,favorites,toggle,cached]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useHockey(){const ctx=useContext(Context);if(!ctx)throw Error('HockeyProvider отсутствует');return ctx;}
