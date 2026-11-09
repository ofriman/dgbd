"use strict";

/* ============ אינדקס התנ״ך בזיכרון ============ */
/* לכל ספר: streams[b].w = רצף כל המילים (מנורמלות), streams[b].r = אינדקס פסוק לכל מילה,
   streams[b].n = רצף המילים עם הניקוד שלהן (טעמים מופרדים) להתאמה רגישה לניקוד.
   verseList[b] = רשימת הפסוקים: {t: מילים מנוקדות, w: מילים מנורמלות, c: פרק, v: פסוק, start: מיקום תחילת הפסוק ברצף}. */
var bookNames=[], streams=[], verseList=[];
TANAKH.forEach(function(bk,bi){
  bookNames.push(bk.n);
  var sw=[],sr=[],sn=[],vl=[];
  bk.c.forEach(function(ch,ci){
    ch.forEach(function(vs,vi){
      vl.push({t:vs.t,w:vs.w,c:ci+1,v:vi+1,start:sw.length});
      for(var k=0;k<vs.w.length;k++){sw.push(vs.w[k]);sr.push(vl.length-1);sn.push(stripTm(vs.t[k]||vs.w[k]));}
    });
  });
  streams.push({w:sw,r:sr,n:sn}); verseList.push(vl);
});
/* רצף אותיות לכל ספר (נבנה עצלה) לחיפושי דילוג: letters[b].L אותיות, letters[b].wi אינדקס מילה ברצף */
var lettersCache=[];
function lettersOf(bi){
  if(lettersCache[bi])return lettersCache[bi];
  var s=streams[bi],L=[],wi=[];
  for(var i=0;i<s.w.length;i++){var w=s.w[i];for(var k=0;k<w.length;k++){L.push(w[k]);wi.push(i);}}
  return lettersCache[bi]={L:L,wi:wi};
}

/* ================= תצוגה ================= */
var input=document.getElementById('word'),results=document.getElementById('results');
/* "כל השיטות" הוא מצב-על: מריץ את כל הרשומות ב-MODES ומקבץ תוצאות לפי שיטה.
   הוא לא מחזיק רשימת שיטות משלו - הוא עובר על MODES, ולכן שיטה חדשה נכנסת אליו אוטומטית. */
var ALL={id:'all', name:'כל השיטות'};
var SEL=[ALL].concat(MODES); /* כפתורי הבחירה: כל השיטות, ואז כל השיטות מ-MODES */
var curMode=ALL, curInput='';
var HN1='אבגדהוזחט',HN2='יכלמנסעפצ',HN3='קרשת';
function hebNum(n){
  var s='';
  while(n>=400){s+='ת';n-=400;}
  if(n>=100){s+=HN3[Math.floor(n/100)-1];n%=100;}
  if(n===15){s+='טו';n=0;}else if(n===16){s+='טז';n=0;}
  else{if(n>=10){s+=HN2[Math.floor(n/10)-1];n%=10;}if(n>0)s+=HN1[n-1];}
  if(s.length>1)return s.slice(0,-1)+'״'+s.slice(-1);
  return s+'׳';
}
function esc(s){return s.replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function refName(vr){return bookNames[vr.b]+' '+hebNum(vr.c)+' '+hebNum(vr.v);}
function renderRange(bi,from,to,markFrom,markTo,markSet,fullVerses){
  /* מציג טווח מילים ברצף הספר, מקובץ לפי פסוקים, עם סימון markFrom..markTo (או markSet של אינדקסים).
     fullVerses=true מרחיב את הטווח לגבולות הפסוקים, כדי שיוצג הפסוק המנוקד המלא. */
  var s=streams[bi],vl=verseList[bi],html='',lastV=-1;
  if(fullVerses){var vf=vl[s.r[from]];from=vf.start;var vt=vl[s.r[to]];to=vt.start+vt.w.length-1;}
  for(var i=from;i<=to;i++){
    var vr=s.r[i],vs=vl[vr],k=i-vs.start;
    if(vr!==lastV){if(lastV!==-1)html+=' · ';html+='<span class="ref">'+refName({b:bi,c:vs.c,v:vs.v})+'</span>';lastV=vr;}
    var tok=vs.t[k]||vs.w[k];
    var mk=markSet?markSet.has(i):(i>=markFrom&&i<=markTo);
    html+=' <span class="verse">'+(mk?'<mark>'+esc(tok)+'</mark>':esc(tok))+'</span>';
  }
  return html;
}
function infoCard(mode,w){
  var h='<div class="card"><div class="chead"><span class="cname">'+esc(mode.name)+'</span><span class="ctag">'+esc(mode.desc||'')+'</span></div>';
  var g=gval(w),m=gmil(w);
  h+='<div class="totals"><div class="tot"><div class="lbl">גימטריה רגילה</div><div class="num">'+g+'</div></div>'+
     '<div class="tot"><div class="lbl">גימטריה מלאה (מילוי)</div><div class="num">'+m+'</div></div></div>';
  var parts=[];for(var i=0;i<w.length;i++){var c=w[i];if(REGV[c])parts.push({l:c,v:REGV[c]});}
  h+='<div class="chips">'+parts.map(function(x){return '<span class="chip"><b>'+esc(x.l)+'</b><span>'+x.v+'</span></span>';}).join('')+'</div>';
  if(mode.transform){var t=mode.transform(w);h+='<div class="swapword" style="margin-top:14px"><span class="from">'+esc(w)+' ← </span>'+esc(t)+'</div>';}
  return h+'</div>';
}
function syncURL(w,mode){
  try{
    var p='#q='+encodeURIComponent(w)+'&m='+mode.id;
    if(mode.needsSkip||mode===ALL)p+='&d='+(+document.getElementById('skipD').value||1);
    history.replaceState(null,'',p);
  }catch(e){}
}
/* מרנדר כרטיס תוצאות של שיטה אחת לתוך box. title - כותרת הכרטיס;
   showTransform - true כששורת ההמרה (אתב״ש וכד׳) צריכה להופיע בכרטיס עצמו (במצב "כל השיטות").
   nikud - מגבלות הניקוד מהקלט הגולמי (פלט parseNikud), או null כשהקלט לא מנוקד. */
function renderModeMatches(box,mode,w,skip,title,showTransform,nikud){
  var winB=mode.before||0, winA=mode.after||0;
  var st={shownWords:60, shownOcc:10};
  if(mode.kind==='word'){
    var inputNoSpace=w.replace(/ /g,'');
    var ctx0={input:inputNoSpace,inputG:gval(inputNoSpace),inputM:gmil(inputNoSpace),nikud:nikud};
    if(mode.transform)ctx0.transformed=mode.transform(inputNoSpace);
    var groups={};
    streams.forEach(function(s,bi){
      var vl=verseList[bi];
      for(var i=0;i<s.w.length;i++){
        var ctx=ctx0;
        ctx0.nword=s.n[i];
        if(winB||winA){
          ctx.before=s.w.slice(Math.max(0,i-winB),i);
          ctx.after=s.w.slice(i+1,i+1+winA);
          var vs=vl[s.r[i]];ctx.loc={b:bi,c:vs.c,v:vs.v};
        }
        if(mode.match(s.w[i],ctx)){
          var key=s.w[i];
          (groups[key]||(groups[key]={word:key,count:0,locs:[]})).count++;
          groups[key].locs.push({b:bi,i:i});
        }
      }
    });
    var words=Object.keys(groups).sort(function(a,b){return groups[b].count-groups[a].count||a.localeCompare(b,'he');});
    var totOcc=words.reduce(function(n,k){return n+groups[k].count;},0);
    var ctag=(words.length===1?'מילה אחת':words.length+' מילים שונות')+' · '+totOcc+' מופעים בכל התנ״ך';
    if(mode.usesNikud&&nikud)ctag+=' · מתחשב בניקוד שהוזן';
    var h='<div class="chead"><span class="cname">'+esc(title)+'</span><span class="ctag">'+ctag+'</span></div>';
    if(showTransform&&mode.transform)h+='<div class="swapword" style="margin:2px 0 10px"><span class="from">'+esc(inputNoSpace)+' ← </span>'+esc(ctx0.transformed)+'</div>';
    if(!words.length)h+='<div class="nomatch">לא נמצאו התאמות בכל התנ״ך.</div>';
    else{
      h+='<div class="matchlist" data-mlist></div><div data-mocc></div>';
      h+='<button class="moreBtn" data-morew hidden></button>';
    }
    box.innerHTML=h;
    if(words.length){
      var mlist=box.querySelector('[data-mlist]'),mocc=box.querySelector('[data-mocc]'),moreW=box.querySelector('[data-morew]');
      var paint=function(){
        var vis=words.slice(0,st.shownWords);
        mlist.innerHTML=vis.map(function(k){return '<button data-w="'+esc(k)+'">'+esc(k)+'<small>'+groups[k].count+'</small></button>';}).join('');
        mlist.querySelectorAll('button').forEach(function(b){
          b.addEventListener('click',function(){show(b.getAttribute('data-w'));});
        });
        if(words.length>st.shownWords){moreW.hidden=false;moreW.style.display='';moreW.textContent='הצג עוד מילים ('+(words.length-st.shownWords)+')';}
        else {moreW.hidden=true;moreW.style.display='none';}
      };
      var show=function(key){
        var g=groups[key];
        var hh='<div class="occs"><div class="ctag" style="margin-bottom:8px">מופעים של <b>'+esc(key)+'</b> · לחיצה על ״הצג עוד מופעים״ מציגה את כולם</div>';
        g.locs.slice(0,st.shownOcc).forEach(function(L){
          var from=Math.max(0,L.i-winB), to=Math.min(streams[L.b].w.length-1,L.i+winA);
          hh+='<div class="occ">'+renderRange(L.b,from,to,L.i,L.i,null,true)+'</div>';
        });
        if(g.locs.length>st.shownOcc)hh+='<button class="moreBtn" data-moreo>הצג עוד מופעים ('+(g.locs.length-st.shownOcc)+')</button>';
        mocc.innerHTML=hh+'</div>';
        var mo=mocc.querySelector('[data-moreo]');
        if(mo)mo.addEventListener('click',function(){st.shownOcc+=50;show(key);});
      };
      moreW.addEventListener('click',function(){st.shownWords+=120;paint();});
      paint();
      show(words[0]);
    }
  }else{
    var all=[];
    streams.forEach(function(s,bi){
      var r=mode.run(bi,w.replace(/ /g,''),skip);
      r.forEach(function(x){all.push({b:bi,i:x.i,span:x.span,marks:x.marks});});
    });
    var tot=all.length;
    var ctag=tot+' מופעים בכל התנ״ך';
    if(mode.needsSkip)ctag+=' · מרחק דילוג '+skip;
    var h='<div class="chead"><span class="cname">'+esc(title)+'</span><span class="ctag">'+ctag+'</span></div>';
    if(!tot)h+='<div class="nomatch">לא נמצאו התאמות בכל התנ״ך.</div>';
    else h+='<div class="occs" data-socc></div><button class="moreBtn" data-mores hidden></button>';
    box.innerHTML=h;
    if(tot){
      var socc=box.querySelector('[data-socc]'),moreS=box.querySelector('[data-mores]');
      var paintS=function(){
        var hh='';
        all.slice(0,st.shownOcc).forEach(function(L){
          var s=streams[L.b];
          var from=Math.max(0,L.i-winB), to=Math.min(s.w.length-1,L.i+L.span-1+winA);
          hh+='<div class="occ">'+renderRange(L.b,from,to,L.i,L.i+L.span-1,L.marks?new Set(L.marks):null,true)+'</div>';
        });
        socc.innerHTML=hh;
        if(tot>st.shownOcc){moreS.hidden=false;moreS.style.display='';moreS.textContent='הצג עוד מופעים ('+(tot-st.shownOcc)+')';}
        else {moreS.hidden=true;moreS.style.display='none';}
      };
      moreS.addEventListener('click',function(){st.shownOcc+=100;paintS();});
      paintS();
    }
  }
}
function runSearch(){
  var w=clean(input.value); curInput=w;
  document.getElementById('skipWrap').hidden=!(curMode.needsSkip||curMode===ALL);
  if(w)syncURL(input.value.trim(),curMode);
  if(!w){document.body.classList.remove('searching');results.innerHTML='';return;}
  document.body.classList.add('searching');
  var skip=+document.getElementById('skipD').value||1;
  /* מגבלות הניקוד נקראות מהקלט הגולמי, לפני שהניקוד מופרד לצורך חיפוש האותיות. */
  var nikudArr=parseNikud(input.value);
  var nikud=hasNikudMarks(nikudArr)?nikudArr:null;
  var h;
  if(curMode===ALL){
    h='<div class="queryline">תוצאות עבור <b>'+esc(input.value.trim())+'</b> בכל השיטות</div>';
    h+=infoCard(ALL,w);
    if(nikud)h+='<div class="queryline">במילה מדויקת: הניקוד שהוזן מחייב; אות ללא ניקוד אינה מגבילה. שאר השיטות פועלות לפי אותיות בלבד. טעמי המקרא אינם מגבילים.</div>';
    results.innerHTML=h;
    MODES.forEach(function(m){
      var card=document.createElement('div');card.className='card matches';
      results.appendChild(card);
      renderModeMatches(card,m,w,skip,m.name,true,nikud);
    });
  }else{
    var mode=curMode;
    h='<div class="queryline">תוצאות עבור <b>'+esc(input.value.trim())+'</b> במצב <b>'+esc(mode.name)+'</b></div>';
    h+=infoCard(mode,w);
    results.innerHTML=h;
    var card=document.createElement('div');card.className='card matches';
    results.appendChild(card);
    renderModeMatches(card,mode,w,skip,'התאמות',false,nikud);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ================= בניית הממשק ================= */
var grid=document.getElementById('modegrid');
document.getElementById('tagline').textContent='מנוע חיפוש מעל כל התנ״ך · '+MODES.map(function(m){return m.name;}).join(' · ');
SEL.forEach(function(m){
  var b=document.createElement('button');
  b.textContent=m.name;b.setAttribute('aria-pressed',m===curMode);
  b.addEventListener('click',function(){
    curMode=m;
    grid.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed','false');});
    b.setAttribute('aria-pressed','true');
    runSearch();
  });
  grid.appendChild(b);
});
document.getElementById('go').addEventListener('click',runSearch);
input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();runSearch();}});
document.getElementById('skipD').addEventListener('change',runSearch);
/* קישור ישיר: פתיחת הדף עם #q=...&m=...&d=... משחזר ומריץ את החיפוש (m=all הוא "כל השיטות"; q יכול להיות מנוקד) */
try{
  var hp={};location.hash.replace(/^#/,'').split('&').forEach(function(kv){var p=kv.split('=');if(p[0])hp[p[0]]=decodeURIComponent(p[1]||'');});
  if(hp.m){var mm=SEL.filter(function(x){return x.id===hp.m;})[0];if(mm){curMode=mm;grid.querySelectorAll('button').forEach(function(x,ix){x.setAttribute('aria-pressed',SEL[ix]===mm);});}}
  if(hp.d)document.getElementById('skipD').value=hp.d;
  if(hp.q){input.value=hp.q;runSearch();}
  else document.getElementById('skipWrap').hidden=!(curMode.needsSkip||curMode===ALL);
}catch(e){}
