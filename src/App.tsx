import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, Settings, Trash2, MessageCircle, Search, LayoutGrid, Bell, Plus, Minus, LogOut, ArrowLeft, Utensils, ShoppingCart, Wrench, Shirt, Rocket, HardHat, Home, Croissant, MapPin, Phone } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const getBizIcon = (category: string) => {
  const icons: any = {
    "gastronomía": "🍽️", "compras": "🛒", "servicios": "🛠️", "panaderia": "🍞",
    "indumentaria": "👕", "emprendimientos": "🚀", "construcción": "🏗️", "cuidado personal": "💆🏼‍♂️"
  };
  const iconEmoji = icons[category.toLowerCase()] || "📍";
  return L.divIcon({
    html: "<div style=\"background-color: #3b82f6; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-size: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);\">" + iconEmoji + "</div>",
    className: "", iconSize: [34, 34], iconAnchor: [17, 17]
  });
};

const userIcon = L.divIcon({
  html: "<div style=\"background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #3b82f6;\"></div>",
  className: "", iconSize: [14, 14], iconAnchor: [7, 7]
});

function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMapEvents({
    locationfound(e) { setPosition([e.latlng.lat, e.latlng.lng]); map.flyTo(e.latlng, map.getZoom()); },
  });
  useEffect(() => { map.locate(); }, [map]);
  return position === null ? null : <Marker position={position} icon={userIcon}><Popup>Estás aquí</Popup></Marker>;
}

const CAT_COLORS: any = {
  "gastronomía": "#f97316", "compras": "#8b5cf6", "servicios": "#06b6d4",
  "panaderia": "#f59e0b", "indumentaria": "#ec4899", "emprendimientos": "#10b981",
  "construcción": "#64748b", "cuidado personal": "#a78bfa", "hogar": "#3b82f6"
};

const CAT_EMOJIS: any = {
  "gastronomía": "🍽️", "compras": "🛒", "servicios": "🛠️", "panaderia": "🍞",
  "indumentaria": "👕", "emprendimientos": "🚀", "construcción": "🏗️",
  "cuidado personal": "💆🏼", "hogar": "🏠"
};

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "admin" | "login" | "scanner">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [userLogin, setUserLogin] = useState("");
  const [passLogin, setPassLogin] = useState("");
  const [newBiz, setNewBiz] = useState({ name: "", phone: "", category: "compras", lat: "", lng: "", discount: "10", promo_text: "" });

  const ADMIN_WA = "2966694462";
  const ADMIN_PASS = "admin123";

  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={18} /> },
    { id: "gastronomía", label: "Gastronomía", icon: <Utensils size={18} /> },
    { id: "compras", label: "Compras", icon: <ShoppingCart size={18} /> },
    { id: "servicios", label: "Servicios", icon: <Wrench size={18} /> },
    { id: "panaderia", label: "Panadería", icon: <Croissant size={18} /> },
    { id: "indumentaria", label: "Indumentaria", icon: <Shirt size={18} /> },
    { id: "emprendimientos", label: "Emprendimientos", icon: <Rocket size={18} /> },
    { id: "construcción", label: "Construcción", icon: <HardHat size={18} /> },
    { id: "hogar", label: "Hogar", icon: <Home size={18} /> },
  ];

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("admin_auth") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*");
    if (data) setBusinesses(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLogin === ADMIN_WA && passLogin === ADMIN_PASS) {
      setIsAdmin(true);
      localStorage.setItem("admin_auth", "true");
      setView("admin");
    } else { alert("Error en los datos"); }
  };

  const createBusiness = async () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await supabase.from("businesses").insert([{
      name: newBiz.name, phone: newBiz.phone, category: newBiz.category,
      lat: parseFloat(newBiz.lat), lng: parseFloat(newBiz.lng),
      discount_pct: parseInt(newBiz.discount), promo_text: newBiz.promo_text,
      expires_at: expires.toISOString().split('T')[0],
      wa_clicks: 0, map_clicks: 0, qr_clicks: 0
    }]);
    fetchData();
    setNewBiz({ name: "", phone: "", category: "compras", lat: "", lng: "", discount: "10", promo_text: "" });
  };

  const adjustDays = async (id: string, days: number) => {
    const biz = businesses.find(b => b.id === id);
    const current = biz.expires_at ? new Date(biz.expires_at) : new Date();
    current.setDate(current.getDate() + days);
    await supabase.from("businesses").update({ expires_at: current.toISOString().split('T')[0] }).eq("id", id);
    fetchData();
  };

  const trackClick = async (id: string, type: 'wa_clicks' | 'map_clicks' | 'qr_clicks') => {
    const biz = businesses.find(b => b.id === id);
    if (biz) {
      await supabase.from("businesses").update({ [type]: (biz[type] || 0) + 1 }).eq("id", id);
      fetchData();
    }
  };

  const publicBiz = useMemo(() => {
    return businesses.filter(b => {
      const daysLeft = Math.ceil((new Date(b.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category.toLowerCase() === activeCat.toLowerCase();
      return daysLeft > 0 && matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, activeCat]);

  const adminBiz = useMemo(() => {
    return [...businesses].sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }, [businesses]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && selectedBizId) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        if (text === selectedBizId) { trackClick(selectedBizId, 'qr_clicks'); alert("¡Cupón validado!"); }
        else { alert("QR no válido para este local."); }
        setView("user"); scanner?.clear();
      }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(() => {}); };
  }, [view, selectedBizId]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: "'Georgia', serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        .card-biz { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-biz:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important; }
        .btn-action { transition: opacity 0.15s ease, transform 0.15s ease; }
        .btn-action:active { opacity: 0.8; transform: scale(0.97); }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .cat-pill { transition: all 0.2s ease; }
        .discount-badge { 
          background: linear-gradient(135deg, #ef4444, #dc2626);
          font-family: 'Playfair Display', serif;
          letter-spacing: -0.5px;
        }
      `}</style>

      {/* BANNER */}
      <div style={{ width: "100%", position: "relative" }}>
        <img src="banner.png" style={{ width: "100%", display: "block" }} alt="Banner" />
        <div style={{ position: "absolute", top: "15px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between" }}>
          <Download size={28} color="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} />
          <Settings size={28} color="#fff" onClick={() => isAdmin ? setView("admin") : setView("login")} style={{ cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} />
        </div>
      </div>

      {view === "login" ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: "15px", maxWidth: "320px", margin: "0 auto" }}>
            <input placeholder="WhatsApp Admin" value={userLogin} onChange={e => setUserLogin(e.target.value)} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <input type="password" placeholder="Contraseña" value={passLogin} onChange={e => setPassLogin(e.target.value)} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <button type="submit" style={{ background: "#3b82f6", padding: "15px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "bold" }}>ENTRAR</button>
            <button type="button" onClick={() => setView("user")} style={{ color: "#94a3b8", background: "none", border: "none", marginTop: "10px" }}>Volver</button>
          </form>
        </div>
      ) : view === "scanner" ? (
        <div style={{ padding: "20px" }}>
          <div id="reader" style={{ background: "#fff", borderRadius: "20px", overflow: "hidden" }}></div>
          <button onClick={() => setView("user")} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "#ef4444", borderRadius: "10px", border: "none", color: "#fff" }}>SALIR</button>
        </div>
      ) : view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <ArrowLeft onClick={() => setView("user")} style={{ cursor: "pointer" }} />
            <LogOut color="#ef4444" onClick={() => { setIsAdmin(false); localStorage.removeItem("admin_auth"); setView("user"); }} />
          </div>
          <div style={{ background: "#0a1929", padding: "20px", borderRadius: "20px", border: "1px solid #3b82f6", marginBottom: "30px" }}>
            <h3 style={{ marginTop: 0, color: "#fbbf24" }}>NUEVO COMERCIO</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              <input placeholder="Nombre" value={newBiz.name} onChange={e => setNewBiz({ ...newBiz, name: e.target.value })} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <input placeholder="WhatsApp" value={newBiz.phone} onChange={e => setNewBiz({ ...newBiz, phone: e.target.value })} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <input placeholder="Lat" value={newBiz.lat} onChange={e => setNewBiz({ ...newBiz, lat: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                <input placeholder="Lng" value={newBiz.lng} onChange={e => setNewBiz({ ...newBiz, lng: e.target.value })} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              </div>
              <select value={newBiz.category} onChange={e => setNewBiz({ ...newBiz, category: e.target.value })} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", color: "#fff" }}>
                {categorias.filter(c => c.id !== "todos").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input placeholder="% Descuento" type="number" value={newBiz.discount} onChange={e => setNewBiz({ ...newBiz, discount: e.target.value })} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <input placeholder="Texto de Promoción" value={newBiz.promo_text} onChange={e => setNewBiz({ ...newBiz, promo_text: e.target.value })} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <button onClick={createBusiness} style={{ background: "#22c55e", padding: "15px", borderRadius: "10px", color: "#fff", fontWeight: "bold", border: "none" }}>AGREGAR</button>
            </div>
          </div>

          {adminBiz.map(biz => {
            const days = Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            return (
              <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px", marginBottom: "15px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b style={{ color: "#fbbf24" }}>{biz.name}</b>
                  <span style={{ color: days <= 5 ? "#ef4444" : "#22c55e", fontWeight: "bold" }}>{days} días</span>
                </div>
                <div style={{ fontSize: "11px", color: "#3b82f6", margin: "8px 0" }}>WA: {biz.wa_clicks} | MAPA: {biz.map_clicks} | QR: {biz.qr_clicks}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
                  <Bell size={20} color="#fbbf24" onClick={() => window.open("https://wa.me/549" + biz.phone + "?text=Hola%20" + biz.name + ",%20te%20quedan%20" + days + "%20días%20en%20Calafate%20Plus.")} />
                  <Minus size={20} color="#ef4444" onClick={() => adjustDays(biz.id, -30)} />
                  <Plus size={20} color="#22c55e" onClick={() => adjustDays(biz.id, 30)} />
                  <Trash2 size={20} color="#64748b" onClick={async () => { if (confirm("¿Borrar?")) { await supabase.from("businesses").delete().eq("id", biz.id); fetchData(); } }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div style={{ padding: "16px 16px 0" }}>

            {/* BUSCADOR */}
            <div style={{ position: "relative", marginBottom: "14px" }}>
              <Search style={{ position: "absolute", left: "15px", top: "13px", color: "#475569" }} size={18} />
              <input
                placeholder="Buscar comercio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "13px 15px 13px 42px", borderRadius: "14px", background: "#0d1f33", border: "1px solid #1e3a5f", color: "#fff", outline: "none", fontSize: "15px", boxSizing: "border-box" }}
              />
            </div>

            {/* CATEGORÍAS */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "14px" }} className="hide-scroll">
              {categorias.map(cat => (
                <button key={cat.id} className="cat-pill" onClick={() => setActiveCat(cat.id)} style={{
                  whiteSpace: "nowrap", padding: "9px 16px", borderRadius: "20px", border: "none",
                  background: activeCat === cat.id ? "#3b82f6" : "#0d1f33",
                  color: activeCat === cat.id ? "#fff" : "#94a3b8",
                  display: "flex", alignItems: "center", gap: "7px", fontWeight: "500",
                  fontSize: "13px", cursor: "pointer",
                  boxShadow: activeCat === cat.id ? "0 0 16px rgba(59,130,246,0.4)" : "none"
                }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* MAPA */}
            <div style={{ height: "220px", borderRadius: "18px", overflow: "hidden", marginBottom: "22px", border: "1px solid #1e3a5f", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
              <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
                <LocationMarker />
                {publicBiz.map(b => b.lat && b.lng && (
                  <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} />
                ))}
              </MapContainer>
            </div>

            {/* CONTADOR */}
            <p style={{ color: "#475569", fontSize: "12px", marginBottom: "14px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {publicBiz.length} comercio{publicBiz.length !== 1 ? "s" : ""} encontrado{publicBiz.length !== 1 ? "s" : ""}
            </p>

            {/* TARJETAS - NUEVO DISEÑO */}
            {publicBiz.map(biz => {
              const catColor = CAT_COLORS[biz.category.toLowerCase()] || "#3b82f6";
              const catEmoji = CAT_EMOJIS[biz.category.toLowerCase()] || "📍";
              return (
                <div key={biz.id} className="card-biz" style={{
                  background: "linear-gradient(145deg, #0d1f33 0%, #0a1525 100%)",
                  borderRadius: "20px",
                  marginBottom: "14px",
                  border: "1px solid #1e3a5f",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                }}>
                  {/* FRANJA DE COLOR POR CATEGORÍA */}
                  <div style={{ height: "4px", background: "linear-gradient(90deg, " + catColor + ", transparent)" }} />

                  <div style={{ padding: "18px" }}>
                    {/* HEADER DE TARJETA */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ flex: 1, paddingRight: "12px" }}>
                        {/* BADGE DE CATEGORÍA */}
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: catColor + "22", border: "1px solid " + catColor + "44", borderRadius: "20px", padding: "3px 10px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px" }}>{catEmoji}</span>
                          <span style={{ fontSize: "11px", color: catColor, fontWeight: "600", textTransform: "capitalize", letterSpacing: "0.03em" }}>{biz.category}</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: "19px", fontFamily: "'Playfair Display', serif", fontWeight: "700", lineHeight: "1.2", color: "#f1f5f9" }}>{biz.name}</h3>
                        {biz.promo_text && (
                          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#94a3b8", lineHeight: "1.4", fontFamily: "'DM Sans', sans-serif" }}>{biz.promo_text}</p>
                        )}
                      </div>

                      {/* BADGE DE DESCUENTO */}
                      <div className="discount-badge" style={{
                        minWidth: "68px", height: "68px", borderRadius: "16px",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, boxShadow: "0 4px 16px rgba(239,68,68,0.35)"
                      }}>
                        <span style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1", color: "#fff", fontFamily: "'Playfair Display', serif" }}>{biz.discount_pct}%</span>
                        <span style={{ fontSize: "10px", color: "#fca5a5", fontWeight: "500", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>OFF</span>
                      </div>
                    </div>

                    {/* DIVISOR */}
                    <div style={{ height: "1px", background: "linear-gradient(90deg, #1e3a5f, transparent)", marginBottom: "14px" }} />

                    {/* BOTONES DE ACCIÓN */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 44px", gap: "10px" }}>
                      <button className="btn-action" onClick={() => { trackClick(biz.id, 'map_clicks'); window.open("https://www.google.com/maps/search/?api=1&query=" + biz.lat + "," + biz.lng); }} style={{
                        background: "#0f2744", padding: "12px 8px", borderRadius: "12px",
                        fontWeight: "600", border: "1px solid #1e3a5f", color: "#cbd5e1",
                        fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        <MapPin size={15} color="#3b82f6" /> Ubicación
                      </button>
                      <button className="btn-action" onClick={() => { trackClick(biz.id, 'wa_clicks'); window.open("https://wa.me/549" + biz.phone); }} style={{
                        background: "#052e16", padding: "12px 8px", borderRadius: "12px",
                        fontWeight: "600", border: "1px solid #14532d", color: "#4ade80",
                        fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        <Phone size={15} color="#22c55e" /> WhatsApp
                      </button>
                      <button className="btn-action" onClick={() => { setSelectedBizId(biz.id); setView("scanner"); }} style={{
                        background: "#0d1f33", padding: "12px", borderRadius: "12px",
                        border: "1px solid #1e3a5f", color: "#3b82f6",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ height: "30px" }} />
          </div>
        </>
      )}
    </div>
  );
}
