import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, MessageCircle, Camera, Search, LogOut, Plus, BarChart3, Settings, Save, Trash2, RotateCcw, Edit2, X } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- LÓGICA DE ICONOS ---
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
    if(!newBiz.name || !newBiz.phone) return alert("Faltan datos");
    if (editingId) {
      await supabase.from("businesses").update(newBiz).eq("id", editingId);
      setEditingId(null);
    } else {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      await supabase.from("businesses").insert([{ ...newBiz, expires_at: expiry.toISOString().split('T')[0] }]);
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
    if(window.confirm(`¿Borrar "${name}"?`)){
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
      
      {/* HEADER */}
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
           <div id={currentScannerId!} style={{ width: "80%" }}></div>
           <button onClick={() => setView("user")} style={{ marginTop: "20px", color: "#ef4444" }}>Cerrar</button>
        </div>
      ) : view !== "admin" ? (
        <>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
          </header>

          <div style={{ height: "200px", margin: "20px", borderRadius: "20px", overflow: "hidden" }}>
            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {mapMarkers.map(b => (
                <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)}>
                  <Popup><div style={{color:"#000"}}>{b.name}</div></Popup>
                </Marker>
              ))}
              <MapController markers={mapMarkers} center={defaultCenter} />
            </MapContainer>
          </div>

          <div style={{ padding: "0 20px" }}>
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", marginBottom: "15px" }}>
              {DISPLAY_CATEGORIES.map(c => (
                <button key={c.db} onClick={() => setCatFilter(c.db)} style={{ background: c.db === catFilter ? "#3b82f6" : "#1e293b", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "10px", whiteSpace: "nowrap" }}>{c.label}</button>
              ))}
            </div>
            {publicBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "15px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: 0 }}>{biz.name}</h3>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>{biz.offer_es}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                  <button onClick={() => {trackClick(biz.id, "clicks_map", biz.clicks_map); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`);}} style={{ background: "#fff", color: "#000", padding: "10px", borderRadius: "10px", fontWeight: "bold", border: "none" }}>📍 MAPA</button>
                  <button onClick={() => {trackClick(biz.id, "clicks_wa", biz.clicks_wa); window.open(`https://wa.me/549${biz.phone}`);}} style={{ background: "#22c55e", color: "#fff", padding: "10px", borderRadius: "10px", fontWeight: "bold", border: "none" }}>WA</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* --- PANEL ADMIN --- */
        <div style={{ padding: "20px" }}>
          <h2 style={{ color: "#fbbf24" }}>{editingId ? "Editando" : "Nuevo Local"}</h2>
          <div style={{ background: "#0f172a", padding: "15px", borderRadius: "15px", marginBottom: "20px" }}>
            <input value={newBiz.name} placeholder="Nombre" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
            <input value={newBiz.offer_es} placeholder="Promo" onChange={e => setNewBiz({...newBiz, offer_es: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
            <input value={newBiz.phone} placeholder="WhatsApp" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => navigator.geolocation.getCurrentPosition(p => setNewBiz({...newBiz, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#1e293b", color: "#fff" }}>GPS</button>
              <button onClick={handleSaveBusiness} style={{ flex: 2, padding: "10px", borderRadius: "8px", background: "#3b82f6", color: "#fff", fontWeight: "bold" }}>{editingId ? "GUARDAR" : "CREAR"}</button>
              {editingId && <button onClick={() => {setEditingId(null); setNewBiz({name:"", category:"shopping", phone:"", offer_es:"", discount_pct:10, lat:-50.338, lng:-72.263, is_active:true});}} style={{ background: "#ef4444", padding: "10px", borderRadius: "8px" }}><X/></button>}
            </div>
          </div>

          <table style={{ width: "100%", fontSize: "12px" }}>
            <thead><tr style={{ color: "#64748b" }}><th align="left">Local</th><th align="center">Días</th><th align="right">Acción</th></tr></thead>
            <tbody>
              {businesses.map(biz => {
                const days = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                return (
                  <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 0" }}><b>{biz.name}</b><br/><span style={{fontSize:"10px"}}>WA: {biz.clicks_wa || 0}</span></td>
                    <td align="center" style={{ color: days <= 5 ? "#ef4444" : "#22c55e" }}>{days}d</td>
                    <td align="right">
                      <button onClick={() => startEdit(biz)} style={{ color: "#fbbf24", background: "none", border: "none" }}><Edit2 size={16}/></button>
                      <button onClick={() => processPayment(biz)} style={{ color: "#22c55e", background: "none", border: "none", fontWeight: "bold" }}>+30</button>
                      <button onClick={() => deleteBusiness(biz.id, biz.name)} style={{ color: "#ef4444", background: "none", border: "none" }}><Trash2 size={16}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* LOGIN */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#010b14", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ width: "80%", textAlign: "center" }}>
            <h2 style={{ fontWeight: "900" }}>Admin Login</h2>
            <input placeholder="Usuario" onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <input type="password" placeholder="Clave" onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); setView("admin");}else{alert("Error");}}} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "15px", borderRadius: "10px", fontWeight: "900" }}>ENTRAR</button>
            <button onClick={()=>setView("user")} style={{ marginTop: "20px", color: "#64748b", background: "none", border: "none" }}>Volver</button>
          </div>
        </div>
      )}
    </div>
  );
}
