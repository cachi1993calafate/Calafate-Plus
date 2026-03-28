import React, { useState, useEffect, useMemo, CSSProperties } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, MessageCircle, Camera, Search, LogOut } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- ICONOS CON DIBUJOS Y COLORES ---
const getBizIcon = (category: string) => {
  let color = "#3b82f6"; 
  let iconHtml = "📍";
  const cat = category ? category.toLowerCase() : "";

  if (cat.includes("gastro")) { color = "#ef4444"; iconHtml = "🍴"; }
  else if (cat.includes("pana")) { color = "#f59e0b"; iconHtml = "🥖"; }
  else if (cat.includes("kios")) { color = "#facc15"; iconHtml = "🍬"; }
  else if (cat.includes("láser") || cat.includes("laser") || cat.includes("serv")) { color = "#06b6d4"; iconHtml = "🛠️"; }
  else if (cat.includes("emprend")) { color = "#8b5cf6"; iconHtml = "🚀"; }
  else if (cat.includes("regal")) { color = "#ec4899"; iconHtml = "🎁"; }
  else if (cat.includes("excur")) { color = "#10b981"; iconHtml = "🏔️"; }
  else { color = "#64748b"; iconHtml = "📦"; } 

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);">
             <div style="transform: rotate(45deg); font-size: 18px;">${iconHtml}</div>
           </div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 38]
  });
};

const userIcon = L.divIcon({
  html: `<div class="user-gps-marker"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapController({ markers, center }: { markers: any[], center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    } else {
      map.setView(center, 14);
    }
  }, [markers, map, center]);
  return null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "login" | "scanner">("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  
  const defaultCenter: [number, number] = [-50.338, -72.263];
  const userLocation: [number, number] = [-50.336, -72.260]; 

  const CATEGORIES = ["Todos", "Gastronomía", "Panadería", "Kiosco", "Láser", "Emprendedores", "Regalos", "Excursiones"];

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
    
    const style = document.createElement('style');
    style.innerHTML = `
      .user-gps-marker { width: 18px; height: 18px; background-color: #ef4444; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 rgba(239, 68, 68, 0.4); animation: pulse 2s infinite; }
      @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    `;
    document.head.appendChild(style);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*");
    if (data) setBusinesses(data);
  };

  const openWhatsApp = (phone: string) => {
    let cleanNumber = phone.replace(/\D/g, "");
    if (!cleanNumber.startsWith("54")) cleanNumber = "549" + cleanNumber;
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => 
      (catFilter === "Todos" || (b.category && b.category.toLowerCase().includes(catFilter.toLowerCase().substring(0,4)))) &&
      (b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [businesses, searchTerm, catFilter]);

  const mapMarkers = useMemo(() => filteredBiz.filter(b => b.lat && b.lng), [filteredBiz]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" />
        <button onClick={() => setView("login")} style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid #3b82f6", padding: "6px 16px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>ADMIN</button>
      </div>

      <header style={{ textAlign: "center", marginBottom: "15px" }}>
        <p style={{ color: "#3b82f6", fontWeight: "900", letterSpacing: "3px", fontSize: "12px", margin: "0" }}>FULL DESCUENTOS</p>
        <h1 style={{ margin: 0, fontSize: "42px", fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
      </header>

      {/* MAPA CLARO Y VISIBLE */}
      <div style={{ height: "280px", margin: "15px", borderRadius: "25px", overflow: "hidden", border: "2px solid #1e293b", boxShadow: "0 10px 20px rgba(0,0,0,0.5)" }}>
        <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          {/* TileLayer de Voyager: Más claro, se ven las calles y nombres perfectamente */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
          
          <Marker position={userLocation} icon={userIcon}>
            <Popup><div style={{color:"#000", fontWeight:"bold"}}>Estás aquí</div></Popup>
          </Marker>

          {mapMarkers.map(b => (
            <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)}>
              <Popup><div style={{color:"#000"}}><b>{b.name}</b><br/>{b.offer_es}</div></Popup>
            </Marker>
          ))}
          
          <MapController markers={mapMarkers} center={defaultCenter} />
        </MapContainer>
      </div>

      {/* BUSCADOR Y CATEGORÍAS */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ background: "#0f172a", borderRadius: "15px", padding: "12px 15px", display: "flex", alignItems: "center", marginBottom: "15px", border: "1px solid #1e293b" }}>
          <Search size={20} color="#64748b" />
          <input placeholder="¿Qué buscas hoy?" onChange={e => setSearchTerm(e.target.value)} style={{ background: "none", border: "none", color: "#fff", marginLeft: "10px", width: "100%", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ background: c === catFilter ? "#3b82f6" : "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "12px", whiteSpace: "nowrap", fontWeight: "bold", transition: "0.3s" }}>{c}</button>
          ))}
        </div>
      </div>

      {/* LISTA DE RESULTADOS */}
      <main style={{ padding: "20px" }}>
        {filteredBiz.length > 0 ? filteredBiz.map(biz => (
          <div key={biz.id} style={{ background: "#0a1929", borderRadius: "25px", marginBottom: "20px", padding: "20px", border: "1px solid #1e293b", position: "relative" }}>
             <div style={{ position: "absolute", top: "15px", right: "15px", background: "#ef4444", color: "#fff", padding: "5px 12px", borderRadius: "10px", fontWeight: "900", fontSize: "14px" }}>{biz.discount_pct || "10"}% OFF</div>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "22px", fontWeight: "900" }}>{biz.name}</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 15px 0" }}>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => openWhatsApp(biz.phone)} style={{ background: "#22c55e", color: "#fff", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "13px" }}>WHATSAPP</button>
              <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "13px" }}>COMO LLEGAR</button>
            </div>
          </div>
        )) : (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            <p>No hay locales en esta categoría todavía.</p>
          </div>
        )}
      </main>

      {/* LOGIN PANEL (Solo para vos) */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#010b14", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "85%", textAlign: "center" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "20px" }}>Acceso Admin</h2>
            <input placeholder="Usuario" onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "15px", marginBottom: "10px", borderRadius: "15px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff" }} />
            <input type="password" placeholder="Clave" onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "15px", marginBottom: "20px", borderRadius: "15px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff" }} />
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); setView("user");}else{alert("Error");}}} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "15px", borderRadius: "15px", border: "none", fontWeight: "bold" }}>ENTRAR</button>
            <button onClick={()=>setView("user")} style={{ marginTop: "20px", color: "#64748b", background: "none", border: "none" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
