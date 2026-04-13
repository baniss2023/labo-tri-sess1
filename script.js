function storageKeyForProof(id){ return `proof:${id}`; }
function storageKeyForTeam(id){ return `team:${id}`; }

function setProofImage(proofEl, dataUrl){
  const img = proofEl.querySelector(".proofImg");
  const empty = proofEl.querySelector(".proofEmpty");
  const body = proofEl.querySelector(".proof-body");
  if(!img || !empty) return;

  if(dataUrl){
    img.src = dataUrl;
    img.style.display = "";
    empty.style.display = "none";
    proofEl.classList.add("has-proof");
    if(body) body.classList.add("has-image");
  }else{
    img.removeAttribute("src");
    img.style.display = "none";
    empty.style.display = "";
    proofEl.classList.remove("has-proof");
    if(body) body.classList.remove("has-image");
  }

  syncCaptureChecklist();
}

function syncCaptureChecklist(){
  document.querySelectorAll('.capture-check[data-proof-target]').forEach(box => {
    const proofId = box.getAttribute('data-proof-target');
    const proofEl = document.querySelector(`.proof[data-proof-id="${proofId}"]`);
    const hasImage = !!(proofEl && proofEl.classList.contains('has-proof') && proofEl.querySelector('.proofImg') && proofEl.querySelector('.proofImg').getAttribute('src'));
    box.checked = hasImage;
  });
}

function loadImageFileIntoProof(proofEl, file){
  if(!file || !String(file.type || "").startsWith("image/")) return;
  const id = proofEl.getAttribute("data-proof-id");
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    setProofImage(proofEl, dataUrl);
    try{ localStorage.setItem(storageKeyForProof(id), dataUrl); }catch(_e){}
  };
  reader.readAsDataURL(file);
}

function handleProofPaste(proofEl, event){
  const items = Array.from((event.clipboardData && event.clipboardData.items) || []);
  const imageItem = items.find(item => String(item.type || "").startsWith("image/"));
  if(!imageItem) return;
  const file = imageItem.getAsFile();
  if(!file) return;
  event.preventDefault();
  loadImageFileIntoProof(proofEl, file);
}

function wireProofBlocks(){
  document.querySelectorAll(".proof[data-proof-id]").forEach(proofEl => {
    const id = proofEl.getAttribute("data-proof-id");
    const btnCap = proofEl.querySelector(".btnCapture");
    const btnClr = proofEl.querySelector(".btnClear");
    const file = proofEl.querySelector(".proofFile");
    const body = proofEl.querySelector(".proof-body");

    try{
      const saved = localStorage.getItem(storageKeyForProof(id));
      if(saved) setProofImage(proofEl, saved);
      else setProofImage(proofEl, null);
    }catch(_e){
      setProofImage(proofEl, null);
    }

    if(btnCap && file){
      btnCap.addEventListener("click", () => file.click());
      file.addEventListener("change", () => {
        const f = file.files && file.files[0];
        if(!f) return;
        loadImageFileIntoProof(proofEl, f);
      });
    }

    if(btnClr){
      btnClr.addEventListener("click", () => {
        setProofImage(proofEl, null);
        if(file) file.value = "";
        try{ localStorage.removeItem(storageKeyForProof(id)); }catch(_e){}
      });
    }

    if(body){
      if(!body.hasAttribute("tabindex")) body.setAttribute("tabindex", "0");
      body.addEventListener("click", () => body.focus());
      body.addEventListener("paste", event => handleProofPaste(proofEl, event));
      body.addEventListener("dragover", event => event.preventDefault());
      body.addEventListener("drop", event => {
        event.preventDefault();
        const fileFromDrop = Array.from(event.dataTransfer?.files || []).find(f => String(f.type || "").startsWith("image/"));
        if(fileFromDrop) loadImageFileIntoProof(proofEl, fileFromDrop);
      });
    }
  });
}

function extractCommandText(target){
  const clone = target.cloneNode(true);
  clone.querySelectorAll('.prompt').forEach(el => el.remove());
  return clone.textContent.replace(/^\s+|\s+$/g, "");
}

function wireCopyButtons(){
  document.querySelectorAll('.copybtn[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy-target');
      const target = document.getElementById(id);
      if(!target) return;
      const text = extractCommandText(target);
      try{
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = 'Copié';
        setTimeout(() => { btn.textContent = old; }, 1200);
      }catch(_e){
        const old = btn.textContent;
        btn.textContent = 'Échec';
        setTimeout(() => { btn.textContent = old; }, 1200);
      }
    });
  });
}

function renderTeamPrint(){
  const box = document.getElementById("teamPrint");
  if(!box) return;

  const inputs = Array.from(document.querySelectorAll('.team-member-input'));
  const values = inputs.map(input => String(input.value || "").trim());

  box.innerHTML = `
    <div class="team-print-title">Equipe</div>
    <div class="team-print-grid">
      ${values.map((value, index) => `
        <div class="team-print-item">
          <span class="team-print-label">Nom${index + 1} :</span>
          <span class="team-print-value"> ${value || '................................................'}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function wireTeam(){
  document.querySelectorAll('.team-member-input').forEach(input => {
    try{
      const saved = localStorage.getItem(storageKeyForTeam(input.id));
      if(saved !== null) input.value = saved;
    }catch(_e){}

    const sync = () => {
      try{ localStorage.setItem(storageKeyForTeam(input.id), input.value); }catch(_e){}
      renderTeamPrint();
    };

    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
  });

  renderTeamPrint();
}

function countMissingCaptures(){
  return Array.from(document.querySelectorAll('.capture-check[data-proof-target]')).filter(box => !box.checked).length;
}

function wireExport(){
  const btn = document.getElementById("exportPdf");
  const overlay = document.getElementById("exportConfirmOverlay");
  const message = document.getElementById("exportConfirmMessage");
  const continueBtn = document.getElementById("exportContinue");
  const cancelBtn = document.getElementById("exportCancel");

  function closeOverlay(){
    if(!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }

  function openOverlay(missingCount){
    if(!overlay || !message) return;
    message.textContent = `Il manque encore ${missingCount} capture${missingCount > 1 ? 's' : ''} obligatoire${missingCount > 1 ? 's' : ''}. Voulez-vous poursuivre l’export malgré tout, ou retourner au labo pour compléter les preuves ?`;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    if(cancelBtn) cancelBtn.focus();
  }

  function proceedExport(){
    closeOverlay();
    renderTeamPrint();
    window.print();
  }

  if(btn){
    btn.addEventListener("click", () => {
      renderTeamPrint();
      const missing = countMissingCaptures();
      if(missing > 0 && overlay && message && continueBtn && cancelBtn){
        openOverlay(missing);
      }else{
        proceedExport();
      }
    });
  }

  if(continueBtn){
    continueBtn.addEventListener("click", proceedExport);
  }

  if(cancelBtn){
    cancelBtn.addEventListener("click", closeOverlay);
  }

  if(overlay){
    overlay.addEventListener("click", event => {
      if(event.target === overlay){
        closeOverlay();
      }
    });
  }

  document.addEventListener("keydown", event => {
    if(event.key === "Escape" && overlay && !overlay.hidden){
      closeOverlay();
    }
  });
}

let activeHelpLine = null;

function ensureCodeHelpTooltip(){
  let tooltip = document.getElementById('codeHelpTooltip');
  if(!tooltip){
    tooltip = document.createElement('div');
    tooltip.id = 'codeHelpTooltip';
    tooltip.className = 'code-help-tooltip';
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
  }

  if(!tooltip.querySelector('.code-help-tooltip-title') || !tooltip.querySelector('.code-help-tooltip-body')){
    tooltip.innerHTML = '<div class="code-help-tooltip-title"></div><div class="code-help-tooltip-body"></div>';
  }

  return tooltip;
}

function positionCodeHelpTooltip(tooltip, left, top){
  const margin = 14;
  const width = tooltip.offsetWidth || 320;
  const height = tooltip.offsetHeight || 120;
  const maxLeft = window.innerWidth - width - margin;
  const maxTop = window.innerHeight - height - margin;
  tooltip.style.left = `${Math.max(margin, Math.min(left, maxLeft))}px`;
  tooltip.style.top = `${Math.max(margin, Math.min(top, maxTop))}px`;
}

function showCodeHelp(line, anchor){
  const help = line.getAttribute('data-help');
  if(!help) return;

  const tooltip = ensureCodeHelpTooltip();
  const titleEl = tooltip.querySelector('.code-help-tooltip-title');
  const bodyEl = tooltip.querySelector('.code-help-tooltip-body');

  if(titleEl) titleEl.textContent = line.getAttribute('data-help-title') || 'Aide contextuelle';
  if(bodyEl) bodyEl.textContent = help;

  if(activeHelpLine && activeHelpLine !== line){
    activeHelpLine.classList.remove('help-active');
  }

  activeHelpLine = line;
  activeHelpLine.classList.add('help-active');
  tooltip.hidden = false;

  if(anchor && typeof anchor.clientX === 'number' && typeof anchor.clientY === 'number'){
    positionCodeHelpTooltip(tooltip, anchor.clientX + 18, anchor.clientY + 20);
    return;
  }

  const rect = line.getBoundingClientRect();
  positionCodeHelpTooltip(tooltip, rect.right + 14, rect.top + 8);
}

function moveCodeHelp(event){
  const tooltip = document.getElementById('codeHelpTooltip');
  if(!tooltip || tooltip.hidden) return;
  positionCodeHelpTooltip(tooltip, event.clientX + 18, event.clientY + 20);
}

function hideCodeHelp(){
  const tooltip = document.getElementById('codeHelpTooltip');
  if(tooltip) tooltip.hidden = true;
  if(activeHelpLine){
    activeHelpLine.classList.remove('help-active');
    activeHelpLine = null;
  }
}

function wireCodeHelp(){
  const lines = document.querySelectorAll('.code-content .line[data-help], .code-helpable[data-help]');
  if(!lines.length) return;

  ensureCodeHelpTooltip();

  lines.forEach(line => {
    if(!line.hasAttribute('tabindex')) line.setAttribute('tabindex', '0');
    line.classList.add('has-code-help');
    line.addEventListener('mouseenter', event => showCodeHelp(line, event));
    line.addEventListener('mousemove', moveCodeHelp);
    line.addEventListener('mouseleave', hideCodeHelp);
    line.addEventListener('focus', () => showCodeHelp(line));
    line.addEventListener('blur', hideCodeHelp);
  });

  document.addEventListener('scroll', hideCodeHelp, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
  wireCopyButtons();
  wireProofBlocks();
  wireTeam();
  wireExport();
  wireCodeHelp();
  syncCaptureChecklist();
});
