import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, LogOut, Settings, Trash2, MessageCircle, Search, LayoutGrid, Bell, Plus, Minus } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// Icono de Usuario nítido (Sin interferencias)
const userIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(59,130,246,1);"></div>`,
  className: "", iconSize: [14, 14], iconAnchor: [7, 7]
});

// Mapeo de Iconos por Categoría para el Mapa
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

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "scanner" | "admin">("user");
  const [activeBizForQR, setActiveBizForQR] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  const [coordsInput, setCoordsInput] = useState("");
  const [newBiz, setNewBiz] = useState({ name: "", category: "compras", phone: "", offer_es: "", discount_pct: 10 });

  const MI_WHATSAPP = "5492966694462";
  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={16}/> },
    { id: "gastronomía", label: "Gastronomía", icon: "🍽️" },
    { id: "compras", label: "Compras", icon: "🛒" },
    { id: "servicios", label: "Servicios", icon: "🛠️" },
    { id: "construcción", label: "Construcción", icon: "🏗️" },
    { id: "cuidado personal", label: "✂️ Cuidado Personal", icon: "" },
    { id: "regalería", label: "🎁 Regalería", icon: "" },
    { id: "emprendedores", label: "🚀 Emprendedores", icon: "" },
    { id: "varios", label: "💰 Varios", icon: "" },
    { id: "panaderia", label: "🍞 Panadería", icon: "" }
  ];

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*");
    if (data) setBusinesses(data);
  };

  useEffect(() => { fetchData(); }, []);

  // Función para registrar Clicks (WhatsApp, Mapa, QR)
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

  // Ordenar Admin: Menos días arriba
  const sortedAdminBiz = useMemo(() => {
    return [...businesses].sort((a, b) => {
      const daysA = Math.ceil((new Date(a.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      const daysB = Math.ceil((new Date(b.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return daysA - daysB;
    });
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
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", paddingBottom: "30px" }}>
      
      {/* BANNER PROFESIONAL 1920x700 */}
      <div style={{ width: "100%", height: "180px", overflow: "hidden", position: "relative", background: "linear-gradient(to bottom, #021526, #010b14)" }}>
        <img src="logo.png" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "20px" }} alt="Calafate Plus Banner" />
        <div style={{ position: "absolute", top: "15px", right: "20px", display: "flex", gap: "15px" }}>
           <Settings size={26} color={view === "admin" ? "#fbbf24" : "#64748b"} onClick={() => setView(view === "admin" ? "user" : "admin")} />
        </div>
      </div>

      {view === "admin" ? (
        <div style={{ padding: "0 20px" }}>
          <h2 style={{ color: "#fbbf24", fontWeight: "900", textAlign: "center" }}>PANEL CONTROL</h2>
          {/* Formulario con Categoría */}
          <div style={{ background: "#0f172a", padding: "15px", borderRadius: "15px", marginBottom: "25px" }}>
             <input placeholder="Nombre" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
             <select onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", background: "#010b14", border: "1px solid #333", color: "#fff" }}>
                {categorias.filter(c => c.id !== "todos").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
             </select>
             <button style={{ width: "100%", background: "#3b82f6", padding: "14px", borderRadius: "8px", fontWeight: "bold", border: "none", color: "#fff" }}>CREAR LOCAL</button>
          </div>

          {/* Tabla de Gestión */}
          <div style={{ display: "grid", gap: "15px" }}>
            {sortedAdminBiz.map(biz => {
              const days = Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "16px" }}>{biz.name}</span>
                    <span style={{ color: days <= 5 ? "#ef4444" : "#22c55e", fontWeight: "bold" }}>{days} DÍAS</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>W:{biz.wa_clicks || 0} | M:{biz.map_clicks || 0} | Q:{biz.qr_clicks || 0}</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Bell size={20} color="#fbbf24" onClick={() => window.open(`https://wa.me/549${biz.phone}?text=Hola%20${biz.name},%20te%20quedan%20${days}%20días%20en%20Calafate%20Plus.`)} />
                      <Minus size={20} color="#ef4444" onClick={() => adjustDays(biz.id, -30)} />
                      <Plus size={20} color="#22c55e" onClick={() => adjustDays(biz.id, 30)} />
                      <Trash2 size={20} color="#64748b" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div style={{ margin: "15px 20px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "14px", top: "14px", color: "#475569" }} size={20} />
            <input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "14px 45px", borderRadius: "15px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
          </div>

          {/* Categorías con Iconos fijos */}
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px" }} className="hide-scroll">
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 16px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", fontWeight: "bold" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <main style={{ padding: "0 20px" }}>
            {filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "20px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "900" }}>{biz.name}</h3>
                   <span style={{ color: "#ef4444", fontSize: "18px", fontWeight: "900" }}>{biz.discount_pct}% OFF</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                  <button onClick={() => { trackClick(biz.id, 'map_clicks'); window.open(`https://maps.google.com/?q=${biz.lat},${biz.lng}`); }} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "10px", fontWeight: "900" }}>MAPA</button>
                  <button onClick={() => { trackClick(biz.id, 'wa_clicks'); window.open(`https://wa.me/549${biz.phone}`); }} style={{ background: "#22c55e", color: "#fff", padding: "12px", borderRadius: "10px", fontWeight: "900" }}>WHATSAPP</button>
                </div>
                {/* Botón Escáner dentro del Local */}
                <button onClick={() => { trackClick(biz.id, 'qr_clicks'); setView("scanner"); }} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "12px", borderRadius: "10px", marginTop: "10px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
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
