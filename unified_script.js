function extractUnifiedText(container){
  if(!container) return "";
  const lines = Array.from(container.querySelectorAll('.line'));
  return lines.map(line => {
    const raw = line.getAttribute('data-copy');
    return raw !== null ? raw : (line.querySelector('.line-text')?.textContent || '');
  }).join('\n').replace(/^\s+|\s+$/g, '');
}

function wireUnifiedCopy(){
  document.querySelectorAll('.copy-btn[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy-target');
      const target = document.getElementById(id);
      if(!target) return;
      const text = extractUnifiedText(target);
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

document.addEventListener('DOMContentLoaded', wireUnifiedCopy);