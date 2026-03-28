import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, MessageCircle, Camera, Search, LogOut, Plus, BarChart3, Settings, Trash2, RotateCcw, Edit2, X } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- ICONOS PERSONALIZADOS (Los que ya funcionaban) ---
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
    html: `<div style="background-color: ${color}; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);"><div style="transform: rotate(45deg); font-size: 18px;">${iconHtml}</div></div>`,
    className: "", iconSize: [38, 38], iconAnchor: [19, 38]
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
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // ESTADO DE EDICIÓN
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBiz, setNewBiz] = useState({ 
    name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, 
    lat: -50.338, lng: -72.263, is_active: true 
  });

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

  const trackClick = async (id: string, column: string, currentVal: number) => {
    await supabase.from("businesses").update({ [column]: (currentVal || 0) + 1 }).eq("id", id);
    fetchData();
  };

  const handleSaveBusiness = async () => {
    if(!newBiz.name || !newBiz.phone) return alert("Faltan datos obligatorios");
    if (editingId) {
      await supabase.from("businesses").update(newBiz).eq("id", editingId);
      setEditingId(null);
      alert("Local actualizado");
    } else {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      await supabase.from("businesses").insert([{ ...newBiz, expires_at: expiry.toISOString().split('T')[0] }]);
      alert("Local creado");
    }
    fetchData();
    setNewBiz({ name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, lat: -50.338, lng: -72.263, is_active: true });
  };

  const startEdit = (biz: any) => {
    setEditingId(biz.id);
    setNewBiz({ name: biz.name, category: biz.category, phone: biz.phone, offer_es: biz.offer_es, discount_pct: biz.discount_pct, lat: biz.lat, lng: biz.lng, is_active: biz.is_active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const processPayment = async (biz: any) => {
    const now = new Date();
    const currentExpiry = (biz.expires_at && new Date(biz.expires_at) > now) ? new Date(biz.expires_at) : now;
    currentExpiry.setDate(currentExpiry.getDate() + 30);
    await supabase.from("businesses").update({ expires_at: currentExpiry.toISOString().split('T')[0], is_active: true }).eq("id", biz.id);
    fetchData();
  };

  const subtractPayment = async (biz: any) => {
    if(!biz.expires_at) return;
    const currentExpiry = new Date(biz.expires_at);
    currentExpiry.setDate(currentExpiry.getDate() - 30);
    await supabase.from("businesses").update({ expires_at: currentExpiry.toISOString().split('T')[0] }).eq("id", biz.id);
    fetchData();
  };

  const deleteBusiness = async (id: string, name: string) => {
    if(window.confirm(`¿Borrar definitivamente "${name}"?`)){
        await supabase.from("businesses").delete().eq("id", id);
        fetchData();
    }
  };

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

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER PUBLICO */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" onClick={() => installPrompt?.prompt()} />
        {isAdmin ? (
          <div style={{ display: "flex", gap: "15px" }}>
            <Settings size={24} color="#fbbf24" onClick={() => setView(view === "admin" ? "user" : "admin")} style={{cursor:"pointer"}} />
            <LogOut size={24} color="#ef4444" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin"); setView("user");}} style={{cursor:"pointer"}} />
          </div>
        ) : (
          <button onClick={() => setView("login")} style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid #3b82f6", padding: "6px 16px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>ADMIN</button>
        )}
      </div>

      {view === "scanner" ? (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000" }}>
           <div id={currentScannerId!} style={{ width: "85%", borderRadius:"20px", overflow:"hidden" }}></div>
           <button onClick={() => setView("user")} style={{ marginTop: "30px", background:"#ef4444", color:"#fff", padding:"15px 40px", borderRadius:"15px", border:"none", fontWeight:"bold" }}>CANCELAR</button>
        </div>
      ) : view !== "admin" ? (
        /* --- DISEÑO LOBBY ORIGINAL (Tu Foto) --- */
        <>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={{ color: "#3b82f6", fontWeight: "900", letterSpacing: "3px", fontSize: "12px", margin: "0 0 5px 0" }}>FULL DESCUENTOS</p>
            <h1 style={{ margin: 0, fontSize: "45px", fontWeight: "900", lineHeight: 0.9 }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
          </header>

          <div style={{ height: "250px", margin: "20px", borderRadius: "25px", overflow: "hidden", border: "2px solid #1e293b" }}>
            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              <Marker position={userLocation} icon={userIcon} />
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
              <input placeholder="Buscar por nombre..." onChange={e => setSearchTerm(e.target.value)} style={{ background: "none", border: "none", color: "#fff", marginLeft: "10px", width: "100%", outline: "none" }} />
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
                <div style={{ position: "absolute", top: "20px", right: "20px", background: "#ef4444", color: "#fff", width: "55px", height: "55px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "12px" }}>{biz.discount_pct}% OFF</div>
                <h3 style={{ margin: "0", fontSize: "24px", fontWeight: "900" }}>{biz.name}</h3>
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: "5px 0 20px 0" }}>{biz.offer_es}</p>
                
                <button onClick={() => {setCurrentScannerId(`r-${biz.id}`); setView("scanner");}} style={{ background: "#22c55e", color: "#fff", width: "100%", padding: "14px", borderRadius: "15px", border: "none", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
                  <Camera size={20}/> ACCEDER A LA PROMO
                </button>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button onClick={() => {trackClick(biz.id, "clicks_map", biz.clicks_map); window.open(`http://maps.google.com/?q=${biz.lat},${biz.lng}`);}} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "15px", border: "none", fontWeight: "bold" }}>📍 MAPA</button>
                  <button onClick={() => {trackClick(biz.id, "clicks_wa", biz.clicks_wa); window.open(`https://wa.me/549${biz.phone}`);}} style={{ background: "none", border: "1.5px solid #22c55e", color: "#22c55e", padding: "12px", borderRadius: "15px", fontWeight: "bold" }}>WHATSAPP</button>
                </div>
              </div>
            ))}
          </main>
        </>
      ) : (
        /* --- PANEL ADMIN (MAESTRO) --- */
        <div style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "900", color: "#fbbf24", marginBottom: "25px" }}>{editingId ? "Editando Local" : "Nuevo Local"}</h2>
          
          <div style={{ background: "#0f172a", borderRadius: "20px", padding: "20px", marginBottom: "30px", border: "1px solid #3b82f6" }}>
            <div style={{ display: "grid", gap: "12px" }}>
              <input value={newBiz.name} placeholder="Nombre del Local" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <input value={newBiz.offer_es} placeholder="Promoción (Ej: 2x1 en Pintas)" onChange={e => setNewBiz({...newBiz, offer_es: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <input value={newBiz.phone} placeholder="WhatsApp" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input type="number" step="0.001" value={newBiz.lat} onChange={e => setNewBiz({...newBiz, lat: parseFloat(e.target.value)})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
                  <input type="number" step="0.001" value={newBiz.lng} onChange={e => setNewBiz({...newBiz, lng: parseFloat(e.target.value)})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => navigator.geolocation.getCurrentPosition(p => setNewBiz({...newBiz, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ flex: 1, background: "#1e293b", color: "#fff", padding: "12px", borderRadius: "10px", border: "none", fontSize: "12px" }}>📍 CAPTURAR GPS</button>
                <button onClick={handleSaveBusiness} style={{ flex: 2, background: "#3b82f6", color: "#fff", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>{editingId ? "GUARDAR CAMBIOS" : "CREAR LOCAL"}</button>
                {editingId && <button onClick={() => {setEditingId(null); setNewBiz({name:"", category:"shopping", phone:"", offer_es:"", discount_pct:10, lat:-50.338, lng:-72.263, is_active:true});}} style={{ background: "#ef4444", padding: "12px", borderRadius: "10px", border: "none" }}><X/></button>}
              </div>
            </div>
          </div>

          <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}><BarChart3 color="#22c55e"/> Gestión de Suscripciones</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                  <th align="left" style={{ padding: "10px" }}>LOCAL</th>
                  <th align="center" style={{ padding: "10px" }}>DÍAS</th>
                  <th align="right" style={{ padding: "10px" }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(biz => {
                  const days = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                  return (
                    <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "15px 10px" }}>
                        <div style={{ fontWeight: "bold" }}>{biz.name}</div>
                        <div style={{ fontSize: "10px", color: "#22c55e" }}>WA: {biz.clicks_wa || 0} | MAP: {biz.clicks_map || 0}</div>
                      </td>
                      <td align="center" style={{ fontWeight: "bold", color: days <= 5 ? "#ef4444" : "#22c55e" }}>{days}d</td>
                      <td align="right" style={{ padding: "10px", display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                        <button onClick={() => startEdit(biz)} style={{ background: "#1e293b", color: "#fbbf24", padding: "8px", borderRadius: "8px", border: "1px solid #fbbf24" }}><Edit2 size={16}/></button>
                        <button onClick={() => subtractPayment(biz)} style={{ background: "#0a1929", color: "#ef4444", border: "1px solid #ef4444", padding: "8px", borderRadius: "8px" }}><RotateCcw size={16}/></button>
                        <button onClick={() => processPayment(biz)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold" }}>+30</button>
                        <button onClick={() => deleteBusiness(biz.id, biz.name)} style={{ background: "none", border: "none", color: "#ef4444", marginLeft: "5px" }}><Trash2 size={18}/></button>
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
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); setView("admin");}else{alert("Error");}}} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "16px", borderRadius: "15px", border: "none", fontWeight: "900" }}>INGRESAR</button>
            <button onClick={()=>setView("user")} style={{ marginTop: "20px", background: "none", border: "none", color: "#64748b" }}>Volver</button>
          </div>
        </div>
      )}
    </div>
  );
}
