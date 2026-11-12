import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from 'react';
import{fetchAll}from './api';
import type{HockeyGame,LoadState}from './types';
type Ctx=LoadState&{refresh:()=>Promise<void>;favorites:string[];toggle:(team:string)=>void};
const Context=createContext<Ctx|null>(null);
export function HockeyProvider({children}:{children:React.ReactNode}){
 const[load,setLoad]=useState<LoadState>({games:[],loading:true,error:null,updatedAt:null});
 const[favorites,setFavorites]=useState<string[]>([]);
 const refresh=useCallback(async()=>{setLoad(p=>({...p,loading:true,error:null}));try{const data=await fetchAll();setLoad({games:data.games,loading:false,error:data.errors.length?data.errors.join(' · '):null,updatedAt:new Date()});}catch{setLoad(p=>({...p,loading:false,error:'Не удалось загрузить матчи'}));}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 const toggle=useCallback((team:string)=>setFavorites(p=>p.includes(team)?p.filter(x=>x!==team):[...p,team]),[]);
 const value=useMemo(()=>({...load,refresh,favorites,toggle}),[load,refresh,favorites,toggle]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useHockey(){const ctx=useContext(Context);if(!ctx)throw Error('HockeyProvider отсутствует');return ctx;}
