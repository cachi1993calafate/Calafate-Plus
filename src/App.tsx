import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, MessageCircle, Camera, Search, LogOut, Plus, BarChart3, Settings, MapPin, Save, Trash2 } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- ICONOS DE CATEGORÍAS (Sincronizados con tu Supabase) ---
const getBizIcon = (category: string) => {
  let color = "#3b82f6"; let iconHtml = "📍";
  const cat = category ? category.toLowerCase().trim() : "";
  if (cat === "gastronomy" || cat === "gastronomía") { color = "#ef4444"; iconHtml = "🍽️"; }
  else if (cat === "shopping" || cat === "compras") { color = "#facc15"; iconHtml = "🛒"; }
  else if (cat === "services" || cat === "servicios") { color = "#06b6d4"; iconHtml = "🛠️"; }
  else if (cat === "construction" || cat === "construcción") { color = "#94a3b8"; iconHtml = "🏗️"; }
  else if (cat === "personal care" || cat === "cuidado personal") { color = "#f472b6"; iconHtml = "✂️"; }
  else if (cat === "gifts" || cat === "regalería") { color = "#ec4899"; iconHtml = "🎁"; }
  else if (cat === "emprendimiento" || cat === "emprendedores") { color = "#8b5cf6"; iconHtml = "🚀"; }
  else { color = "#64748b"; iconHtml = "📦"; } 
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);"><div style="transform: rotate(45deg); font-size: 16px;">${iconHtml}</div></div>`,
    className: "", iconSize: [34, 34], iconAnchor: [17, 34]
  });
};

const userIcon = L.divIcon({ html: `<div class="user-gps-marker"></div>`, className: "", iconSize: [20, 20], iconAnchor: [10, 10] });

function MapController({ markers, center }: { markers: any[], center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    } else { map.setView(center, 14); }
  }, [markers, map, center]);
  return null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "login" | "scanner" | "admin">("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Estados para Nuevo Negocio
  const [newBiz, setNewBiz] = useState({ name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, lat: -50.338, lng: -72.263, is_active: true });

  const defaultCenter: [number, number] = [-50.338, -72.263];
  const userLocation: [number, number] = [-50.336, -72.260]; 

  const DISPLAY_CATEGORIES = [
    { label: "Todos", db: "Todos" }, { label: "Gastronomía", db: "gastronomy" }, { label: "Compras", db: "shopping" },
    { label: "Servicios", db: "services" }, { label: "Construcción", db: "construction" }, { label: "Cuidado personal", db: "personal care" },
    { label: "Regalería", db: "gifts" }, { label: "Emprendedores", db: "emprendimiento" }, { label: "Varios", db: "varios" }
  ];

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); setInstallPrompt(e); });
    const style = document.createElement('style');
    style.innerHTML = `.user-gps-marker { width: 18px; height: 18px; background-color: #ef4444; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 rgba(239, 68, 68, 0.4); animation: pulse 2s infinite; } @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }`;
    document.head.appendChild(style);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('is_featured', { ascending: false });
    if (data) setBusinesses(data);
  };

  // --- LÓGICA DE NEGOCIO Y PAGOS ---
  const trackClick = async (id: string, column: string, currentVal: number) => {
    await supabase.from("businesses").update({ [column]: (currentVal || 0) + 1 }).eq("id", id);
    fetchData();
  };

  const processPayment = async (biz: any) => {
    const now = new Date();
    const currentExpiry = (biz.expires_at && new Date(biz.expires_at) > now) ? new Date(biz.expires_at) : now;
    currentExpiry.setDate(currentExpiry.getDate() + 30);
    await supabase.from("businesses").update({ expires_at: currentExpiry.toISOString().split('T')[0], is_active: true }).eq("id", biz.id);
    fetchData();
  };

  const createBusiness = async () => {
    const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
    const { error } = await supabase.from("businesses").insert([{ ...newBiz, expires_at: expiry.toISOString().split('T')[0] }]);
    if (!error) { alert("¡Local Creado!"); fetchData(); }
  };

  // Filtro para el público: Solo activos y con fecha válida
  const publicBiz = useMemo(() => {
    const now = new Date();
    return businesses.filter(b => {
      const isExpired = b.expires_at && new Date(b.expires_at) < now;
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = catFilter === "Todos" || (b.category && b.category.toLowerCase() === catFilter.toLowerCase());
      return b.is_active && !isExpired && matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, catFilter]);

  const mapMarkers = useMemo(() => publicBiz.filter(b => b.lat && b.lng), [publicBiz]);

  // QR Scanner
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && currentScannerId) {
      scanner = new Html5QrcodeScanner(currentScannerId, { fps: 10, qrbox: 250 }, false);
      scanner.render(async (text) => {
        const bizId = currentScannerId.split('-')[1];
        await trackClick(bizId, "clicks_qr", 0);
        window.location.href = text;
        scanner?.clear(); setView("user");
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view, currentScannerId]);

  if (view === "scanner") return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h2 style={{color:"#fff", marginBottom:"20px"}}>Validando Promo...</h2>
      <div id={currentScannerId!} style={{ width: "85%", borderRadius: "20px", overflow: "hidden" }}></div>
      <button onClick={() => setView("user")} style={{ marginTop: "30px", background: "#ef4444", color: "#fff", border: "none", padding: "15px 40px", borderRadius: "12px", fontWeight: "bold" }}>CANCELAR</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER PUBLICO */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" onClick={() => installPrompt?.prompt()} />
        {isAdmin ? (
          <div style={{ display: "flex", gap: "15px" }}>
            <Settings size={24} color="#fbbf24" onClick={() => setView(view === "admin" ? "user" : "admin")} />
            <LogOut size={24} color="#ef4444" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin"); setView("user");}} />
          </div>
        ) : (
          <button onClick={() => setView("login")} style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid #3b82f6", padding: "6px 16px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>ADMIN</button>
        )}
      </div>

      {view !== "admin" ? (
        <>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={{ color: "#3b82f6", fontWeight: "900", letterSpacing: "3px", fontSize: "12px", margin: "0" }}>FULL DESCUENTOS</p>
            <h1 style={{ margin: 0, fontSize: "45px", fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
          </header>

          <div style={{ height: "250px", margin: "20px", borderRadius: "25px", overflow: "hidden", border: "2px solid #1e293b" }}>
            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              <Marker position={userLocation} icon={userIcon}><Popup>Estás aquí</Popup></Marker>
              {mapMarkers.map(b => (
                <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)}>
                  <Popup><div style={{color:"#000"}}><b>{b.name}</b><br/>{b.offer_es}</div></Popup>
                </Marker>
              ))}
              <MapController markers={mapMarkers} center={defaultCenter} />
            </MapContainer>
          </div>

          <div style={{ padding: "0 20px" }}>
            <div style={{ background: "#0f172a", borderRadius: "15px", padding: "12px 15px", display: "flex", alignItems: "center", marginBottom: "15px", border: "1px solid #1e293b" }}>
              <Search size={20} color="#64748b" />
              <input placeholder="¿Qué buscas?" onChange={e => setSearchTerm(e.target.value)} style={{ background: "none", border: "none", color: "#fff", marginLeft: "10px", width: "100%", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
              {DISPLAY_CATEGORIES.map(c => (
                <button key={c.db} onClick={() => setCatFilter(c.db)} style={{ background: c.db === catFilter ? "#3b82f6" : "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "12px", whiteSpace: "nowrap", fontWeight: "bold" }}>{c.label}</button>
              ))}
            </div>
          </div>

          <main style={{ padding: "20px" }}>
            {publicBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "25px", marginBottom: "25px", padding: "20px", border: "1px solid #1e293b", position: "relative" }}>
                <div style={{ position: "absolute", top: "20px", right: "20px", background: "#ef4444", color: "#fff", width: "55px", height: "55px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "14px" }}>{biz.discount_pct}%</div>
                <h3 style={{ margin: "0", fontSize: "24px", fontWeight: "900" }}>{biz.name}</h3>
                <p style={{ color: "#94a3b8", margin: "5px 0 20px 0" }}>{biz.offer_es}</p>
                <button onClick={() => {setCurrentScannerId(`r-${biz.id}`); setView("scanner");}} style={{ background: "#22c55e", color: "#fff", width: "100%", padding: "14px", borderRadius: "15px", border: "none", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}><Camera size={20}/> CANJEAR PROMO</button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button onClick={() => {trackClick(biz.id, "clicks_map", biz.clicks_map); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`);}} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "15px", border: "none", fontWeight: "bold" }}>📍 MAPA</button>
                  <button onClick={() => {trackClick(biz.id, "clicks_wa", biz.clicks_wa); let n = biz.phone.replace(/\D/g, ""); window.open(`https://wa.me/549${n}`);}} style={{ background: "none", border: "1.5px solid #22c55e", color: "#22c55e", padding: "12px", borderRadius: "15px", fontWeight: "bold" }}><MessageCircle size={18} style={{display:"inline", marginRight:"5px"}}/> WHATSAPP</button>
                </div>
              </div>
            ))}
          </main>
        </>
      ) : (
        /* --- PANEL ADMIN MAESTRO --- */
        <div style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#fbbf24" }}>Panel Maestro</h2>
          
          {/* NUEVO NEGOCIO */}
          <div style={{ background: "#0f172a", borderRadius: "20px", padding: "20px", marginBottom: "30px", border: "1px solid #3b82f6" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: 0 }}><Plus color="#3b82f6"/> Nuevo Local</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              <input placeholder="Nombre del Local" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <select onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }}>
                {DISPLAY_CATEGORIES.slice(1).map(c => <option key={c.db} value={c.db}>{c.label}</option>)}
              </select>
              <input placeholder="WhatsApp (Ej: 2902...)" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <input placeholder="Oferta (Ej: 2x1 en Pintas)" onChange={e => setNewBiz({...newBiz, offer_es: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => navigator.geolocation.getCurrentPosition(p => setNewBiz({...newBiz, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ flex: 1, background: "#1e293b", color: "#fff", padding: "12px", borderRadius: "10px", border: "none", fontSize: "12px" }}>📍 CAPTURAR GPS</button>
                <button onClick={createBusiness} style={{ flex: 1, background: "#3b82f6", color: "#fff", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>CREAR LOCAL</button>
              </div>
            </div>
          </div>

          {/* LISTA DE GESTION (TU EXCEL) */}
          <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}><BarChart3 color="#22c55e"/> Suscripciones y Métricas</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                  <th style={{ textAlign: "left", padding: "10px" }}>LOCAL / ESTADO</th>
                  <th style={{ textAlign: "center", padding: "10px" }}>MÉTRICAS (WA/Map/QR)</th>
                  <th style={{ textAlign: "right", padding: "10px" }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(biz => {
                  const daysLeft = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                  const isCritical = daysLeft <= 5;
                  return (
                    <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b", background: daysLeft <= 0 ? "rgba(239, 68, 68, 0.05)" : "none" }}>
                      <td style={{ padding: "15px 10px" }}>
                        <div style={{ fontWeight: "bold", color: daysLeft <= 0 ? "#ef4444" : "#fff" }}>{biz.name}</div>
                        <div style={{ fontSize: "10px", color: isCritical ? "#fbbf24" : "#64748b" }}>Vence en: {daysLeft} días</div>
                      </td>
                      <td style={{ textAlign: "center", padding: "10px" }}>
                        <span style={{ color: "#22c55e" }}>{biz.clicks_wa || 0}</span> / 
                        <span style={{ color: "#3b82f6" }}> {biz.clicks_map || 0}</span> / 
                        <span style={{ color: "#fbbf24" }}> {biz.clicks_qr || 0}</span>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px" }}>
                        <button onClick={() => processPayment(biz)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold" }}>+30 DÍAS</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#010b14", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "85%", maxWidth: "350px", textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "900", marginBottom: "20px" }}>Acceso Admin</h2>
            <input placeholder="Usuario" onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "15px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff" }} />
            <input type="password" placeholder="Clave" onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "15px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff" }} />
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); localStorage.setItem("cachi_admin","true"); setView("admin");}else{alert("Error");}}} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "16px", borderRadius: "15px", border: "none", fontWeight: "900" }}>INGRESAR</button>
            <button onClick={()=>setView("user")} style={{ marginTop: "20px", background: "none", border: "none", color: "#64748b" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
