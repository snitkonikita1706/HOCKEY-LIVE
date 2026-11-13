import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from 'react';
import{AppState}from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import{fetchAll}from './api';
import type{HockeyGame,LoadState}from './types';
type Ctx=LoadState&{refresh:()=>Promise<void>;favorites:string[];toggle:(team:string)=>void};
const FAVORITES_KEY='hockey-live:v4:favorites';
const REFRESH_MS=90000;
const Context=createContext<Ctx|null>(null);
export function HockeyProvider({children}:{children:React.ReactNode}){
 const[load,setLoad]=useState<LoadState>({games:[],loading:true,error:null,updatedAt:null});
 const[favorites,setFavorites]=useState<string[]>([]);
 const[hydrated,setHydrated]=useState(false);
 const request=useRef(0);
 const mounted=useRef(true);
 const refresh=useCallback(async()=>{
  const current=++request.current;
  setLoad(p=>({...p,loading:true,error:null}));
  try{
   const data=await fetchAll();
   if(mounted.current&&current===request.current)setLoad({games:data.games,loading:false,error:data.errors.length?data.errors.join(' · '):null,updatedAt:new Date()});
  }catch{
   if(mounted.current&&current===request.current)setLoad(p=>({...p,loading:false,error:'Не удалось загрузить матчи'}));
  }
 },[]);
 useEffect(()=>{
  mounted.current=true;
  void refresh();
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},REFRESH_MS);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{mounted.current=false;request.current++;clearInterval(timer);subscription.remove();};
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
  }).catch(()=>{/* Favorites remain usable for this session */}).finally(()=>{if(alive)setHydrated(true);});
  return()=>{alive=false;};
 },[]);
 useEffect(()=>{
  if(hydrated)void AsyncStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites)).catch(()=>{/* No offline write available */});
 },[favorites,hydrated]);
 const toggle=useCallback((team:string)=>setFavorites(p=>p.includes(team)?p.filter(x=>x!==team):[...p,team]),[]);
 const value=useMemo(()=>({...load,refresh,favorites,toggle}),[load,refresh,favorites,toggle]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useHockey(){const ctx=useContext(Context);if(!ctx)throw Error('HockeyProvider отсутствует');return ctx;}
