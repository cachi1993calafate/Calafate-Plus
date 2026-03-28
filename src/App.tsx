import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
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
    "cuidado personal": "✂️", "regalería": "🎁", "emprendedores": "🚀", "varios": "💰", "panaderia": "🍞" 
  };
  const colors: any = { "gastronomía": "#ef4444", "compras": "#facc15", "servicios": "#06b6d4", "panaderia": "#f97316" };
  const icon = icons[category.toLowerCase()] || "📍";
  const color = colors[category.toLowerCase()] || "#3b82f6";

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white;"><div style="transform: rotate(45deg); font-size: 16px;">${icon}</div></div>`,
    className: "", iconSize: [34, 34], iconAnchor: [17, 34]
  });
};

// --- COMPONENTE UBICACIÓN DEL USUARIO ---
function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMapEvents({
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  useEffect(() => { map.locate(); }, [map]);
  return position === null ? null : <Marker position={position} icon={userIcon}><Popup>Estás aquí</Popup></Marker>;
}

export default function CalafatePlus() {
  // --- ESTADOS ---
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "scanner" | "admin" | "login">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  
  // Login
  const [userLogin, setUserLogin] = useState("");
  const [passLogin, setPassLogin] = useState("");

  const ADMIN_USER = "2966694462"; // Tu WhatsApp (Usuario)
  const ADMIN_PASS = "admin123";   // Tu Contraseña

  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={16}/> },
    { id: "gastronomía", label: "Gastronomía", icon: "🍽️" },
    { id: "compras", label: "Compras", icon: "🛒" },
    { id: "servicios", label: "Servicios", icon: "🛠️" },
    { id: "construcción", label: "Construcción", icon: "🏗️" },
    { id: "cuidado personal", label: "Cuidado Personal", icon: "✂️" },
    { id: "regalería", label: "Regalería", icon: "🎁" },
    { id: "emprendedores", label: "Emprendedores", icon: "🚀" },
    { id: "varios", label: "Varios", icon: "💰" },
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
    } else {
      alert("Datos incorrectos");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("admin_auth");
    setView("user");
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

  const sortedAdminBiz = useMemo(() => {
    return [...businesses].sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }, [businesses]);

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => {
      const daysLeft = Math.ceil((new Date(b.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category.toLowerCase() === activeCat.toLowerCase();
      return daysLeft > 0 && matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, activeCat]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* BANNER */}
      <div style={{ width: "100%", height: "auto", aspectRatio: "1920/700", overflow: "hidden", position: "relative" }}>
        <img src="banner.png" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Banner" />
        <div style={{ position: "absolute", top: "15px", right: "20px" }}>
           <Settings size={28} color="#fff" onClick={() => isAdmin ? setView("admin") : setView("login")} style={{ cursor: "pointer" }} />
        </div>
      </div>

      {view === "login" ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ color: "#fbbf24", marginBottom: "30px" }}>INGRESO ADMIN</h2>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: "15px", maxWidth: "300px", margin: "0 auto" }}>
            <div style={{ position: "relative" }}>
              <User style={{ position: "absolute", left: "10px", top: "12px" }} size={20} color="#475569" />
              <input type="text" placeholder="WhatsApp" value={userLogin} onChange={e => setUserLogin(e.target.value)} style={{ width: "100%", padding: "12px 40px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            </div>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "10px", top: "12px" }} size={20} color="#475569" />
              <input type="password" placeholder="Contraseña" value={passLogin} onChange={e => setPassLogin(e.target.value)} style={{ width: "100%", padding: "12px 40px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            </div>
            <button type="submit" style={{ background: "#3b82f6", padding: "15px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "bold" }}>ENTRAR</button>
            <button type="button" onClick={() => setView("user")} style={{ color: "#94a3b8", background: "none", border: "none" }}>Cancelar</button>
          </form>
        </div>
      ) : view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ArrowLeft onClick={() => setView("user")} style={{cursor:"pointer"}} />
              <h2 style={{ color: "#fbbf24", margin: 0 }}>PANEL CONTROL</h2>
            </div>
            <LogOut size={24} color="#ef4444" onClick={handleLogout} style={{cursor:"pointer"}} />
          </div>

          <div style={{ display: "grid", gap: "15px" }}>
            {sortedAdminBiz.map(biz => {
              const days = Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <b style={{fontSize: "18px"}}>{biz.name}</b>
                    <span style={{ color: days <= 5 ? "#ef4444" : "#22c55e", fontWeight: "900" }}>{days} Días restantes</span>
                  </div>
                  {/* MÉTRICAS DE CLICKS */}
                  <div style={{ background: "#010b14", padding: "8px", borderRadius: "8px", fontSize: "13px", color: "#3b82f6", fontWeight: "bold", marginBottom: "10px" }}>
                    W: {biz.wa_clicks || 0} | M: {biz.map_clicks || 0} | QR: {biz.qr_clicks || 0}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
                    <Bell size={22} color="#fbbf24" onClick={() => window.open(`https://wa.me/549${biz.phone}?text=Hola%20${biz.name},%20te%20quedan%20${days}%20días%20en%20Calafate%20Plus.`)} />
                    <Minus size={22} color="#ef4444" onClick={() => adjustDays(biz.id, -30)} />
                    <Plus size={22} color="#22c55e" onClick={() => adjustDays(biz.id, 30)} />
                    <Trash2 size={22} color="#64748b" onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("businesses").delete().eq("id", biz.id); fetchData(); } }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div style={{ margin: "15px 20px" }}>
             <input placeholder="Buscar negocio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", background: "#0f172a", border: "none", color: "#fff" }} />
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px" }} className="hide-scroll">
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 15px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", fontWeight: "bold" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* MAPA CON PUNTO AZUL Y ICONOS POR CATEGORÍA */}
          <div style={{ height: "250px", margin: "0 20px 20px", borderRadius: "20px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              <LocationMarker />
              {filteredBiz.map(b => b.lat && b.lng && (
                <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)}>
                  <Popup><b>{b.name}</b><br/>{b.discount_pct}% OFF</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <main style={{ padding: "0 20px 40px" }}>
            {filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "20px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <h3 style={{ margin: 0 }}>{biz.name}</h3>
                   <span style={{ color: "#ef4444", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                  <button onClick={() => { trackClick(biz.id, 'map_clicks'); window.open(`http://googleusercontent.com/maps.google.com/3{biz.lat},${biz.lng}`); }} style={{ background: "#fff", padding: "12px", borderRadius: "10px", fontWeight: "bold", border: "none" }}>MAPA</button>
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
