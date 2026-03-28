import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, Settings, Trash2, MessageCircle, Search, LayoutGrid, Bell, Plus, Minus, LogOut, ArrowLeft, User, Lock } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- CONFIGURACIÓN DE ICONOS ---
const userIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #3b82f6;"></div>`,
  className: "", iconSize: [14, 14], iconAnchor: [7, 7]
});

const getBizIcon = (category: string) => {
  const icons: any = { 
    "gastronomía": "🍽️", "compras": "🛒", "servicios": "🛠️", "construcción": "🏗️", 
    "panaderia": "🍞", "varios": "📍" 
  };
  const iconEmoji = icons[category.toLowerCase()] || "📍";
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-size: 16px;">${iconEmoji}</div>`,
    className: "", iconSize: [30, 30], iconAnchor: [15, 15]
  });
};

function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMapEvents({
    locationfound(e) { setPosition([e.latlng.lat, e.latlng.lng]); map.flyTo(e.latlng, map.getZoom()); },
  });
  useEffect(() => { map.locate(); }, [map]);
  return position === null ? null : <Marker position={position} icon={userIcon}><Popup>Estás aquí</Popup></Marker>;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "admin" | "login" | "scanner">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  
  const [userLogin, setUserLogin] = useState("");
  const [passLogin, setPassLogin] = useState("");
  const [newBiz, setNewBiz] = useState({ name: "", phone: "", category: "varios", lat: "", lng: "", discount: "10" });

  const ADMIN_USER = "2966694462"; 
  const ADMIN_PASS = "admin123";

  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={16}/> },
    { id: "gastronomía", label: "Gastronomía", icon: "🍽️" },
    { id: "compras", label: "Compras", icon: "🛒" },
    { id: "servicios", label: "Servicios", icon: "🛠️" },
    { id: "panaderia", label: "Panadería", icon: "🍞" }
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
    if (userLogin === ADMIN_USER && passLogin === ADMIN_PASS) {
      setIsAdmin(true);
      localStorage.setItem("admin_auth", "true");
      setView("admin");
    } else { alert("Datos incorrectos"); }
  };

  const createBusiness = async () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await supabase.from("businesses").insert([{
      name: newBiz.name, phone: newBiz.phone, category: newBiz.category,
      lat: parseFloat(newBiz.lat), lng: parseFloat(newBiz.lng),
      discount_pct: parseInt(newBiz.discount), expires_at: expires.toISOString().split('T')[0]
    }]);
    fetchData();
    setNewBiz({ name: "", phone: "", category: "varios", lat: "", lng: "", discount: "10" });
  };

  const trackClick = async (id: string, type: 'wa_clicks' | 'map_clicks' | 'qr_clicks') => {
    const biz = businesses.find(b => b.id === id);
    if (biz) {
      await supabase.from("businesses").update({ [type]: (biz[type] || 0) + 1 }).eq("id", id);
      fetchData();
    }
  };

  const adjustDays = async (id: string, days: number) => {
    const biz = businesses.find(b => b.id === id);
    const current = biz.expires_at ? new Date(biz.expires_at) : new Date();
    current.setDate(current.getDate() + days);
    await supabase.from("businesses").update({ expires_at: current.toISOString().split('T')[0] }).eq("id", id);
    fetchData();
  };

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category.toLowerCase() === activeCat.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, activeCat]);

  // QR Scanner Logic corregida
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner") {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        const biz = businesses.find(b => b.id === text);
        if (biz) { trackClick(biz.id, 'qr_clicks'); alert(`¡Validado en ${biz.name}!`); setView("user"); }
        scanner?.clear();
      }, () => {});
    }
    return () => { if (scanner) scanner.clear(); };
  }, [view, businesses]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      <div style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" />
        <div style={{ display: "flex", gap: "15px" }}>
          <Settings size={24} color="#fbbf24" onClick={() => isAdmin ? setView("admin") : setView("login")} style={{ cursor: "pointer" }} />
          {isAdmin && <LogOut size={24} color="#ef4444" onClick={() => { setIsAdmin(false); localStorage.removeItem("admin_auth"); setView("user"); }} />}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "32px", margin: 0, fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Guía Comercial y Descuentos</p>
      </div>

      {view === "login" ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ color: "#fbbf24", marginBottom: "30px" }}>INGRESO ADMIN</h2>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: "15px", maxWidth: "300px", margin: "0 auto" }}>
            <input placeholder="WhatsApp" value={userLogin} onChange={e => setUserLogin(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <input type="password" placeholder="Contraseña" value={passLogin} onChange={e => setPassLogin(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <button type="submit" style={{ background: "#3b82f6", padding: "15px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "bold" }}>ENTRAR</button>
            <button type="button" onClick={() => setView("user")} style={{ color: "#94a3b8", background: "none", border: "none", marginTop: "10px" }}>Volver</button>
          </form>
        </div>
      ) : view === "scanner" ? (
        <div style={{ padding: "20px" }}>
          <div id="reader" style={{ background: "#fff", borderRadius: "20px", overflow: "hidden" }}></div>
          <button onClick={() => setView("user")} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "#ef4444", borderRadius: "10px", border: "none", color: "#fff", fontWeight: "bold" }}>CANCELAR</button>
        </div>
      ) : view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
            <ArrowLeft onClick={() => setView("user")} /> <h2 style={{ color: "#fbbf24", margin: 0 }}>PANEL CONTROL</h2>
          </div>
          
          <div style={{ background: "#0a1929", padding: "20px", borderRadius: "20px", border: "1px solid #3b82f6", marginBottom: "30px" }}>
            <h3 style={{marginTop: 0, fontSize: "16px"}}>+ AGREGAR COMERCIO</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              <input placeholder="Nombre" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <input placeholder="WhatsApp" value={newBiz.phone} onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <select value={newBiz.category} onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}>
                {categorias.filter(c => c.id !== "todos").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input placeholder="Lat" value={newBiz.lat} onChange={e => setNewBiz({...newBiz, lat: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                <input placeholder="Lng" value={newBiz.lng} onChange={e => setNewBiz({...newBiz, lng: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              </div>
              <button onClick={createBusiness} style={{ background: "#3b82f6", padding: "15px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "bold" }}>GUARDAR LOCAL</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "15px" }}>
            {businesses.map(biz => {
              const days = Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>{biz.name}</b>
                    <span style={{ color: days <= 5 ? "#ef4444" : "#22c55e", fontWeight: "bold" }}>{days} Días</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#3b82f6", margin: "10px 0" }}>W: {biz.wa_clicks || 0} | M: {biz.map_clicks || 0} | QR: {biz.qr_clicks || 0}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
                    <Bell size={20} color="#fbbf24" onClick={() => window.open(`https://wa.me/549${biz.phone}?text=Vence%20en%20${days}%20días`)} />
                    <Minus size={20} color="#ef4444" onClick={() => adjustDays(biz.id, -30)} />
                    <Plus size={20} color="#22c55e" onClick={() => adjustDays(biz.id, 30)} />
                    <Trash2 size={20} color="#64748b" onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("businesses").delete().eq("id", biz.id); fetchData(); } }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div style={{ margin: "0 20px 15px" }}>
             <input placeholder="Buscar negocio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", background: "#0f172a", border: "none", color: "#fff" }} />
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px" }}>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 15px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", fontWeight: "bold" }}>
                {typeof cat.icon === "string" ? cat.icon : cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ height: "250px", margin: "0 20px 20px", borderRadius: "20px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              <LocationMarker />
              {filteredBiz.map(b => b.lat && b.lng && (
                <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} />
              ))}
            </MapContainer>
          </div>

          <main style={{ padding: "0 20px 40px" }}>
             <button onClick={() => setView("scanner")} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "15px", borderRadius: "15px", fontWeight: "bold", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
                <Camera size={20}/> ESCANEAR QR EN LOCAL
             </button>

            {filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "20px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <h3 style={{ margin: 0 }}>{biz.name}</h3>
                   <span style={{ color: "#ef4444", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                  <button onClick={() => { trackClick(biz.id, 'map_clicks'); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`); }} style={{ background: "#fff", padding: "12px", borderRadius: "10px", fontWeight: "bold", border: "none" }}>UBICACIÓN</button>
                  <button onClick={() => { trackClick(biz.id, 'wa_clicks'); window.open(`https://wa.me/549${biz.phone}`); }} style={{ background: "#22c55e", padding: "12px", borderRadius: "10px", fontWeight: "bold", color: "#fff", border: "none" }}>WHATSAPP</button>
                </div>
              </div>
            ))}
          </main>
        </>
      )}
    </div>
  );
}
