"use strict";

/* ================= טבלאות אותיות ================= */
var REGV={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
var MILUI={'א':'אלף','ב':'בית','ג':'גימל','ד':'דלת','ה':'הא','ו':'ואו','ז':'זין','ח':'חית','ט':'טית','י':'יוד','כ':'כף','ל':'למד','מ':'מם','נ':'נון','ס':'סמך','ע':'עין','פ':'פא','צ':'צדי','ק':'קוף','ר':'ריש','ש':'שין','ת':'תו'};
var FINAL={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
function bse(c){return FINAL[c]||c;}
function mkPairs(p){var m={};p.forEach(function(x){m[x[0]]=x[1];m[x[1]]=x[0];});return m;}
var ATBASH=mkPairs([['א','ת'],['ב','ש'],['ג','ר'],['ד','ק'],['ה','צ'],['ו','פ'],['ז','ע'],['ח','ס'],['ט','נ'],['י','מ'],['כ','ל']]);
var ALBAM=mkPairs([['א','ל'],['ב','מ'],['ג','נ'],['ד','ס'],['ה','ע'],['ו','פ'],['ז','צ'],['ח','ק'],['ט','ר'],['י','ש'],['כ','ת']]);
var ACHAS=(function(){var g=['אחס','בטע','גיק','דכב','הלמ','ונפ','זסח','חצי','טכע'],m={};
  g.forEach(function(s){for(var i=0;i<3;i++)m[s[i]]=s[(i+1)%3];});return m;})();
var NEXTL=(function(){var a='אבגדהוזחטיכלמנסעפצקרשת',m={};for(var i=0;i<a.length;i++)m[a[i]]=a[(i+1)%a.length];return m;})();
function gval(s){var n=0;for(var i=0;i<s.length;i++)n+=REGV[s[i]]||0;return n;}
function gmil(s){var n=0;for(var i=0;i<s.length;i++){var c=s[i];if(REGV[c])n+=gval(MILUI[bse(c)]);}return n;}
function xf(map){return function(s){var o='';for(var i=0;i<s.length;i++){var c=bse(s[i]);o+=map[c]||c;}return o;};}
function rev(s){return s.split('').reverse().join('');}
function clean(s){s=(s||'');var o='';for(var i=0;i<s.length;i++){var c=s[i];if(REGV[c]||c===' ')o+=c;}return o.replace(/\s+/g,' ').trim();}

/* ============ רשימת מצבי החיפוש — כאן מוסיפים מצב חדש ============
   כל מצב הוא רשומה אחת כאן. מוסיפים רשומה לרשימה — והיא מופיעה אוטומטית בכפתורי המצבים באתר, בלי לגעת בשום מקום אחר.
     name : השם שמוצג בכפתור.
     kind : 'word' — match(w, ctx) רצה על כל מילה בתנ״ך (כל הספרים), ומחזירה true אם יש התאמה.
            'seq'  — run(bi, input, skip) רצה פעם אחת על כל ספר ומחזירה [{i, span}] (אינדקס מילה ברצף הספר + אורך במילים). מתאים לרצפים כמו ראשי תיבות ודילוגים.
     ctx למצב word: {input (הקלט מנורמל), inputG (גימטריה רגילה של הקלט), inputM (גימטריית מילוי),
                     transformed (אם הוגדר transform), before/after (מילים לפני/אחרי, בגודל שהמצב מבקש),
                     loc:{b (ספר), c (פרק), v (פסוק)}}.
     before/after : אופציונלי — כמה מילים לפני/אחרי הפונקציה צריכה להכיר (ברירת מחדל 0).
                    אותו חלון גם מוצג ליד כל תוצאה. המילים נלקחות מרצף הספר בלבד, בלי לחצות בין ספרים.
     transform : אופציונלי — פונקציה על הקלט (למשל החלפת אותיות); התוצאה מוצגת בכרטיס וזמינה ב-ctx.transformed.
     needsSkip : true — מציג שדה ״מרחק דילוג״ ומעביר את הערך ל-run.
   דוגמה להוספת מצב ״גימטריה קטנה״ (סכום ספרות של הערך, חוזר עד ספרה אחת):
     function gkat(s){var n=gval(s);while(n>9)n=String(n).split('').reduce(function(a,d){return a+ +d;},0);return n;}
     {id:'kat', name:'גימטריה קטנה', kind:'word', match:function(w,ctx){return w!==ctx.input&&gkat(w)===gkat(ctx.input);}}
   דוגמה למצב שצריך הקשר: מילה שמופיעה מיד אחרי המילה ״אמר״:
     {id:'after_amar', name:'אחרי ״אמר״', kind:'word', before:1, match:function(w,ctx){return w===ctx.input&&ctx.before[0]==='אמר';}}
*/
var MODES=[
 {id:'exact', name:'מילה מדויקת', kind:'word',
  match:function(w,ctx){return w===ctx.input;}},
 {id:'gem', name:'גימטריה רגילה', desc:'אותיות סופיות נחשבות כרגילות', kind:'word',
  match:function(w,ctx){return w!==ctx.input&&gval(w)===ctx.inputG;}},
 {id:'mil', name:'גימטריה מלאה (מילוי)', desc:'כל אות נכתבת במלואה', kind:'word',
  match:function(w,ctx){return w!==ctx.input&&gmil(w)===ctx.inputM;}},
 {id:'atbash', name:'אתב״ש', desc:'א↔ת · ב↔ש · ג↔ר · ד↔ק …', kind:'word', transform:xf(ATBASH),
  match:function(w,ctx){return w===ctx.transformed;}},
 {id:'albam', name:'אלב״ם', desc:'א↔ל · ב↔מ · ג↔נ · ד↔ס …', kind:'word', transform:xf(ALBAM),
  match:function(w,ctx){return w===ctx.transformed;}},
 {id:'achas', name:'אח״ס בט״ע', desc:'כל אות ← הבאה בשלישייה שלה', kind:'word', transform:xf(ACHAS),
  match:function(w,ctx){return w===ctx.transformed;}},
 {id:'next', name:'א״ב ב״ה', desc:'כל אות ← האות הבאה · ת←א', kind:'word', transform:xf(NEXTL),
  match:function(w,ctx){return w===ctx.transformed;}},
 {id:'rev', name:'היפוך מילה', desc:'האותיות בסדר הפוך', kind:'word', transform:rev,
  match:function(w,ctx){return w===ctx.transformed;}},
 {id:'rosh', name:'ראשי תיבות', desc:'אותיות ראשונות של מילים עוקבות', kind:'seq', before:2, after:2,
  run:function(bi,input){return acro(streams[bi].w,input,function(w){return bse(w[0]);});}},
 {id:'sof', name:'סופי תיבות', desc:'אותיות אחרונות של מילים עוקבות', kind:'seq', before:2, after:2,
  run:function(bi,input){return acro(streams[bi].w,input,function(w){return bse(w[w.length-1]);});}},
 {id:'skip', name:'דילוג אותיות (אלכסון)', desc:'אותיות במרחק קבוע לאורך הספר', kind:'seq', needsSkip:true,
  run:function(bi,input,skip){
    var o=lettersOf(bi),L=o.L,wi=o.wi,res=[],m=input.length;
    if(!m||skip<1)return res;
    for(var p=0;p+ (m-1)*skip < L.length;p++){
      if(L[p]!==input[0])continue;
      var ok=true,marks=[wi[p]];
      for(var k=1;k<m;k++){if(L[p+k*skip]!==input[k]){ok=false;break;}marks.push(wi[p+k*skip]);}
      if(ok)res.push({i:wi[p],span:wi[p+(m-1)*skip]-wi[p]+1,marks:marks});
    }
    return res;
  }},
];
function acro(words,input,get){
  var res=[],m=input.length;if(!m)return res;
  for(var i=0;i+m<=words.length;i++){
    var ok=true;
    for(var k=0;k<m;k++){if(get(words[i+k])!==bse(input[k])){ok=false;break;}}
    if(ok)res.push({i:i,span:m});
  }
  return res;
}

