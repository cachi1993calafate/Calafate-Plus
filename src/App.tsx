import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, Settings, Trash2, MessageCircle, Search, LayoutGrid, Bell, Plus, Minus, LogOut, ArrowLeft } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// Icono de usuario nítido
const userIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #3b82f6;"></div>`,
  className: "", iconSize: [14, 14], iconAnchor: [7, 7]
});

// Iconos del mapa según categoría
const getBizIcon = (category: string) => {
  const icons: any = { "gastronomía": "🍽️", "compras": "🛒", "servicios": "🛠️", "construcción": "🏗️", "cuidado personal": "✂️", "regalería": "🎁", "emprendedores": "🚀", "varios": "💰", "panaderia": "🍞" };
  const colors: any = { "gastronomía": "#ef4444", "compras": "#facc15", "servicios": "#06b6d4", "panaderia": "#f97316" };
  const icon = icons[category.toLowerCase()] || "📍";
  const color = colors[category.toLowerCase()] || "#3b82f6";

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white;"><div style="transform: rotate(45deg); font-size: 16px;">${icon}</div></div>`,
    className: "", iconSize: [34, 34], iconAnchor: [17, 34]
  });
};

function MapController({ markers }: { markers: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [markers, map]);
  return null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "scanner" | "admin">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  const [coordsInput, setCoordsInput] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [newBiz, setNewBiz] = useState({ name: "", category: "compras", phone: "", offer_es: "", discount_pct: 10 });

  const CLAVE_SECRETA = "1234"; // CAMBIA TU CLAVE AQUÍ
  const MI_WHATSAPP = "5492966694462";
  
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
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    if (localStorage.getItem("admin_auth") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*");
    if (data) setBusinesses(data);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("Para instalar: Tocá los 3 puntos del navegador y seleccioná 'Instalar aplicación' o 'Agregar a inicio'.");
    }
  };

  const handleAdminAccess = () => {
    if (isAdmin) {
      setView("admin");
    } else {
      const pass = prompt("Ingresá la clave de administrador:");
      if (pass === CLAVE_SECRETA) {
        setIsAdmin(true);
        localStorage.setItem("admin_auth", "true");
        setView("admin");
      } else {
        alert("Clave incorrecta.");
      }
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("admin_auth");
    setView("user");
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

  // Manejo del Escáner
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner") {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        window.location.href = text;
        scanner?.clear();
        setView("user");
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", paddingBottom: "30px", fontFamily: 'sans-serif' }}>
      
      {/* HEADER / BANNER */}
      <div style={{ width: "100%", height: "auto", aspectRatio: "1920/700", overflow: "hidden", position: "relative" }}>
        <img src="banner.png" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Banner" />
        
        {/* ICONOS DE ACCIÓN SOBRE EL BANNER */}
        <div style={{ position: "absolute", top: "15px", left: "20px", display: "flex", gap: "15px" }}>
            <Download size={28} color="#fff" onClick={handleInstallClick} style={{ cursor: "pointer", filter: "drop-shadow(0 0 4px #000)" }} />
        </div>
        <div style={{ position: "absolute", top: "15px", right: "20px", display: "flex", gap: "15px" }}>
           {isAdmin && view === "admin" && <LogOut size={28} color="#ef4444" onClick={handleLogout} style={{cursor:"pointer"}} />}
           <Settings size={28} color="#fff" onClick={handleAdminAccess} style={{ cursor: "pointer", filter: "drop-shadow(0 0 5px #000)" }} />
        </div>
      </div>

      {view === "scanner" ? (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div id="reader" style={{ borderRadius: "20px", overflow: "hidden" }}></div>
          <button onClick={() => setView("user")} style={{ marginTop: "20px", background: "#ef4444", padding: "15px", borderRadius: "10px", width: "100%", border: "none", color: "#fff", fontWeight: "bold" }}>CANCELAR</button>
        </div>
      ) : view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <ArrowLeft onClick={() => setView("user")} style={{cursor:"pointer"}} />
            <h2 style={{ color: "#fbbf24", margin: 0 }}>PANEL CONTROL</h2>
          </div>
          
          {/* FORMULARIO ADMIN */}
          <div style={{ background: "#0f172a", padding: "15px", borderRadius: "15px", marginBottom: "25px" }}>
             <input placeholder="Nombre Local" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
             <select onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #333", color: "#fff" }}>
                {categorias.filter(c => c.id !== "todos").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
             </select>
             <input placeholder="WhatsApp" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
             <input placeholder="Lat, Lng" onChange={e => setCoordsInput(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #3b82f6", color: "#fbbf24" }} />
             <button style={{ width: "100%", background: "#3b82f6", padding: "14px", borderRadius: "8px", fontWeight: "bold", border: "none", color: "#fff" }}>AGREGAR</button>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {sortedAdminBiz.map(biz => {
              const days = Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>{biz.name}</b>
                    <span style={{ color: days <= 5 ? "#ef4444" : "#22c55e" }}>{days} Días</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px", marginTop: "10px" }}>
                    <Bell size={20} color="#fbbf24" onClick={() => window.open(`https://wa.me/549${biz.phone}?text=Hola%20${biz.name},%20te%20quedan%20${days}%20días.`)} />
                    <Minus size={20} color="#ef4444" onClick={() => adjustDays(biz.id, -30)} />
                    <Plus size={20} color="#22c55e" onClick={() => adjustDays(biz.id, 30)} />
                    <Trash2 size={20} color="#64748b" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* BUSCADOR Y CATEGORÍAS */}
          <div style={{ margin: "15px 20px" }}>
            <input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", background: "#0f172a", border: "none", color: "#fff" }} />
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px" }}>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 15px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", fontWeight: "bold" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* MAPA RESTAURADO */}
          <div style={{ height: "250px", margin: "0 20px 20px", borderRadius: "20px", overflow: "hidden" }}>
            <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {filteredBiz.map(b => <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} />)}
              <MapController markers={filteredBiz} />
            </MapContainer>
          </div>

          {/* LISTA DE LOCALES */}
          <main style={{ padding: "0 20px" }}>
            {filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "20px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <h3 style={{ margin: 0 }}>{biz.name}</h3>
                   <span style={{ color: "#ef4444", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                  <button onClick={() => { trackClick(biz.id, 'map_clicks'); window.open(`http://maps.google.com/?q=${biz.lat},${biz.lng}`); }} style={{ background: "#fff", padding: "12px", borderRadius: "10px", fontWeight: "bold" }}>MAPA</button>
                  <button onClick={() => { trackClick(biz.id, 'wa_clicks'); window.open(`https://wa.me/549${biz.phone}`); }} style={{ background: "#22c55e", padding: "12px", borderRadius: "10px", fontWeight: "bold", color: "#fff" }}>WHATSAPP</button>
                </div>
                {/* ESCÁNER POR LOCAL */}
                <button onClick={() => { trackClick(biz.id, 'qr_clicks'); setView("scanner"); }} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "12px", borderRadius: "10px", marginTop: "10px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", border: "none" }}>
                  <Camera size={20}/> ESCANEAR QR DEL LOCAL
                </button>
              </div>
            ))}
          </main>
        </>
      )}
    </div>
  );
}
