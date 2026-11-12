export type League='NHL'|'KHL'|'KLHL';
export type MatchStatus='live'|'done'|'scheduled';
export type HockeyGame={id:string;league:League;home:string;away:string;homeLogo?:string;awayLogo?:string;homeScore?:number;awayScore?:number;date:string;status:MatchStatus;period?:string;division?:string;watch?:string};
export type LoadState={games:HockeyGame[];loading:boolean;error:string|null;updatedAt:Date|null};
