/* ============================================================
   shop-badges.js — SSOT สถานะป้ายเขียว/ป้ายเหลืองของทุกร้าน
   แก้ที่ไฟล์นี้ที่เดียว → ทุกหน้าเปรียบเทียบเปลี่ยนตามทันที

   วิธีใช้ในหน้าใดก็ได้:
     <script src="shop-badges.js"></script>
     ... SPBadges.dots('chock')   → วงกลมเขียว/เหลืองใต้ชื่อร้าน

   ค่าที่ใส่ได้:  true = มีป้าย · false = ไม่มีป้าย · null = ยังไม่เคยเช็ค
   ============================================================ */
(function (w) {
  var MONTH = 'ส.ค. 2569';

  var DATA = {
    de:    { name: 'De',              g: true,  y: true,  us: true, asOf: 'ส.ค. 2569' },
    tb:    { name: 'Tb',              g: true,  y: true,  us: true, asOf: 'ส.ค. 2569' },
    chock: { name: 'chocksomkid',     g: true,  y: true,            asOf: 'ส.ค. 2569' },
    lam:   { name: 'LAMTONMAISAK',    g: true,  y: true,            asOf: 'ส.ค. 2569' },
    ojas:  { name: 'ojas woodwork',   g: true,  y: true,            asOf: 'ส.ค. 2569' },
    pkd:   { name: 'ประกายดาว',        g: true,  y: true,            asOf: 'ส.ค. 2569' },
    mp:    { name: 'ไม้พร้อม',         g: true,  y: true,            asOf: 'ส.ค. 2569' },
    cwd:   { name: 'cwd',             g: false, y: false,           asOf: 'ส.ค. 2569' },
    fh:    { name: 'full house wood', g: null,  y: null,            asOf: null },
    tt:    { name: 'TTwood',          g: null,  y: null,            asOf: null },
    pg:    { name: 'PG Wood',         g: null,  y: null,            asOf: null },
    donut: { name: 'Donut_Furniture', g: false, y: false,           asOf: 'ส.ค. 2569' },
    kkb:   { name: 'KKB Wood',        g: null,  y: null,            asOf: null },
    san:   { name: 'santirak28',      g: false, y: true,            asOf: 'ก.ย. 2569' }
  };

  var CSS =
    '.sb-dots{display:flex;gap:3px;justify-content:center;margin-top:3px;}' +
    'th:first-child .sb-dots,.sb-dots.left{justify-content:flex-start;}' +
    '.sb-dot{width:9px;height:9px;border-radius:50%;display:inline-block;box-sizing:border-box;}' +
    '.sb-g{background:#1FA971;box-shadow:0 0 0 1px rgba(31,169,113,.35);}' +
    '.sb-y{background:#E8B317;box-shadow:0 0 0 1px rgba(232,179,23,.35);}' +
    '.sb-no{background:transparent;border:1px solid currentColor;opacity:.22;}' +
    '.sb-unk{background:transparent;border:1px dashed currentColor;opacity:.38;}' +
    '.sb-legend{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:11.5px;' +
      'background:var(--bg3,#fff);border:1px solid var(--border,rgba(0,0,0,.12));' +
      'border-radius:10px;padding:9px 13px;margin-bottom:14px;}' +
    '.sb-lg{display:flex;align-items:center;gap:5px;}';

  function injectCSS() {
    if (document.getElementById('sb-css')) return;
    var s = document.createElement('style');
    s.id = 'sb-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function one(v, kind) {
    if (v === true)  return '<span class="sb-dot sb-' + kind + '"></span>';
    if (v === false) return '<span class="sb-dot sb-no"></span>';
    return '<span class="sb-dot sb-unk"></span>';
  }

  function title(b) {
    var t = function (v, n) { return v === true ? n + ': มี' : v === false ? n + ': ไม่มี' : n + ': ยังไม่เช็ค'; };
    return t(b.g, 'ป้ายเขียว') + ' · ' + t(b.y, 'ป้ายเหลือง') + ' · ' + (b.asOf || 'ยังไม่เคยเช็ค');
  }

  /* วงกลม 2 จุดใต้ชื่อร้าน — ใส่ต่อท้ายชื่อใน <th> ได้เลย */
  function dots(key, opts) {
    injectCSS();
    var b = DATA[key];
    if (!b) return '';
    var cls = (opts && opts.left) ? 'sb-dots left' : 'sb-dots';
    return '<span class="' + cls + '" title="' + title(b) + '">' +
           one(b.g, 'g') + one(b.y, 'y') + '</span>';
  }

  function legend() {
    injectCSS();
    return '<div class="sb-legend">' +
      '<div class="sb-lg"><span class="sb-dot sb-g"></span><span>ป้ายเขียว (ส่งฟรี)</span></div>' +
      '<div class="sb-lg"><span class="sb-dot sb-y"></span><span>ป้ายเหลือง (ส่วนลด)</span></div>' +
      '<div class="sb-lg"><span class="sb-dot sb-no"></span><span>ไม่มีป้าย</span></div>' +
      '<div class="sb-lg"><span class="sb-dot sb-unk"></span><span>ยังไม่เคยเช็ค</span></div>' +
      '<div class="sb-lg" style="opacity:.6">อ้างอิง ' + MONTH + '</div>' +
      '</div>';
  }

  function isStale(key) {
    var b = DATA[key];
    return !!(b && b.asOf && b.asOf !== MONTH);
  }

  w.SPBadges = { MONTH: MONTH, data: DATA, dots: dots, legend: legend, isStale: isStale };
})(window);
