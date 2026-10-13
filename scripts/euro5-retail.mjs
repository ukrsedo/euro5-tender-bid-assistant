export const EURO5_RETAIL_URL='https://euro5.ua/tsiny-na-palne/';
export function parseEuro5Retail(html){
 const strip=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
 const result={},labels={'95':'a95','95 EURO':'a95premium','92':'a92','ДП':'dt','ДП EURO':'dtPremium','ГАЗ':'lpg'};
 const chunks=String(html).split(/<div\b[^>]*class=["'][^"']*\bfuel__col\b[^"']*["'][^>]*>/i).slice(1);
 for(const block of chunks){
  const title=block.match(/<div\b[^>]*class=["'][^"']*\belementor-heading-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const price=block.match(/<span\b[^>]*class=["'][^"']*\belementor-heading-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if(!title||!price)continue;
  const key=labels[strip(title[1])],value=Number(strip(price[1]).replace(',','.'));
  if(key&&Number.isFinite(value)&&value>0){if(result[key]!==undefined&&result[key]!==value)throw Error('Неоднозначні ціни Євро5');result[key]=value}
 }
 if(!(result.a95>0)||!(result.dt>0))throw Error('Стела Євро5: не знайдено звичайні А-95 та ДП');
 return result;
}
export function euro5ObservationDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
