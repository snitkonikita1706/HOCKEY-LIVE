import React from 'react';
import{Linking,Pressable,ScrollView,StyleSheet,Text,View}from 'react-native';
import{useHockey}from '../../src/context';
import{colors}from '../../src/theme';
const website='https://snitkonikita1706.github.io/HOCKEY-LIVE/';
const repo='https://github.com/snitkonikita1706/HOCKEY-LIVE';
export default function Settings(){
 const{games,error,loading,cached,updatedAt,refresh,favorites}=useHockey();
 const label=updatedAt?updatedAt.toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Ещё нет данных';
 const count=(league:string)=>games.filter(g=>g.league===league).length;
 return <ScrollView style={s.page} contentContainerStyle={s.body}>
   <Text style={s.title}>Настройки</Text><Text style={s.lead}>HOCKEY LIVE PRO · iPhone</Text>
   <View style={s.panel}>
    <Text style={s.heading}>Данные и подключение</Text>
    <View style={s.row}><Text style={s.item}>Последняя загрузка</Text><Text style={s.value}>{label}</Text></View>
    <View style={s.row}><Text style={s.item}>Режим</Text><Text style={[s.value,{color:cached?colors.gold:colors.green}]}>{cached?'Сохранённые данные':'Сетевая синхронизация'}</Text></View>
    <View style={s.row}><Text style={s.item}>Матчи НХЛ / КХЛ / КЛХЛ</Text><Text style={s.value}>{count('NHL')} / {count('KHL')} / {count('KLHL')}</Text></View>
    {error?<Text style={s.warn}>{error}</Text>:null}
    <Pressable accessibilityRole="button" disabled={loading} onPress={()=>void refresh()} style={[s.cta,loading&&{opacity:.55}]}><Text style={s.ctaText}>{loading?'Обновление…':'↻ Обновить данные'}</Text></Pressable>
   </View>
   <View style={s.panel}><Text style={s.heading}>Персональные данные</Text>
    <Text style={s.explain}>Избранных клубов: {favorites.length}. Список хранится локально на устройстве и не передаётся на сервер HOCKEY LIVE. После удаления приложения локальные данные могут исчезнуть.</Text>
   </View>
   <View style={s.panel}><Text style={s.heading}>Источники</Text>
    <Text style={s.explain}>НХЛ — NHL API. КХЛ — периодическая выгрузка Webcaster. КЛХЛ — архив федерации, а не LIVE. Показ трансляций зависит от прав, региона и подписки.</Text>
    <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(website)} style={s.link}><Text style={s.linkText}>Открыть текущую веб-версию ↗</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(repo)} style={s.link}><Text style={s.linkText}>Исходный проект GitHub ↗</Text></Pressable>
   </View>
   <Text style={s.footer}>Версия 4.0.0 · тестовая сборка. Неофициальное приложение: не аффилировано с КХЛ, НХЛ или КЛХЛ.</Text>
 </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},body:{paddingHorizontal:18,paddingTop:65,paddingBottom:110},
 title:{fontSize:32,fontWeight:'900',color:colors.text},lead:{color:colors.muted,marginTop:6,marginBottom:24},
 panel:{backgroundColor:colors.panel,borderRadius:18,borderColor:colors.line,borderWidth:1,padding:17,marginBottom:14},
 heading:{color:colors.text,fontWeight:'900',fontSize:18,marginBottom:14},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12},
 item:{color:colors.muted,fontSize:12,flex:1},value:{color:colors.text,fontWeight:'800',fontSize:12,textAlign:'right',flexShrink:1},
 warn:{color:colors.gold,fontSize:12,lineHeight:18,marginBottom:14},cta:{backgroundColor:colors.cyan,borderRadius:12,padding:14,alignItems:'center'},
 ctaText:{color:colors.bg,fontWeight:'900'},explain:{color:colors.muted,lineHeight:20,fontSize:13},
 link:{marginTop:13,paddingVertical:8},linkText:{color:colors.cyan,fontWeight:'800',fontSize:13},
 footer:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:12,textAlign:'center'}
});
