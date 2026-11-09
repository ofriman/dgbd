"use strict";

/* ============ אינדקס התנ״ך בזיכרון ============ */
/* לכל ספר: streams[b].w = רצף כל המילים (מנורמלות), streams[b].r = אינדקס פסוק לכל מילה.
   verseList[b] = רשימת הפסוקים: {t: מילים מנוקדות, w: מילים מנורמלות, c: פרק, v: פסוק, start: מיקום תחילת הפסוק ברצף}. */
var bookNames=[], streams=[], verseList=[];
TANAKH.forEach(function(bk,bi){
  bookNames.push(bk.n);
  var sw=[],sr=[],vl=[];
  bk.c.forEach(function(ch,ci){
    ch.forEach(function(vs,vi){
      vl.push({t:vs.t,w:vs.w,c:ci+1,v:vi+1,start:sw.length});
      for(var k=0;k<vs.w.length;k++){sw.push(vs.w[k]);sr.push(vl.length-1);}
    });
  });
  streams.push({w:sw,r:sr}); verseList.push(vl);
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
var curMode=MODES[0], shownWords=60, shownOcc=10, curInput='';
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
    if(mode.needsSkip)p+='&d='+(+document.getElementById('skipD').value||1);
    history.replaceState(null,'',p);
  }catch(e){}
}
function runSearch(){
  var w=clean(input.value); curInput=w; shownWords=60; shownOcc=10;
  document.getElementById('skipWrap').hidden=!curMode.needsSkip;
  if(w)syncURL(w,curMode);
  if(!w){document.body.classList.remove('searching');results.innerHTML='';return;}
  document.body.classList.add('searching');
  var mode=curMode;
  var h='<div class="queryline">תוצאות עבור <b>'+esc(w)+'</b> במצב <b>'+esc(mode.name)+'</b></div>';
  h+=infoCard(mode,w);
  var winB=mode.before||0, winA=mode.after||0;
  if(mode.kind==='word'){
    var inputNoSpace=w.replace(/ /g,'');
    var ctx0={input:inputNoSpace,inputG:gval(inputNoSpace),inputM:gmil(inputNoSpace)};
    if(mode.transform)ctx0.transformed=mode.transform(inputNoSpace);
    var groups={};
    streams.forEach(function(s,bi){
      var vl=verseList[bi];
      for(var i=0;i<s.w.length;i++){
        var ctx=ctx0;
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
      h+='<div class="card matches"><div class="chead"><span class="cname">התאמות</span><span class="ctag">'+(words.length===1?'מילה אחת':words.length+' מילים שונות')+' · '+totOcc+' מופעים בכל התנ״ך</span></div>';
    if(!words.length)h+='<div class="nomatch">לא נמצאו התאמות בכל התנ״ך.</div>';
    else{
      h+='<div class="matchlist" id="mlist"></div><div id="mocc"></div>';
      if(words.length>shownWords)h+='<button class="moreBtn" id="moreW">הצג עוד מילים ('+(words.length-shownWords)+')</button>';
    }
    h+='</div>';
    results.innerHTML=h;
    renderWordList(words,groups,winB,winA);
    if(words.length)showOcc(words[0],groups,winB,winA);
    var mb=document.getElementById('moreW');
    if(mb)mb.addEventListener('click',function(){shownWords+=120;renderWordList(words,groups,winB,winA);});
  }else{
    var skip=+document.getElementById('skipD').value||1;
    var all=[],tot=0;
    streams.forEach(function(s,bi){
      var r=mode.run(bi,w.replace(/ /g,''),skip);
      r.forEach(function(x){all.push({b:bi,i:x.i,span:x.span,marks:x.marks});});
    });
    tot=all.length;
    h+='<div class="card matches"><div class="chead"><span class="cname">התאמות</span><span class="ctag">'+tot+' מופעים בכל התנ״ך</span></div>';
    if(!tot)h+='<div class="nomatch">לא נמצאו התאמות בכל התנ״ך.</div>';
    else h+='<div class="occs" id="socc"></div>';
    if(tot>shownOcc)h+='<button class="moreBtn" id="moreS">הצג עוד מופעים ('+(tot-shownOcc)+')</button>';
    h+='</div>';
    results.innerHTML=h;
    renderSeqList(all,winB,winA);

    var ms=document.getElementById('moreS');
    if(ms)ms.addEventListener('click',function(){shownOcc+=100;renderSeqList(all,winB,winA);});
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderWordList(words,groups,winB,winA){
  var box=document.getElementById('mlist');if(!box)return;
  var vis=words.slice(0,shownWords);
  box.innerHTML=vis.map(function(k){return '<button data-w="'+esc(k)+'">'+esc(k)+'<small>'+groups[k].count+'</small></button>';}).join('');
  box.querySelectorAll('button').forEach(function(b){
    b.addEventListener('click',function(){showOcc(b.getAttribute('data-w'),groups,winB,winA);});
  });
}
function showOcc(key,groups,winB,winA){
  var g=groups[key],box=document.getElementById('mocc');
  var h='<div class="occs"><div class="ctag" style="margin-bottom:8px">מופעים של <b>'+esc(key)+'</b> · לחיצה על ״הצג עוד מופעים״ מציגה את כולם</div>';
  g.locs.slice(0,shownOcc).forEach(function(L){
    var from=Math.max(0,L.i-winB), to=Math.min(streams[L.b].w.length-1,L.i+winA);
    h+='<div class="occ">'+renderRange(L.b,from,to,L.i,L.i,null,true)+'</div>';
  });
  if(g.locs.length>shownOcc)h+='<button class="moreBtn" id="moreO">הצג עוד מופעים ('+(g.locs.length-shownOcc)+')</button>';
  box.innerHTML=h+'</div>';
  var mo=document.getElementById('moreO');
  if(mo)mo.addEventListener('click',function(){shownOcc+=50;showOcc(key,groups,winB,winA);});
}
function renderSeqList(all,winB,winA){
  var box=document.getElementById('socc');if(!box)return;
  var h='';
  all.slice(0,shownOcc).forEach(function(L){
    var s=streams[L.b];
    var from=Math.max(0,L.i-winB), to=Math.min(s.w.length-1,L.i+L.span-1+winA);
    h+='<div class="occ">'+renderRange(L.b,from,to,L.i,L.i+L.span-1,L.marks?new Set(L.marks):null,true)+'</div>';
  });
  box.innerHTML=h;
}

/* ================= בניית הממשק ================= */
var grid=document.getElementById('modegrid');
document.getElementById('tagline').textContent='מנוע חיפוש מעל כל התנ״ך · '+MODES.map(function(m){return m.name;}).join(' · ');
MODES.forEach(function(m,ix){
  var b=document.createElement('button');
  b.textContent=m.name;b.setAttribute('aria-pressed',ix===0);
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
/* קישור ישיר: פתיחת הדף עם #q=...&m=...&d=... משחזר ומריץ את החיפוש */
try{
  var hp={};location.hash.replace(/^#/,'').split('&').forEach(function(kv){var p=kv.split('=');if(p[0])hp[p[0]]=decodeURIComponent(p[1]||'');});
  if(hp.m){var mm=MODES.filter(function(x){return x.id===hp.m;})[0];if(mm){curMode=mm;grid.querySelectorAll('button').forEach(function(x,ix){x.setAttribute('aria-pressed',MODES[ix]===mm);});}}
  if(hp.d)document.getElementById('skipD').value=hp.d;
  if(hp.q){input.value=hp.q;runSearch();}
  else document.getElementById('skipWrap').hidden=!curMode.needsSkip;
}catch(e){}
