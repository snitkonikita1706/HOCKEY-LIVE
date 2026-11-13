import React from 'react';
import{ScrollView,StyleSheet,Text,View}from 'react-native';
import{colors}from '../src/theme';
const sections=[
 ['Что хранится на устройстве','Приложение сохраняет список избранных команд и последний загруженный календарь матчей в локальном хранилище телефона (AsyncStorage). Для этих функций регистрация не требуется.'],
 ['Откуда загружаются данные','Для получения расписания и результатов приложение обращается к NHL API и публичным файлам проекта HOCKEY LIVE на GitHub Pages. Внешние сервисы могут получать технические сведения сетевого соединения, включая IP-адрес, согласно собственным правилам.'],
 ['Трансляции','При выборе просмотра приложение открывает внешние сайты вещателей, например DAZN или КХЛ Видео. Эти сервисы работают по своим условиям и политикам конфиденциальности; HOCKEY LIVE не получает ваши пароли или данные подписки.'],
 ['Учётные записи и аналитика','В текущей тестовой версии нет регистрации, собственной аналитики поведения, рекламных SDK и сервера пользовательских профилей. Push-уведомления и доступ к геолокации не используются.'],
 ['Удаление данных','Избранное и кэш можно удалить, удалив приложение с телефона. В следующих версиях добавим отдельное управление локальным хранилищем.'],
 ['Изменения','Перед публикацией в App Store политика должна быть сверена с фактическим списком библиотек, сетевых сервисов и формой App Privacy в App Store Connect.']
] as const;
export default function Privacy(){return <ScrollView style={s.page} contentContainerStyle={s.body}>
 <Text style={s.title}>Конфиденциальность</Text><Text style={s.date}>HOCKEY LIVE 4.0 Alpha · 13 ноября 2026 года</Text>
 <View style={s.note}><Text style={s.noteText}>Это политика текущей тестовой версии. Приложение не является официальным продуктом NHL, KHL или КЛХЛ.</Text></View>
 {sections.map(([name,description])=><View key={name} style={s.section}><Text style={s.heading}>{name}</Text><Text style={s.copy}>{description}</Text></View>)}
 </ScrollView>;}
const s=StyleSheet.create({page:{flex:1,backgroundColor:colors.bg},body:{paddingHorizontal:20,paddingTop:28,paddingBottom:90},title:{color:colors.text,fontSize:28,fontWeight:'900'},date:{color:colors.muted,marginTop:7,marginBottom:23,fontSize:12},note:{backgroundColor:colors.panel2,borderRadius:14,padding:15,marginBottom:20},noteText:{color:colors.cyan,fontSize:12,lineHeight:19},section:{paddingVertical:17,borderBottomWidth:1,borderColor:colors.line},heading:{color:colors.text,fontSize:16,fontWeight:'800',marginBottom:8},copy:{color:colors.muted,lineHeight:22,fontSize:13}});
