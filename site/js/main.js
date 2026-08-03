// Countdown para Alejandro & Kuilen — 17 Nov 2026, 18:00
(function () {
  var target = new Date('2026-11-17T18:00:00-03:00').getTime();
  var el = { d: document.getElementById('cd-days'), h: document.getElementById('cd-hours'), m: document.getElementById('cd-minutes'), s: document.getElementById('cd-seconds') };
  if (!el.d) return;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) { el.d.textContent = '0'; el.h.textContent = '00'; el.m.textContent = '00'; el.s.textContent = '00'; return; }
    el.d.textContent = Math.floor(diff / 86400000);
    el.h.textContent = pad(Math.floor(diff / 3600000) % 24);
    el.m.textContent = pad(Math.floor(diff / 60000) % 60);
    el.s.textContent = pad(Math.floor(diff / 1000) % 60);
  }
  tick();
  setInterval(tick, 1000);
})();
