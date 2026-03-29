tsx
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Download, Camera, Settings, Search, LayoutGrid,
  Bell, Plus, Minus, LogOut, ArrowLeft, Utensils,
  ShoppingCart, Wrench, Trash2
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Business = {
  id: string;
  name: string;
  phone: string;
  category: string;
  lat: number | null;
  lng: number | null;
  discount_pct: number;
  promo_text: string;
  expires_at: string | null;
  is_active: boolean;
  wa_clicks: number;
  map_clicks: number;
  qr_clicks: number;
};

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: "todos",           label: "Todos",          emoji: null, icon: <LayoutGrid size={16} /> },
  { id: "gastronomia",     label: "Gastronomía",    emoji: "🍽️", icon: <Utensils size={16} /> },
  { id: "compras",         label: "Compras",        emoji: "🛒", icon: <ShoppingCart size={16} /> },
  { id: "servicios",       label: "Servicios",      emoji: "🛠️", icon: <Wrench size={16} /> },
  { id: "panaderia",       label: "Panadería",      emoji: "🍞", icon: null },
  { id: "indumentaria",    label: "Indumentaria",   emoji: "👕", icon: null },
  { id: "emprendimientos", label: "Emprendimientos",emoji: "🚀", icon: null },
  { id: "construccion",    label: "Construcción",   emoji: "🏗️", icon: null },
  { id: "varios",          label: "Varios",         emoji: "🎯", icon: null },
  { id: "cuidado_personal",label: "Cuidado Personal",emoji: "💆",icon: null },
];

const getCatEmoji = (catId: string): string => {
  const found = CATEGORIAS.find(c => c.id === catId);
  return found?.emoji || "📍";
};

// ─── ICONOS DE MAPA ──────────────────────────────────────────────────────────
const getBizIcon = (category: string) => {
  const emoji = getCatEmoji(category);
  return L.divIcon({
    html: "<div style=\"background:#3b82f6;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.5);\">" + emoji + "</div>",
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const USER_ICON = L.divIcon({
  html: "<div style=\"background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #3b82f6;\"></div>",
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ─── COMPONENTE UBICACIÓN ─────────────────────────────────────────────────────
function LocationMarker() {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const map = useMapEvents({
    locationfound(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  useEffect(() => { map.locate(); }, [map]);
  if (!pos) return null;
  return (
    <Marker position={pos} icon={USER_ICON}>
      <Popup>Estás aquí</Popup>
    </Marker>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getDaysLeft = (expiresAt: string | null): number => {
  if (!expiresAt) return -1;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
};

const extractIdFromQR = (text: string): string => {
  try {
    return new URL(text).searchParams.get("id") || text.trim();
  } catch {
    return text.trim();
  }
};

// ─── ESTILOS ─────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "10px",
  background: "#0f172a",
  border: "1px solid #1e293b",
  color: "#fff",
  fontSize: "15px",
  boxSizing: "border-box",
};

const btnGreen: React.CSSProperties = {
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
  width: "100%",
};

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function CalafatePlus() {
  const [businesses, setBusinesses]       = useState<Business[]>([]);
  const [view, setView]                   = useState<"user" | "admin" | "login" | "scanner">("user");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [searchTerm, setSearchTerm]       = useState("");
  const [activeCat, setActiveCat]         = useState("todos");
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);

  const [loginUser, setLoginUser]   = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [loginError, setLoginError] = useState("");

  const EMPTY_FORM = { name: "", phone: "", category: "gastronomia", coords: "", discount: "10", promo_text: "" };
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const ADMIN_WA   = "2966694462";
  const ADMIN_PASS = "admin123";

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("admin_auth") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("name", { ascending: true });
    if (error) { console.error("fetchData:", error.message); return; }
    if (data) setBusinesses(data as Business[]);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (loginUser === ADMIN_WA && loginPass === ADMIN_PASS) {
      setIsAdmin(true);
      localStorage.setItem("admin_auth", "true");
      setView("admin");
    } else {
      setLoginError("Usuario o contraseña incorrectos");
    }
  };

  const createBusiness = async () => {
    setFormError("");
    const pct = parseInt(form.discount);
    if (!form.name.trim())                   return setFormError("El nombre es obligatorio");
    if (!form.phone.trim())                  return setFormError("El WhatsApp es obligatorio");
    if (!form.coords.trim())                 return setFormError("Las coordenadas son obligatorias");
    if (isNaN(pct) || pct < 1 || pct > 100) return setFormError("Descuento entre 1 y 100");

    const parts = form.coords.replace(/\s+/g, " ").split(/[\s,]+/);
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return setFormError("Coordenadas inválidas. Ejemplo: -50.338, -72.263");

    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    const { error } = await supabase.from("businesses").insert([{
      name: form.name.trim(),
      phone: form.phone.trim(),
      category: form.category,
      lat,
      lng,
      discount_pct: pct,
      promo_text: form.promo_text.trim(),
      expires_at: expires.toISOString().split("T")[0],
      is_active: true,
      wa_clicks: 0,
      map_clicks: 0,
      qr_clicks: 0,
    }]);

    if (error) { setFormError("Error: " + error.message); return; }
    fetchData();
    setForm(EMPTY_FORM);
  };

  const adjustDays = async (id: string, days: number) => {
    const biz = businesses.find(b => b.id === id);
    if (!biz) return;
    const base = biz.expires_at ? new Date(biz.expires_at) : new Date();
    base.setDate(base.getDate() + days);
    const newDate = base.toISOString().split("T")[0];
    const { error } = await supabase.from("businesses").update({ expires_at: newDate }).eq("id", id);
    if (!error) setBusinesses(prev => prev.map(b => b.id === id ? { ...b, expires_at: newDate } : b));
  };

  const trackClick = async (id: string, type: "wa_clicks" | "map_clicks" | "qr_clicks") => {
    const biz = businesses.find(b => b.id === id);
    if (!biz) return;
    const newVal = (biz[type] || 0) + 1;
    await supabase.from("businesses").update({ [type]: newVal }).eq("id", id);
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, [type]: newVal } : b));
  };

  const deleteBusiness = async (id: string) => {
    if (!confirm("¿Borrar este local? No se puede deshacer.")) return;
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (!error) setBusinesses(prev => prev.filter(b => b.id !== id));
  };

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => {
      if (!b.is_active) return false;
      if (getDaysLeft(b.expires_at) <= 0) return false;
      const matchSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat    = activeCat === "todos" || b.category === activeCat;
      return matchSearch && matchCat;
    });
  }, [businesses, searchTerm, activeCat]);

  const adminBiz = useMemo(() => {
    return [...businesses].sort((a, b) => getDaysLeft(a.expires_at) - getDaysLeft(b.expires_at));
  }, [businesses]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && selectedBizId) {
      scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 260 }, false);
      scanner.render((text) => {
        const scanned = extractIdFromQR(text);
        if (scanned === selectedBizId) {
          trackClick(selectedBizId, "qr_clicks");
          alert("¡Cupón validado! ✅");
        } else {
          alert("QR no corresponde a este local.");
        }
        scanner?.clear().catch(() => {});
        setView("user");
        setSelectedBizId(null);
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view, selectedBizId]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: "sans-serif", maxWidth: "480px", margin: "0 auto" }}>

      <div style={{ position: "relative" }}>
        <img src="banner.png" alt="Calafate Plus" style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", top: "14px", left: "16px", right: "16px", display: "flex", justifyContent: "space-between" }}>
          <Download size={28} color="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.9))", cursor: "pointer" }} />
          <Settings size={28} color="#fff"
            onClick={() => isAdmin ? setView("admin") : setView("login")}
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.9))", cursor: "pointer" }} />
        </div>
      </div>

      {view === "login" && (
        <div style={{ padding: "40px 24px" }}>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: "14px", maxWidth: "320px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", color: "#fbbf24", marginTop: 0 }}>ADMINISTRACIÓN</h2>
            <input placeholder="WhatsApp Admin" value={loginUser} onChange={e => setLoginUser(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Contraseña" value={loginPass} onChange={e => setLoginPass(e.target.value)} style={inputStyle} />
            {loginError && <p style={{ color: "#ef4444", margin: 0, textAlign: "center", fontSize: "14px" }}>{loginError}</p>}
            <button type="submit" style={{ ...btnGreen, background: "#3b82f6" }}>INGRESAR</button>
            <button type="button" onClick={() => { setView("user"); setLoginError(""); }}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {view === "scanner" && (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <h2 style={{ color: "#fbbf24" }}>ESCANEAR EN LOCAL</h2>
          <div id="qr-reader" style={{ background: "#fff", borderRadius: "16px", overflow: "hidden" }}></div>
          <button onClick={() => { setView("user"); setSelectedBizId(null); }}
            style={{ ...btnGreen, background: "#ef4444", marginTop: "24px" }}>
            CANCELAR
          </button>
        </div>
      )}

      {view === "admin" && (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <ArrowLeft onClick={() => setView("user")} style={{ cursor: "pointer", color: "#94a3b8" }} />
            <span style={{ fontWeight: "bold", color: "#fbbf24", fontSize: "16px" }}>PANEL ADMIN</span>
            <LogOut color="#ef4444" style={{ cursor: "pointer" }}
              onClick={() => { setIsAdmin(false); localStorage.removeItem("admin_auth"); setView("user"); }} />
          </div>

          <div style={{ background: "#0a1929", padding: "20px", borderRadius: "20px", border: "1px solid #3b82f6", marginBottom: "30px" }}>
            <h3 style={{ color: "#fbbf24", marginTop: 0 }}>+ NUEVO COMERCIO</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              <input placeholder="Nombre del local" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
              <input placeholder="WhatsApp (ej: 2966123456)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                {CATEGORIAS.filter(c => c.id !== "todos").map(c => (
                  <option key={c.id} value={c.id}>{c.emoji ? c.emoji + " " : ""}{c.label}</option>
                ))}
              </select>
              <input placeholder="Coordenadas (pegá desde Google Maps: -50.338, -72.263)" value={form.coords} onChange={e => setForm({ ...form, coords: e.target.value })} style={inputStyle} />
              <input placeholder="% Descuento (ej: 15)" type="number" min="1" max="100" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} style={inputStyle} />
              <input placeholder="Texto promo (ej: 12% en camperas)" value={form.promo_text} onChange={e => setForm({ ...form, promo_text: e.target.value })} style={inputStyle} />
              {formError && <p style={{ color: "#ef4444", margin: 0, fontSize: "13px" }}>{formError}</p>}
              <button onClick={createBusiness} style={btnGreen}>CREAR NEGOCIO</button>
            </div>
          </div>

          {adminBiz.map(biz => {
            const days    = getDaysLeft(biz.expires_at);
            const expired = days <= 0;
            return (
              <div key={biz.id} style={{
                background: "#0a1929", padding: "16px", borderRadius: "16px", marginBottom: "14px",
                border: expired ? "1px solid #ef4444" : "1px solid #1e293b",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <b style={{ color: expired ? "#ef4444" : "#fff", fontSize: "16px" }}>{biz.name}</b>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                      {getCatEmoji(biz.category)} {biz.category}
                    </div>
                  </div>
                  <span style={{
                    fontWeight: "bold", fontSize: "13px",
                    color: expired ? "#ef4444" : days <= 7 ? "#f97316" : "#22c55e",
                    background: expired ? "rgba(239,68,68,0.1)" : days <= 7 ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)",
                    padding: "4px 10px", borderRadius: "20px", whiteSpace: "nowrap"
                  }}>
                    {expired ? "VENCIDO" : days + " días"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#3b82f6", margin: "10px 0 8px 0", display: "flex", gap: "16px" }}>
                  <span>💬 WA: {biz.wa_clicks}</span>
                  <span>📍 Mapa: {biz.map_clicks}</span>
                  <span>📷 QR: {biz.qr_clicks}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "20px", alignItems: "center" }}>
                  <Bell size={20} color="#fbbf24" style={{ cursor: "pointer" }}
                    onClick={() => window.open(
                      "https://wa.me/549" + biz.phone +
                      "?text=Hola%20" + encodeURIComponent(biz.name) +
                      "%2C%20te%20quedan%20" + days + "%20d%C3%ADas%20en%20Calafate%20Plus.%20Renov%C3%A1%20para%20seguir%20apareciendo%20%F0%9F%91%8D"
                    )} />
                  <Minus size={20} color="#ef4444" style={{ cursor: "pointer" }} onClick={() => adjustDays(biz.id, -30)} />
                  <Plus size={20} color="#22c55e" style={{ cursor: "pointer" }} onClick={() => adjustDays(biz.id, 30)} />
                  <Trash2 size={20} color="#475569" style={{ cursor: "pointer" }} onClick={() => deleteBusiness(biz.id)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "user" && (
        <div style={{ padding: "0 16px 40px 16px" }}>

          <div style={{ position: "relative", margin: "20px 0 14px 0" }}>
            <Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#475569" }} />
            <input
              placeholder="Buscar comercio..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "42px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none" }}>
            {CATEGORIAS.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                style={{
                  whiteSpace: "nowrap", padding: "9px 16px", borderRadius: "20px", border: "none",
                  background: activeCat === cat.id ? "#3b82f6" : "#0f172a",
                  color: "#fff", display: "flex", alignItems: "center", gap: "6px",
                  fontWeight: activeCat === cat.id ? "bold" : "normal",
                  cursor: "pointer", fontSize: "14px", flexShrink: 0,
                }}>
                {cat.emoji ? <span>{cat.emoji}</span> : cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ height: "220px", borderRadius: "20px", overflow: "hidden", marginBottom: "20px", border: "1px solid #1e293b" }}>
            <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              <LocationMarker />
              {filteredBiz.map(b =>
                b.lat && b.lng ? (
                  <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)}>
                    <Popup><b>{b.name}</b><br />{b.discount_pct}% OFF</Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </div>

          <div style={{
            background: "linear-gradient(135deg,#0a1929 0%,#1e293b 100%)",
            padding: "20px", borderRadius: "20px", marginBottom: "20px",
            textAlign: "center", border: "1px solid #3b82f6"
          }}>
            <p style={{ margin: "0 0 12px 0", fontWeight: "bold", fontSize: "16px" }}>
              ¿Querés sumar tu negocio?
            </p>
            <button onClick={() => window.open("https://wa.me/549" + ADMIN_WA)}
              style={{ ...btnGreen, width: "auto", padding: "10px 28px" }}>
              CONTACTAME
            </button>
          </div>

          {filteredBiz.length === 0 && (
            <p style={{ textAlign: "center", color: "#475569", padding: "40px 0" }}>
              No hay comercios en esta categoría.
            </p>
          )}

          {filteredBiz.map(biz => (
            <div key={biz.id} style={{
              background: "#0a1929", borderRadius: "20px", marginBottom: "14px",
              padding: "18px", border: "1px solid #1e293b"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold" }}>{biz.name}</h3>
                  {biz.promo_text ? (
                    <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>{biz.promo_text}</p>
                  ) : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "12px", flexShrink: 0 }}>
                  <Camera size={24} color="#3b82f6" style={{ cursor: "pointer" }}
                    onClick={() => { setSelectedBizId(biz.id); setView("scanner"); }} />
                  <span style={{ color: "#ef4444", fontWeight: "900", fontSize: "20px" }}>
                    {biz.discount_pct}%
                  </span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
                <button
                  onClick={() => {
                    trackClick(biz.id, "map_clicks");
                    window.open("https://www.google.com/maps/search/?api=1&query=" + biz.lat + "," + biz.lng);
                  }}
                  style={{ background: "#fff", padding: "12px", borderRadius: "12px", fontWeight: "bold", border: "none", color: "#000", cursor: "pointer", fontSize: "14px" }}>
                  📍 UBICACIÓN
                </button>
                <button
                  onClick={() => {
                    trackClick(biz.id, "wa_clicks");
                    window.open("https://wa.me/549" + biz.phone);
                  }}
                  style={{ ...btnGreen, padding: "12px", fontSize: "14px" }}>
                  💬 WHATSAPP
                </button>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
