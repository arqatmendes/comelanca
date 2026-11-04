/* iPhone/web: funciona offline e avisa quando há uma versão nova (não usado no app Android) */
(function () {
  if (window.NativeHttp || !('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = w => {
      if (!w || !navigator.serviceWorker.controller) return;
      const bar = document.createElement('button');
      bar.className = 'update-bar'; bar.textContent = '✨ Nova versão do Comelança disponível — toque para atualizar';
      bar.onclick = () => { w.postMessage('skipWaiting'); bar.textContent = 'Atualizando…'; };
      document.body.appendChild(bar);
    };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); });
    });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
})();
