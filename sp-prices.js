/*!
 * sp-prices.js — ตัวเชื่อมราคากลาง (SSOT) สำหรับทุกโปรแกรม
 * ใช้งาน:  <script src="https://nny-spcompetitors.netlify.app/sp-prices.js"></script>
 *          SPPrices.load().then(db => { ... });
 *
 * คุณสมบัติ
 *  - ดึงราคาจาก prices.json (SSOT) พร้อม cache-buster
 *  - cache ในหน่วยความจำ + localStorage 5 นาที (ไม่ยิงถี่เกินไป)
 *  - ถ้าดึงไม่ได้ → ใช้สำเนาล่าสุดจาก localStorage
 *  - ถ้าไม่มีสำเนา → ใช้ fallback ที่โปรแกรมฝังไว้ (ถ้ามี)
 *  - บอกได้ว่าข้อมูลสดหรือเก่า ผ่าน db.stale / db.source
 */
(function (global) {
  'use strict';

  var URL_BASE = 'https://nny-spcompetitors.netlify.app/prices.json';
  var LS_KEY = 'spPricesCache_v1';
  var TTL_MS = 5 * 60 * 1000; // 5 นาที

  var memo = null;      // { data, at }
  var inflight = null;  // Promise ที่กำลังทำงาน

  function now() { return Date.now(); }

  function readLS() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.data) return null;
      return o;
    } catch (e) { return null; }
  }

  function writeLS(data) {
    try {
      global.localStorage.setItem(LS_KEY, JSON.stringify({ data: data, at: now() }));
    } catch (e) { /* โควตาเต็มหรือถูกปิด — ข้ามได้ */ }
  }

  function decorate(data, source, at) {
    var out = Object.create(Object.getPrototypeOf(data) || Object.prototype);
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];

    out.source = source;                       // 'network' | 'cache' | 'fallback'
    out.fetchedAt = at || now();
    out.stale = source !== 'network';

    var index = {};
    (out.ours || []).forEach(function (r) { index[r.sku] = r; });

    /** ราคาของ SKU · shop = 'de' | 'tb' */
    out.price = function (sku, shop) {
      var r = index[sku];
      if (!r) return null;
      var v = r[shop || 'de'];
      return (v === null || v === undefined) ? null : v;
    };
    /** วันที่ปรับราคาล่าสุด · คืน 'YYYY-MM-DD' หรือ null (ตัดเวลาออก — ใช้ได้เหมือนเดิม) */
    out.priceDate = function (sku, shop) {
      var v = out.priceStamp(sku, shop);
      return v ? v.slice(0, 10) : null;
    };
    /** แสตมป์เต็มที่ปรับราคาล่าสุด · เช่น '2026-08-26T23:23+07:00' หรือ '2026-07-01' (ของเก่า) */
    out.priceStamp = function (sku, shop) {
      var r = index[sku];
      if (!r) return null;
      return r[(shop || 'de') + '_at'] || null;
    };
    /** มีเวลาด้วยไหม (ของเก่าจะมีแค่วันที่) */
    out.hasTime = function (sku, shop) {
      var v = out.priceStamp(sku, shop);
      return !!(v && v.length > 10);
    };
    /** Date object ของแสตมป์ · null ถ้าไม่มี */
    out.priceAt = function (sku, shop) {
      var v = out.priceStamp(sku, shop);
      if (!v) return null;
      var d = new Date(v.length > 10 ? v : v + 'T00:00:00+07:00');
      return isNaN(d.getTime()) ? null : d;
    };
    /** ข้อความอ่านง่ายแบบไทย · เช่น '26/08/2026 23:23 น.' */
    out.priceStampText = function (sku, shop) {
      var v = out.priceStamp(sku, shop);
      if (!v) return '—';
      var day = v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4);
      return v.length > 10 ? day + ' ' + v.slice(11, 16) + ' น.' : day;
    };
    /** แสตมป์ล่าสุดของทั้งไฟล์ */
    out.updatedText = function () {
      var v = out.updated;
      if (!v) return '—';
      var day = v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4);
      return v.length > 10 ? day + ' ' + v.slice(11, 16) + ' น.' : day;
    };
    /** รายการทั้งหมดในหมวด */
    out.byCat = function (cat) {
      return (out.ours || []).filter(function (r) { return r.cat === cat; });
    };
    /** รายชื่อหมวดทั้งหมด */
    out.cats = function () {
      var s = {}, list = [];
      (out.ours || []).forEach(function (r) { if (!s[r.cat]) { s[r.cat] = 1; list.push(r.cat); } });
      return list;
    };
    /** ค่าส่ง · kind = 'door' | 'frame' | 'round_frame' */
    out.shippingOf = function (shop, kind) {
      var s = (out.shipping || {})[shop || 'de'] || {};
      var v = s[kind || 'door'];
      return (v === null || v === undefined) ? null : v;
    };
    return out;
  }

  function fetchFresh() {
    var url = URL_BASE + '?v=' + now();
    return global.fetch(url, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
  }

  /**
   * โหลดราคา
   * @param {Object} [opts]
   * @param {Object} [opts.fallback] ข้อมูลสำรองที่ฝังไว้ในโปรแกรม
   * @param {boolean} [opts.force]  บังคับดึงใหม่ ข้าม cache
   */
  function load(opts) {
    opts = opts || {};

    if (!opts.force && memo && (now() - memo.at) < TTL_MS) {
      return Promise.resolve(decorate(memo.data, 'cache', memo.at));
    }
    if (inflight && !opts.force) return inflight;

    var cached = readLS();

    inflight = fetchFresh()
      .then(function (json) {
        memo = { data: json, at: now() };
        writeLS(json);
        inflight = null;
        return decorate(json, 'network', memo.at);
      })
      .catch(function (err) {
        inflight = null;
        if (cached) {
          memo = { data: cached.data, at: cached.at };
          return decorate(cached.data, 'cache', cached.at);
        }
        if (opts.fallback) return decorate(opts.fallback, 'fallback', now());
        throw err;
      });

    // ถ้ามี cache ที่ยังไม่หมดอายุ ให้คืนทันทีโดยไม่ต้องรอเน็ต
    if (!opts.force && cached && (now() - cached.at) < TTL_MS) {
      return Promise.resolve(decorate(cached.data, 'cache', cached.at));
    }
    return inflight;
  }

  /** ป้ายบอกสถานะข้อมูล — เรียกหลัง load() เพื่อแสดงให้ผู้ใช้เห็น */
  function statusBadge(db) {
    var el = global.document.createElement('div');
    el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9998;font:12px Sarabun,sans-serif;'
      + 'padding:6px 12px;border-radius:16px;border:1px solid;box-shadow:0 2px 8px rgba(0,0,0,.12)';
    if (db.stale) {
      el.style.background = '#FFF6E5'; el.style.color = '#8B6914'; el.style.borderColor = '#E0C078';
      el.textContent = '⚠️ ราคาจากสำเนาสำรอง (' + new Date(db.fetchedAt).toLocaleString('th-TH') + ')';
    } else {
      el.style.background = '#EAF7F0'; el.style.color = '#1A7A5E'; el.style.borderColor = '#8FCBB0';
      el.textContent = '✓ ราคาล่าสุด · อัปเดต ' + db.updatedText();
    }
    global.document.body.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .6s'; el.style.opacity = '0'; }, 4000);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4800);
    return el;
  }

  global.SPPrices = { load: load, statusBadge: statusBadge, URL: URL_BASE };
})(typeof window !== 'undefined' ? window : this);
