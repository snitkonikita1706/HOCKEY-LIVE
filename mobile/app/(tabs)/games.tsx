import React,{useMemo,useState}from 'react';
import{ActivityIndicator,FlatList,Pressable,StyleSheet,Text,View}from 'react-native';
import{GameCard}from '../../src/components';
import{useHockey}from '../../src/context';
import{colors}from '../../src/theme';
const options=['Все','NHL','KHL','KLHL']as const;
type LeagueFilter=typeof options[number];
type Mode='Ближайшие'|'Результаты';
function dateKey(date:string){const d=new Date(date);if(!Number.isFinite(d.getTime()))return '';return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function shiftDay(value:string,n:number){const [y,m,d]=value.split('-').map(Number);const next=new Date(y,m-1,d+n);return [next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');}
function dayLabel(value:string){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});}
export default function Games(){
 const{games,loading,error,cached,refresh}=useHockey();
 const[league,setLeague]=useState<LeagueFilter>('Все');
 const[mode,setMode]=useState<Mode>('Ближайшие');
 const[day,setDay]=useState<string|null>(null);
 const filtered=useMemo(()=>{
  const list=games.filter(g=>(league==='Все'||g.league===league)
   &&(mode==='Результаты'?g.status==='done':g.status!=='done')
   &&(!day||dateKey(g.date)===day));
  return mode==='Результаты'?list.slice().reverse():list;
 },[games,league,mode,day]);
 const updateDay=(delta:number)=>setDay(p=>shiftDay(p||dateKey(new Date().toISOString()),delta));
 return <View style={s.base}>
  <Text style={s.title}>Матчи</Text>
  <Text style={s.caption}>НХЛ · КХЛ · КЛХЛ</Text>
  <View style={s.filters}>{options.map(x=><Pressable accessibilityRole="button" key={x} onPress={()=>setLeague(x)} style={[s.filter,league===x&&s.selected]}><Text style={[s.filterText,league===x&&s.active]}>{x==='KLHL'?'КЛХЛ':x}</Text></Pressable>)}</View>
  <View style={s.filters}>{(['Ближайшие','Результаты']as const).map(x=><Pressable accessibilityRole="button" key={x} onPress={()=>setMode(x)} style={[s.mode,mode===x&&{borderBottomColor:colors.cyan}]}><Text style={{color:mode===x?colors.text:colors.muted,fontWeight:'800'}}>{x}</Text></Pressable>)}</View>
  <View style={s.calendar}>
   <Pressable accessibilityLabel="Предыдущий день" style={s.arrow} onPress={()=>updateDay(-1)}><Text style={s.arrowText}>‹</Text></Pressable>
   <Pressable accessibilityLabel="Сбросить фильтр даты" style={s.day} onPress={()=>setDay(null)}><Text style={s.dayText}>{day?dayLabel(day):'Все даты'}</Text><Text style={s.hint}>{day?'Нажмите для сброса':'Выберите день стрелками'}</Text></Pressable>
   <Pressable accessibilityLabel="Следующий день" style={s.arrow} onPress={()=>updateDay(1)}><Text style={s.arrowText}>›</Text></Pressable>
  </View>
  {cached?<Text style={s.warn}>Офлайн: показан последний сохранённый календарь</Text>:null}
  {error?<Text style={s.warn}>{error}</Text>:null}
  {loading?<ActivityIndicator style={{marginTop:24}} color={colors.cyan}/>:null}
  <FlatList data={filtered} keyExtractor={x=>x.id} renderItem={({item})=><GameCard game={item}/>} onRefresh={()=>void refresh()} refreshing={loading} contentContainerStyle={{paddingBottom:100,paddingTop:12}} ListEmptyComponent={!loading?<Text style={s.empty}>{day?'На выбранную дату матчей нет. Выберите другую дату.':'Здесь пока нет матчей. Попробуйте другую лигу или вкладку.'}</Text>:undefined}/>
 </View>;
}
const s=StyleSheet.create({
 base:{flex:1,backgroundColor:colors.bg,paddingHorizontal:18,paddingTop:65},
 title:{color:colors.text,fontSize:32,fontWeight:'900'},caption:{color:colors.muted,marginTop:5,marginBottom:25},
 filters:{flexDirection:'row',gap:8,marginBottom:15},filter:{paddingHorizontal:15,paddingVertical:10,backgroundColor:colors.panel,borderRadius:10},
 selected:{backgroundColor:colors.cyan},filterText:{color:colors.muted,fontWeight:'800'},active:{color:colors.bg},
 mode:{paddingHorizontal:13,paddingVertical:10,borderBottomWidth:2,borderBottomColor:'transparent'},
 calendar:{flexDirection:'row',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:16,marginBottom:15},
 arrow:{paddingVertical:8,paddingHorizontal:18},arrowText:{fontSize:29,color:colors.cyan,fontWeight:'700'},
 day:{flex:1,alignItems:'center',paddingVertical:11},dayText:{color:colors.text,fontWeight:'800',fontSize:14},hint:{color:colors.muted,fontSize:10,marginTop:4},
 warn:{color:colors.gold,marginBottom:7},empty:{color:colors.muted,textAlign:'center',marginTop:40}
});
