import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Home, BarChart3, Calculator, User, Plus, Trash2, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { Preferences } from "@capacitor/preferences";

/*
  Bütçe — offline React uygulaması
  --------------------------------
  • Tüm veri telefonda saklanır (Capacitor Preferences veya localStorage).
  • Giriş/hesap yok. İnternet gerekmez.
  • 4 ekran: Ana / Grafik / Simüle / Ekle
*/

// ---- Kalıcı depolama yardımcıları ----------------------------------------
// Capacitor varsa native Preferences, yoksa localStorage kullanır.
const STORE_KEY = "butce_tx_v1";
const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

async function loadTx() {
  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key: STORE_KEY });
      return value ? JSON.parse(value) : null;
    }
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function saveTx(list) {
  const data = JSON.stringify(list);
  try {
    if (isNative()) {
      await Preferences.set({ key: STORE_KEY, value: data });
      return;
    }
    localStorage.setItem(STORE_KEY, data);
  } catch {}
}

// ---- Kategoriler ----------------------------------------------------------
const CATS = {
  market:   { label: "Market",   icon: "🛒", color: "#1F5C3D" },
  ulasim:   { label: "Ulaşım",   icon: "⛽", color: "#E0A63C" },
  kafe:     { label: "Kafe",     icon: "☕", color: "#C65A3A" },
  yemek:    { label: "Yemek",    icon: "🍽", color: "#8A6D3B" },
  eglence:  { label: "Eğlence",  icon: "🎬", color: "#6B7A73" },
  diger:    { label: "Diğer",    icon: "💳", color: "#9AA79F" },
  gelir:    { label: "Gelir",    icon: "💼", color: "#2E7D52" },
};

// ---- Örnek başlangıç verisi (ilk açılışta) --------------------------------
const SEED = [
  { id: 1, type: "in",  cat: "gelir",  title: "Maaş",      amount: 22000, date: "2026-07-01" },
  { id: 2, type: "out", cat: "ulasim", title: "Opet",      amount: 1500,  date: "2026-07-23" },
  { id: 3, type: "out", cat: "kafe",   title: "Starbucks", amount: 185,   date: "2026-07-24" },
  { id: 4, type: "out", cat: "market", title: "Migros",    amount: 842,   date: "2026-07-24" },
];

const TL = (n) =>
  "₺" + Number(n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TLshort = (n) => "₺" + Number(n).toLocaleString("tr-TR");

// ==========================================================================
export default function ButceApp() {
  const [tab, setTab] = useState("home");
  const [tx, setTx] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadTx().then((saved) => {
      setTx(saved && saved.length ? saved : SEED);
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (ready) saveTx(tx);
  }, [tx, ready]);

  // ---- Hesaplamalar -------------------------------------------------------
  const income = useMemo(() => tx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0), [tx]);
  const expense = useMemo(() => tx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0), [tx]);
  const balance = income - expense;

  const byCat = useMemo(() => {
    const m = {};
    tx.filter(t => t.type === "out").forEach(t => { m[t.cat] = (m[t.cat] || 0) + t.amount; });
    return Object.entries(m)
      .map(([cat, value]) => ({ cat, value, ...CATS[cat] }))
      .sort((a, b) => b.value - a.value);
  }, [tx]);

  const addTx = (t) => setTx(prev => [{ ...t, id: Date.now() }, ...prev]);
  const delTx = (id) => setTx(prev => prev.filter(t => t.id !== id));

  if (!ready) return <div style={S.loading}>Yükleniyor…</div>;

  return (
    <div style={S.app}>
      <div style={S.screen}>
        {tab === "home"  && <HomeScreen {...{ balance, income, expense, tx, delTx }} />}
        {tab === "stats" && <StatsScreen {...{ byCat, expense, tx }} />}
        {tab === "sim"   && <SimScreen balance={balance} />}
        {tab === "add"   && <AddScreen onAdd={(t) => { addTx(t); setTab("home"); }} />}
      </div>

      <button style={S.fab} onClick={() => setTab("add")}><Plus size={26} /></button>

      <nav style={S.nav}>
        <NavBtn icon={<Home size={22} />} label="Ana"    active={tab === "home"}  onClick={() => setTab("home")} />
        <NavBtn icon={<BarChart3 size={22} />} label="Grafik" active={tab === "stats"} onClick={() => setTab("stats")} />
        <NavBtn icon={<Calculator size={22} />} label="Simüle" active={tab === "sim"} onClick={() => setTab("sim")} />
        <NavBtn icon={<User size={22} />} label="Profil" active={false} onClick={() => {}} />
      </nav>
    </div>
  );
}

// ---- Ana ekran ------------------------------------------------------------
function HomeScreen({ balance, income, expense, tx, delTx }) {
  return (
    <div style={S.pad}>
      <div style={{ paddingTop: 8 }}>
        <div style={S.hi}>İyi akşamlar,</div>
        <div style={S.name}>Mert 👋</div>
      </div>

      <div style={S.balCard}>
        <div style={S.balCap}>GÜNCEL BAKİYE</div>
        <div style={S.balAmt}>{TL(balance)}</div>
        <div style={S.balSub}>
          <span style={S.pill}>Temmuz</span>
          <span>Bu ayki hareketler</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        <div style={S.mini}>
          <div style={S.miniK}>BU AY GİREN</div>
          <div style={{ ...S.miniV, color: "#2E7D52" }}>{TLshort(income)}</div>
        </div>
        <div style={S.mini}>
          <div style={S.miniK}>BU AY ÇIKAN</div>
          <div style={{ ...S.miniV, color: "#C65A3A" }}>{TLshort(expense)}</div>
        </div>
      </div>

      <div style={S.secTitle}><h3 style={S.h3}>Son Hareketler</h3></div>
      {tx.length === 0 && <div style={S.empty}>Henüz hareket yok. + ile ekle.</div>}
      {tx.map(t => {
        const c = CATS[t.cat] || CATS.diger;
        return (
          <div key={t.id} style={S.tx}>
            <div style={{ ...S.txIc, background: c.color + "22" }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={S.txT}>{t.title}</div>
              <div style={S.txS}>{c.label} · {fmtDate(t.date)}</div>
            </div>
            <div style={{ ...S.txAmt, color: t.type === "in" ? "#2E7D52" : "#C65A3A" }}>
              {t.type === "in" ? "+" : "−"}{TLshort(t.amount)}
            </div>
            <button style={S.del} onClick={() => delTx(t.id)}><Trash2 size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}

// ---- Grafik ekranı --------------------------------------------------------
function StatsScreen({ byCat, expense, tx }) {
  // Son 6 ay çubukları (mevcut veriden ay bazında toplar)
  const months = useMemo(() => {
    const now = new Date();
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = tx.filter(t => t.type === "out" && t.date.startsWith(key))
        .reduce((s, t) => s + t.amount, 0);
      arr.push({ ay: d.toLocaleDateString("tr-TR", { month: "short" }), tutar: total });
    }
    return arr;
  }, [tx]);

  return (
    <div style={S.pad}>
      <div style={S.eyebrow}>TEMMUZ 2026</div>
      <h2 style={S.head}>Harcama Analizi</h2>

      <div style={S.card}>
        <div style={{ height: 190, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCat} dataKey="value" nameKey="label"
                cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {byCat.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => TL(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div style={S.donutCenter}>
            <div style={S.donutTotal}>{TLshort(expense)}</div>
            <div style={S.donutLbl}>TOPLAM</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          {byCat.map((c) => (
            <div key={c.cat} style={S.lg}>
              <span style={{ ...S.dot, background: c.color }} />
              <span style={{ flex: 1 }}>{c.label}</span>
              <span style={S.lgPc}>%{Math.round((c.value / expense) * 100) || 0}</span>
              <span style={S.lgAmt}>{TLshort(c.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.secTitle}><h3 style={S.h3}>Son 6 Ay</h3></div>
      <div style={{ ...S.card, height: 170, padding: "12px 6px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months}>
            <XAxis dataKey="ay" axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: "#6B7A73" }} />
            <Tooltip formatter={(v) => TL(v)} cursor={{ fill: "#1F5C3D11" }} />
            <Bar dataKey="tutar" fill="#1F5C3D" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Simülasyon ekranı ("harcarsam ne kalır") -----------------------------
function SimScreen({ balance }) {
  const [val, setVal] = useState("3500");
  const spend = parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
  const left = balance - spend;
  const pct = Math.max(0, Math.min(100, (left / balance) * 100));

  let barColor = "#1F5C3D", note, noteColor = "#6B7A73";
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() || 1;
  if (left < 0) {
    barColor = "#C65A3A";
    note = <>Bu harcama bakiyeni <b>{TL(-left)}</b> aşıyor. Bütçe dışı! 🔴</>;
    noteColor = "#C65A3A";
  } else if (pct < 30) {
    barColor = "#E0A63C";
    note = <>Dikkat: harcama sonrası bakiyen düşük kalıyor. 🟡</>;
  } else {
    note = <>Bu harcamayla ay sonuna kadar günlük <b>{TLshort(Math.floor(left / daysLeft))}</b> harcayabilirsin. Güvenli aralık. 🟢</>;
  }

  return (
    <div style={S.pad}>
      <div style={S.eyebrow}>NE KALIR?</div>
      <h2 style={S.head}>Harcama Simülasyonu</h2>

      <div style={S.simCard}>
        <div style={S.miniK}>HARCAMAK İSTEDİĞİN TUTAR</div>
        <div style={S.simInput}>
          <span style={S.simCur}>₺</span>
          <input style={S.simField} value={val} inputMode="numeric"
            onChange={(e) => setVal(e.target.value)} />
        </div>

        <div style={{ borderTop: "1px dashed #E3DFD3", marginTop: 18, paddingTop: 16 }}>
          <div style={S.miniK}>HARCAMA SONRASI KALAN BAKİYE</div>
          <div style={{ ...S.simBig, color: left < 0 ? "#C65A3A" : "#2E7D52" }}>{TL(left)}</div>
          <div style={S.meter}><i style={{ ...S.meterFill, width: pct + "%", background: barColor }} /></div>
          <div style={{ ...S.simNote, color: noteColor }}>{note}</div>
        </div>
      </div>

      <div style={S.bankBanner}>
        <div style={{ fontSize: 24 }}>🏦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Banka bağlantısı</div>
          <div style={{ fontSize: 11, opacity: .85, marginTop: 2 }}>
            Şimdilik kapalı. İleride ekstre içe aktarma eklenecek.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Ekle ekranı ----------------------------------------------------------
function AddScreen({ onAdd }) {
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("market");
  const [type, setType] = useState("out");
  const [title, setTitle] = useState("");

  const save = () => {
    const a = parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
    if (a <= 0) return;
    onAdd({
      type, cat: type === "in" ? "gelir" : cat,
      title: title || (type === "in" ? "Gelir" : CATS[cat].label),
      amount: a, date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div style={S.pad}>
      <div style={S.eyebrow}>YENİ KAYIT</div>
      <h2 style={S.head}>Hareket Ekle</h2>

      <div style={S.simCard}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setType("out")}
            style={{ ...S.typeBtn, ...(type === "out" ? S.typeOut : {}) }}>
            <ArrowUpRight size={16} /> Harcama
          </button>
          <button onClick={() => setType("in")}
            style={{ ...S.typeBtn, ...(type === "in" ? S.typeIn : {}) }}>
            <ArrowDownLeft size={16} /> Gelir
          </button>
        </div>

        <div style={S.simInput}>
          <span style={S.simCur}>₺</span>
          <input style={S.simField} value={amount} inputMode="numeric" placeholder="0"
            onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>

        <input style={S.titleField} placeholder="Açıklama (örn. Migros)"
          value={title} onChange={(e) => setTitle(e.target.value)} />

        {type === "out" && (
          <div style={S.chips}>
            {Object.entries(CATS).filter(([k]) => k !== "gelir").map(([k, c]) => (
              <div key={k} onClick={() => setCat(k)}
                style={{ ...S.chip, ...(cat === k ? S.chipOn : {}) }}>
                {c.icon} {c.label}
              </div>
            ))}
          </div>
        )}

        <button style={S.saveBtn} onClick={save}>Kaydet</button>
      </div>
    </div>
  );
}

// ---- Küçük bileşenler & yardımcılar ---------------------------------------
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...S.navBtn, color: active ? "#1F5C3D" : "#9AA79F" }}>
      {icon}<span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
    </button>
  );
}
function fmtDate(d) {
  const today = new Date().toISOString().slice(0, 10);
  if (d === today) return "Bugün";
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// ---- Stiller --------------------------------------------------------------
const S = {
  app: { maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#F3F0E7",
    position: "relative", fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#0E1613", overflow: "hidden" },
  loading: { display: "flex", height: "100vh", alignItems: "center", justifyContent: "center",
    color: "#6B7A73", fontFamily: "system-ui" },
  screen: { paddingBottom: 90, minHeight: "100vh" },
  pad: { padding: "6px 18px" },
  hi: { fontSize: 13, color: "#6B7A73" },
  name: { fontSize: 18, fontWeight: 600 },
  balCard: { background: "#1F5C3D", color: "#fff", borderRadius: 22, padding: 20, marginTop: 14 },
  balCap: { fontSize: 11, opacity: .8, letterSpacing: ".08em" },
  balAmt: { fontSize: 33, fontWeight: 700, marginTop: 4, letterSpacing: "-.5px" },
  balSub: { fontSize: 12, opacity: .85, marginTop: 6, display: "flex", gap: 6, alignItems: "center" },
  pill: { background: "rgba(255,255,255,.16)", padding: "2px 8px", borderRadius: 20, fontSize: 11 },
  mini: { flex: 1, background: "#fff", border: "1px solid #E3DFD3", borderRadius: 18, padding: 14 },
  miniK: { fontSize: 11, color: "#6B7A73" },
  miniV: { fontSize: 19, fontWeight: 600, marginTop: 4 },
  secTitle: { display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "20px 0 4px" },
  h3: { fontSize: 15, fontWeight: 600, margin: 0 },
  empty: { color: "#9AA79F", fontSize: 13, padding: "20px 0", textAlign: "center" },
  tx: { display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: "1px solid #E3DFD3" },
  txIc: { width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 },
  txT: { fontSize: 13, fontWeight: 600 },
  txS: { fontSize: 11, color: "#6B7A73", marginTop: 1 },
  txAmt: { fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  del: { background: "none", border: "none", color: "#C9C4B6", cursor: "pointer", padding: 4, marginLeft: 2 },
  eyebrow: { fontSize: 11, letterSpacing: ".12em", color: "#6B7A73", marginTop: 14 },
  head: { fontSize: 20, fontWeight: 700, margin: "2px 0 0" },
  card: { background: "#fff", border: "1px solid #E3DFD3", borderRadius: 20, padding: 16, marginTop: 8 },
  donutCenter: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" },
  donutTotal: { fontSize: 19, fontWeight: 700 },
  donutLbl: { fontSize: 10, color: "#6B7A73", letterSpacing: ".1em" },
  lg: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 0" },
  dot: { width: 9, height: 9, borderRadius: 3 },
  lgPc: { color: "#6B7A73", fontVariantNumeric: "tabular-nums", width: 38, textAlign: "right" },
  lgAmt: { fontWeight: 600, width: 72, textAlign: "right", fontVariantNumeric: "tabular-nums" },
  simCard: { background: "#fff", border: "1px solid #E3DFD3", borderRadius: 22, padding: 20, marginTop: 14 },
  simInput: { display: "flex", alignItems: "center", gap: 8, border: "1.5px solid #E3DFD3", borderRadius: 16, padding: 14, marginTop: 6 },
  simCur: { fontSize: 22, color: "#6B7A73", fontWeight: 600 },
  simField: { border: "none", outline: "none", fontSize: 26, fontWeight: 600, width: "100%", color: "#0E1613", background: "none" },
  simBig: { fontSize: 31, fontWeight: 700, marginTop: 4 },
  meter: { height: 9, background: "#E3DFD3", borderRadius: 6, marginTop: 14, overflow: "hidden" },
  meterFill: { display: "block", height: "100%", borderRadius: 6, transition: "width .3s, background .3s" },
  simNote: { fontSize: 12, marginTop: 8, lineHeight: 1.5 },
  bankBanner: { background: "linear-gradient(135deg,#1F5C3D,#2E7D52)", color: "#fff", borderRadius: 20, padding: 16, marginTop: 16, display: "flex", gap: 12, alignItems: "center" },
  chips: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
  chip: { border: "1px solid #E3DFD3", background: "#F3F0E7", borderRadius: 20, padding: "7px 13px", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  chipOn: { background: "#1F5C3D", color: "#fff", borderColor: "#1F5C3D" },
  titleField: { width: "100%", border: "1.5px solid #E3DFD3", borderRadius: 14, padding: "12px 14px", fontSize: 14, marginTop: 12, outline: "none", boxSizing: "border-box" },
  typeBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1.5px solid #E3DFD3", background: "#F3F0E7", borderRadius: 14, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6B7A73" },
  typeOut: { background: "#FBE9E3", color: "#C65A3A", borderColor: "#C65A3A" },
  typeIn: { background: "#E6F0E9", color: "#2E7D52", borderColor: "#2E7D52" },
  saveBtn: { width: "100%", marginTop: 20, background: "#1F5C3D", color: "#fff", border: "none", borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  fab: { position: "fixed", bottom: 82, right: "calc(50% - 210px + 18px)", width: 52, height: 52, background: "#1F5C3D", borderRadius: 18, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 20px rgba(31,92,61,.4)", zIndex: 20 },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, height: 66, background: "#fff", borderTop: "1px solid #E3DFD3", display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 6, zIndex: 15 },
  navBtn: { background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" },
};
