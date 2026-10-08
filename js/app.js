(() => {
  'use strict';

  const CONFIG = Object.freeze({
    namespace: 'ucan-l17-v1',
    lessonLabel: 'Заняття 17',
    lessonTitle: 'Заняття 17. Залучення громад до циркулярних ініціатив',
    artifactTitle: 'Рамка партнерства з мешканцями для циркулярної ініціативи',
    previousLessonUrl: 'https://clusterceu-crypto.github.io/UCAN-Lesson16/',
    nextLessonUrl: 'https://clusterceu-crypto.github.io/UCAN-Lesson18/',
    routeLabels: ['Початок','Участь і партнерство','Умови та інклюзивність','Від спостереження до рішення','Спробуйте','Ваш практичний результат','Підсумкова перевірка','Завершення'],
    finalRoute: 7,
    assessmentRoute: 6,
    answerKey: Object.freeze({ q1: 'B', q2: 'D', q3: 'A', q4: 'C' }),
    aiPromptTemplate: "Допоможіть мені перевірити логіку моєї\n“Рамки партнерства з мешканцями\nдля циркулярної ініціативи”.\n\nНе вигадуйте фактів про моє місто,\nне оцінюйте групи населення\nі не переписуйте рамку замість мене.\n\nСпочатку коротко зазначте,\nщо в моєму тексті вже зрозуміло.\n\nПотім перевірте шість речей:\n\n1. Чи визначена одна конкретна\nмуніципальна ініціатива?\n\n2. Чи зрозуміло,\nщо мешканець реально може зробити?\n\n3. Чи названі конкретні практичні\nумови або бар’єри участі?\n\n4. Чи розглядається інклюзивність\nчерез конкретні умови,\nа не через стереотипні припущення\nпро групи людей?\n\n5. Чи є одне обмежене\nуправлінське коригування\nабо наступне рішення?\n\n6. Чи не припускає текст,\nщо сама участь автоматично\nгарантує потрібний результат?\n\nПісля цього:\n\n- вкажіть, що лишається нечітким\n  або відсутнім;\n- поставте 2–4 уточнювальні запитання;\n- запропонуйте лише обмежені способи\n  покращення логіки;\n- окремо позначте,\n  які факти потрібно перевірити,\n  замість того щоб їх вигадувати.\n\nОсь мій чернетковий текст:\n\n{{LEARNER_ARTIFACT_TEXT}}"
  });

  const memoryStore = new Map();
  let storageMode = 'memory';
  const storage = {
    getItem(key) { try { const value=window.localStorage.getItem(key); storageMode='localStorage'; return value; } catch (_) { return memoryStore.has(key) ? memoryStore.get(key) : null; } },
    setItem(key,value) { try { window.localStorage.setItem(key,value); storageMode='localStorage'; } catch (_) { memoryStore.set(key,value); storageMode='memory'; } },
    removeItem(key) { try { window.localStorage.removeItem(key); } catch (_) { memoryStore.delete(key); } }
  };

  const stateKey=`${CONFIG.namespace}:state`;
  let state=loadState();
  let qaPreview=detectQaPreview();
  let qaReturnRoute=state.route;
  let previewActive=false;
  let lastDeleteTrigger=null;

  const routes=[...document.querySelectorAll('.route')];
  const headerRouteLabel=document.getElementById('header-route-label');
  const progressRouteLabel=document.getElementById('progress-route-label');
  const progressPage=document.getElementById('progress-page');
  const progressPercent=document.getElementById('progress-percent');
  const progressTrack=document.querySelector('.progress-track');
  const progressBar=document.getElementById('progress-bar');
  const stickyPage=document.getElementById('sticky-page');
  const routeMapList=document.getElementById('route-map-list');
  const prevRoute=document.getElementById('prev-route');
  const nextRoute=document.getElementById('next-route');
  const resetBtn=document.getElementById('reset-btn');
  const resetDialog=document.getElementById('reset-dialog');
  const resetCancel=document.getElementById('reset-cancel');
  const resetConfirm=document.getElementById('reset-confirm');
  const deleteDialog=document.getElementById('artifact-delete-dialog');
  const globalStatus=document.getElementById('global-status');
  const formativeToggle=document.getElementById('formative-toggle');
  const formativeCheck=document.getElementById('formative-check');
  const assessmentForm=document.getElementById('assessment-form');
  const assessmentStatus=document.getElementById('assessment-status');
  const artifactText=document.getElementById('artifact-text');
  const artifactStatus=document.getElementById('artifact-status');
  const aiPreview=document.getElementById('ai-preview');
  const aiPrompt=document.getElementById('ai-prompt');
  const aiStatus=document.getElementById('ai-status');

  initRouteMap();
  restoreInteractiveState();
  render({focusHeading:false,scrollTop:false});
  bindEvents();

  window.__ucanL17={ getState:()=>JSON.parse(JSON.stringify(state)), storageMode:()=>storageMode, qaPreview:()=>qaPreview, goToRoute:index=>goToRoute(index), config:CONFIG };

  function cloneDefault(){ return {route:0,visited:[0],formativeOpen:false,assessmentAnswers:{},assessmentComplete:false,artifactText:'',artifactDirty:false}; }
  function isPlainObject(value){ return value && typeof value==='object' && !Array.isArray(value); }
  function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
  function cssEscape(value){ if(window.CSS&&typeof window.CSS.escape==='function')return window.CSS.escape(value); return String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }
  function announce(msg){ if(globalStatus)globalStatus.textContent=msg; }

  function detectQaPreview(){
    let enabled=false;
    try {
      const url=new URL(window.location.href);
      enabled=url.searchParams.get('qa')==='1';
      if(enabled){ url.searchParams.delete('qa'); const clean=`${url.pathname}${url.search}${url.hash}`; try{history.replaceState(null,'',clean);}catch(_){} }
    } catch(_) { enabled=false; }
    return enabled;
  }

  function loadState(){
    const raw=storage.getItem(stateKey);
    if(!raw)return cloneDefault();
    try{
      const p=JSON.parse(raw);
      const route=Number.isInteger(p.route)?clamp(p.route,0,7):0;
      const visited=Array.isArray(p.visited)?p.visited.filter(Number.isInteger).filter(i=>i>=0&&i<=7):[0];
      const assessmentComplete=p.assessmentComplete===true;
      const safeRoute=route===CONFIG.finalRoute&&!assessmentComplete?CONFIG.assessmentRoute:route;
      return {
        route:safeRoute,
        visited:[...new Set([0,...visited.filter(i=>i!==CONFIG.finalRoute||assessmentComplete)])].sort((a,b)=>a-b),
        formativeOpen:p.formativeOpen===true,
        assessmentAnswers:isPlainObject(p.assessmentAnswers)?p.assessmentAnswers:{},
        assessmentComplete,
        artifactText:typeof p.artifactText==='string'?p.artifactText:'',
        artifactDirty:p.artifactDirty===true
      };
    } catch(_) { return cloneDefault(); }
  }

  function saveState(){ storage.setItem(stateKey,JSON.stringify(state)); }

  function initRouteMap(){
    routeMapList.innerHTML='';
    CONFIG.routeLabels.forEach((label,index)=>{
      const li=document.createElement('li');
      const btn=document.createElement('button');
      btn.type='button'; btn.textContent=label; btn.dataset.routeTarget=String(index);
      btn.addEventListener('click',()=>{ if(previewActive){ if(index===qaReturnRoute)exitPreview(); return; } if(isMapRouteAvailable(index))goToRoute(index); });
      li.appendChild(btn); routeMapList.appendChild(li);
    });
  }

  function bindEvents(){
    prevRoute.addEventListener('click',()=>{ if(previewActive){exitPreview();return;} if(state.route>0)goToRoute(state.route-1); });
    nextRoute.addEventListener('click',()=>{ if(state.route===CONFIG.finalRoute){ if(previewActive&&!state.assessmentComplete)return; window.location.href=CONFIG.nextLessonUrl; return; } if(state.route===CONFIG.assessmentRoute&&!state.assessmentComplete)return; goToRoute(state.route+1); });
    formativeToggle.addEventListener('click',()=>{ state.formativeOpen=!state.formativeOpen; saveState(); renderFormative(); });

    artifactText.addEventListener('input',()=>{ if(qaPreview)return; state.artifactText=artifactText.value; state.artifactDirty=false; saveState(); renderArtifactStatus(); });
    document.getElementById('artifact-pdf').addEventListener('click',generateArtifactPdf);
    document.getElementById('artifact-delete').addEventListener('click',event=>{ if(qaPreview)return; lastDeleteTrigger=event.currentTarget; if(deleteDialog&&typeof deleteDialog.showModal==='function')deleteDialog.showModal(); else if(window.confirm('Очистити чернетку?'))deleteArtifact(); });
    if(deleteDialog) deleteDialog.addEventListener('close',()=>{ if(deleteDialog.returnValue==='confirm')deleteArtifact(); else announce('Очищення чернетки скасовано.'); if(lastDeleteTrigger)lastDeleteTrigger.focus(); });

    document.getElementById('ai-generate').addEventListener('click',()=>{
      const draft=artifactText.value.trim();
      if(!draft){ aiPreview.hidden=true; aiStatus.textContent='Спочатку додайте власну чернетку рамки.'; announce(aiStatus.textContent); return; }
      aiPrompt.value=CONFIG.aiPromptTemplate.replace('{{LEARNER_ARTIFACT_TEXT}}',artifactText.value);
      aiPreview.hidden=false;
      aiStatus.textContent='Промпт підготовлено локально. Нічого не надіслано назовні.';
      aiPrompt.focus();
    });
    document.getElementById('ai-copy').addEventListener('click',async()=>{
      if(!aiPrompt.value)return;
      let copied=false;
      try{await navigator.clipboard.writeText(aiPrompt.value);copied=true;}catch(_){ try{aiPrompt.select();copied=document.execCommand('copy');}catch(__){} }
      aiStatus.textContent=copied?'Промпт скопійовано. Ви можете вручну вставити його у вибраний сервіс.':'Не вдалося скопіювати автоматично. Виділіть текст промпту й скопіюйте вручну.';
      announce(aiStatus.textContent);
    });

    assessmentForm.addEventListener('change',event=>{
      const input=event.target;
      if(!(input instanceof HTMLInputElement)||input.type!=='radio')return;
      state.assessmentAnswers[input.name]=input.value;
      if(state.assessmentComplete){ state.assessmentComplete=false; state.visited=state.visited.filter(i=>i!==CONFIG.finalRoute); assessmentStatus.textContent='Відповіді змінено. Перевірте їх ще раз, щоб перейти до завершення.'; }
      else assessmentStatus.textContent='';
      saveState(); updateNavigation(); updateRouteMap();
    });
    assessmentForm.addEventListener('submit',event=>{
      event.preventDefault();
      const answers=readAssessmentAnswers(); state.assessmentAnswers=answers;
      const complete=Object.keys(CONFIG.answerKey).every(k=>answers[k]);
      const correct=complete&&Object.keys(CONFIG.answerKey).every(k=>answers[k]===CONFIG.answerKey[k]);
      if(correct){ state.assessmentComplete=true; assessmentStatus.textContent='Готово. Ви можете перейти до завершення.'; }
      else { state.assessmentComplete=false; state.visited=state.visited.filter(i=>i!==CONFIG.finalRoute); assessmentStatus.textContent=complete?'Перегляньте відповіді й спробуйте ще раз.':'Оберіть відповідь у кожному запитанні й спробуйте ще раз.'; }
      saveState(); updateNavigation(); updateRouteMap();
    });

    resetBtn.addEventListener('click',()=>{ if(typeof resetDialog.showModal==='function'){resetDialog.showModal();resetCancel.focus();}else if(window.confirm('Почати спочатку? Практичну рамку буде збережено.'))performReset(); });
    resetCancel.addEventListener('click',()=>setTimeout(()=>resetBtn.focus(),0));
    resetConfirm.addEventListener('click',performReset);
    resetDialog.addEventListener('cancel',()=>setTimeout(()=>resetBtn.focus(),0));
  }

  function deleteArtifact(){ state.artifactText=''; state.artifactDirty=false; artifactText.value=''; saveState(); renderArtifactStatus(); aiPreview.hidden=true; aiPrompt.value=''; aiStatus.textContent=''; announce('Чернетку очищено у цьому браузері.'); }
  function performReset(){ const artifactTextSaved=state.artifactText, artifactDirtySaved=state.artifactDirty; state=cloneDefault(); state.artifactText=artifactTextSaved; state.artifactDirty=artifactDirtySaved; saveState(); restoreInteractiveState(); render({focusHeading:true,scrollTop:true}); announce('Заняття розпочато спочатку. Ваша чернетка рамки збережена.'); }
  function readAssessmentAnswers(){ const fd=new FormData(assessmentForm),answers={}; for(const key of Object.keys(CONFIG.answerKey)){const v=fd.get(key);if(typeof v==='string')answers[key]=v;} return answers; }
  function restoreInteractiveState(){ renderFormative(); artifactText.value=state.artifactText; renderArtifactStatus(); for(const [name,value] of Object.entries(state.assessmentAnswers)){const input=assessmentForm.querySelector(`input[name="${cssEscape(name)}"][value="${cssEscape(value)}"]`);if(input)input.checked=true;} if(state.assessmentComplete)assessmentStatus.textContent='Готово. Ви можете перейти до завершення.'; }
  function renderFormative(){ formativeCheck.hidden=!state.formativeOpen; formativeToggle.setAttribute('aria-expanded',String(state.formativeOpen)); formativeToggle.textContent=state.formativeOpen?'Сховати орієнтир':'Показати орієнтир'; }
  function renderArtifactStatus(){ if(!artifactText.value.trim())artifactStatus.textContent='Чернетка автоматично зберігається лише у цьому браузері.'; else artifactStatus.textContent='Збережено у цьому браузері.'; }

  function goToRoute(index,options={}){ index=clamp(index,0,CONFIG.finalRoute); const fromQa=options.fromQa===true; if(index===CONFIG.finalRoute&&!state.assessmentComplete&&!(qaPreview||fromQa))return false; if(index>state.route+1&&!state.visited.includes(index)&&!qaPreview)return false; if(qaPreview&&index===CONFIG.finalRoute&&!state.assessmentComplete){qaReturnRoute=state.route;previewActive=true;state.route=index;render({focusHeading:true,scrollTop:true,persist:false});return true;} state.route=index; if(!state.visited.includes(index))state.visited.push(index); state.visited.sort((a,b)=>a-b); saveState(); render({focusHeading:true,scrollTop:true}); return true; }
  function exitPreview(){ if(!previewActive)return; state.route=qaReturnRoute; previewActive=false; render({focusHeading:true,scrollTop:true,persist:false}); }
  function render(options={}){ const {focusHeading=false,scrollTop=false,persist=true}=options; if(persist)saveState(); routes.forEach((route,index)=>{route.hidden=index!==state.route;}); updateProgress(); updateRouteMap(); updateNavigation(); if(scrollTop)window.scrollTo({top:0,behavior:'auto'}); if(focusHeading){const heading=routes[state.route].querySelector('h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}} }
  function updateProgress(){ const index=state.route,label=CONFIG.routeLabels[index],page=index+1,percent=Math.round((page/CONFIG.routeLabels.length)*100); headerRouteLabel.textContent=label; progressRouteLabel.textContent=label; progressPage.textContent=`Сторінка ${page} з 8`; stickyPage.textContent=`Сторінка ${page} з 8`; progressPercent.textContent=`${percent}%`; progressTrack.setAttribute('aria-valuenow',String(percent)); progressBar.style.width=`${percent}%`; }
  function updateRouteMap(){ [...routeMapList.querySelectorAll('button[data-route-target]')].forEach(btn=>{const index=Number(btn.dataset.routeTarget),available=isMapRouteAvailable(index),lockedFinal=index===CONFIG.finalRoute&&!state.assessmentComplete&&!qaPreview;btn.dataset.visited=String(state.visited.includes(index));if(index===state.route)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');btn.setAttribute('aria-disabled',String(!available));btn.dataset.locked=String(lockedFinal);btn.tabIndex=available?0:-1;}); }
  function isMapRouteAvailable(index){ if(index===CONFIG.finalRoute)return state.assessmentComplete||qaPreview||index===state.route; return state.visited.includes(index)||index===state.route; }
  function updateNavigation(){ prevRoute.disabled=state.route===0; if(state.route===CONFIG.finalRoute){nextRoute.disabled=previewActive&&!state.assessmentComplete;nextRoute.textContent='Наступне заняття →';nextRoute.setAttribute('aria-label','Наступне заняття — Заняття 18');}else{nextRoute.textContent='Далі →';nextRoute.removeAttribute('aria-label');nextRoute.disabled=state.route===CONFIG.assessmentRoute&&!state.assessmentComplete;} }

  function wrapText(ctx,text,maxWidth){ const words=text.split(/\s+/),lines=[]; let line=''; for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line)lines.push(line);return lines; }
  function dataUrlBytes(dataUrl){ const b64=dataUrl.split(',')[1],bin=atob(b64),out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i); return out; }
  function ascii(s){ return new TextEncoder().encode(s); }
  function concat(parts){ const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; }
  function buildPdf(jpegs,w,h){
    const objects=[]; objects[1]=ascii('<< /Type /Catalog /Pages 2 0 R >>'); const pageNums=[]; let obj=3;
    jpegs.forEach((jpg,i)=>{ const imageObj=obj++,contentObj=obj++,pageObj=obj++; pageNums.push(pageObj); objects[imageObj]=concat([ascii(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,ascii('\nendstream')]); const content=`q\n595 0 0 842 0 0 cm\n/Im${i+1} Do\nQ\n`,cb=ascii(content); objects[contentObj]=ascii(`<< /Length ${cb.length} >>\nstream\n${content}endstream`); objects[pageObj]=ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i+1} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`); });
    objects[2]=ascii(`<< /Type /Pages /Count ${pageNums.length} /Kids [${pageNums.map(n=>n+' 0 R').join(' ')}] >>`);
    const header=ascii('%PDF-1.4\n%1234\n'),parts=[header],offsets=[0]; let pos=header.length;
    for(let i=1;i<objects.length;i++){const pre=ascii(`${i} 0 obj\n`),post=ascii('\nendobj\n');offsets[i]=pos;parts.push(pre,objects[i],post);pos+=pre.length+objects[i].length+post.length;}
    const xrefPos=pos; let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`; for(let i=1;i<objects.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n'; xref+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`; parts.push(ascii(xref)); return concat(parts);
  }
  function generateArtifactPdf(){
    const text=artifactText.value.trim();
    if(!text){artifactStatus.textContent='Додайте текст рамки перед завантаженням PDF.';announce(artifactStatus.textContent);return;}
    const W=1240,H=1754,M=90,bodyFont=32,lineH=45,canvases=[]; let canvas,ctx,y;
    function newPage(first=false){canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#17232b';ctx.textBaseline='top';y=M;if(first){ctx.font='700 38px Arial, sans-serif';for(const line of wrapText(ctx,CONFIG.lessonTitle,W-2*M)){ctx.fillText(line,M,y);y+=52;}y+=12;ctx.font='700 34px Arial, sans-serif';for(const line of wrapText(ctx,CONFIG.artifactTitle,W-2*M)){ctx.fillText(line,M,y);y+=48;}ctx.font='24px Arial, sans-serif';ctx.fillStyle='#5b6870';ctx.fillText(new Date().toLocaleString('uk-UA'),M,y);y+=52;ctx.fillStyle='#17232b';}ctx.font=`${bodyFont}px Arial, sans-serif`;canvases.push(canvas);}
    newPage(true);
    for(const para of text.split(/\n/)){if(para.trim()===''){y+=lineH*.65;if(y>H-M-lineH)newPage(false);continue;}for(const line of wrapText(ctx,para,W-2*M)){if(y>H-M-lineH)newPage(false);ctx.fillText(line,M,y);y+=lineH;}y+=12;}
    const jpegs=canvases.map(c=>dataUrlBytes(c.toDataURL('image/jpeg',.92))),pdf=buildPdf(jpegs,W,H),blob=new Blob([pdf],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ramka-partnerstva-l17.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('PDF рамки підготовлено для завантаження.');
  }
})();
