import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, Settings, Trash2, MessageCircle, Search, LayoutGrid, Bell, Plus, Minus, LogOut, ArrowLeft, Utensils, ShoppingCart, Wrench } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- CORRECCIÓN DE ICONOS DEL MAPA ---
const getBizIcon = (category: string) => {
  const icons: any = { 
    "gastronomía": "🍽️", 
    "compras": "🛒", 
    "servicios": "🛠️", 
    "panaderia": "🍞" 
  };
  const iconEmoji = icons[category.toLowerCase()] || "📍";
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-size: 18px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${iconEmoji}</div>`,
    className: "", iconSize: [32, 32], iconAnchor: [16, 16]
  });
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
  const [newBiz, setNewBiz] = useState({ name: "", phone: "", category: "compras", lat: "", lng: "", discount: "10" });

  const ADMIN_USER = "2966694462"; 
  const ADMIN_PASS = "admin123";

  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={18} /> },
    { id: "gastronomía", label: "Gastronomía", icon: <Utensils size={18} /> },
    { id: "compras", label: "Compras", icon: <ShoppingCart size={18} /> },
    { id: "servicios", label: "Servicios", icon: <Wrench size={18} /> },
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
      discount_pct: parseInt(newBiz.discount), expires_at: expires.toISOString().split('T')[0],
      wa_clicks: 0, map_clicks: 0, qr_clicks: 0
    }]);
    fetchData();
    setNewBiz({ name: "", phone: "", category: "compras", lat: "", lng: "", discount: "10" });
  };

  const trackClick = async (id: string, type: 'wa_clicks' | 'map_clicks' | 'qr_clicks') => {
    const biz = businesses.find(b => b.id === id);
    if (biz) {
      await supabase.from("businesses").update({ [type]: (biz[type] || 0) + 1 }).eq("id", id);
      fetchData();
    }
  };

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category.toLowerCase() === activeCat.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, activeCat]);

  // --- ESCÁNER CONFIGURADO ---
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner") {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        if (text === selectedBizId) {
          trackClick(text, 'qr_clicks');
          alert("¡Cupón validado con éxito!");
        } else {
          alert("Este QR no pertenece a este comercio.");
        }
        setView("user");
        scanner?.clear();
      }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(()=>{}); };
  }, [view, selectedBizId]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* 1. BANNER (Sin títulos de texto extra, solo imagen y botones) */}
      <div style={{ width: "100%", position: "relative" }}>
        <img src="banner.png" style={{ width: "100%", display: "block" }} alt="Banner Principal" />
        <div style={{ position: "absolute", top: "15px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between" }}>
           <Download size={26} color="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
           <Settings size={26} color="#fff" onClick={() => isAdmin ? setView("admin") : setView("login")} style={{ cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
        </div>
      </div>

      {view === "login" ? (
        <div style={{ padding: "40px 20px" }}>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: "15px", maxWidth: "300px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", color: "#fbbf24" }}>ADMIN LOGIN</h2>
            <input placeholder="WhatsApp" value={userLogin} onChange={e => setUserLogin(e.target.value)} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
            <input type="password" placeholder="Contraseña" value={passLogin} onChange={e => setPassLogin(e.target.value)} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
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
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <ArrowLeft onClick={() => setView("user")} style={{ cursor: "pointer" }} />
            <LogOut color="#ef4444" onClick={() => { setIsAdmin(false); localStorage.removeItem("admin_auth"); setView("user"); }} style={{ cursor: "pointer" }} />
          </div>

          {/* FORMULARIO DE CARGA DE COMERCIO */}
          <div style={{ background: "#0a1929", padding: "20px", borderRadius: "20px", border: "1px solid #3b82f6", marginBottom: "20px" }}>
            <h3 style={{ marginTop: 0, color: "#fbbf24", fontSize: "16px" }}>NUEVO COMERCIO</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              <input placeholder="Nombre" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <input placeholder="WhatsApp" value={newBiz.phone} onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <input placeholder="Latitud" value={newBiz.lat} onChange={e => setNewBiz({...newBiz, lat: e.target.value})} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                <input placeholder="Longitud" value={newBiz.lng} onChange={e => setNewBiz({...newBiz, lng: e.target.value})} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              </div>
              <select value={newBiz.category} onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}>
                <option value="gastronomía">Gastronomía</option>
                <option value="compras">Compras</option>
                <option value="servicios">Servicios</option>
                <option value="panaderia">Panadería</option>
              </select>
              <input placeholder="% Descuento" type="number" value={newBiz.discount} onChange={e => setNewBiz({...newBiz, discount: e.target.value})} style={{ padding: "10px", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <button onClick={createBusiness} style={{ background: "#22c55e", padding: "12px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "bold" }}>AGREGAR</button>
            </div>
          </div>

          {/* LISTA DE CONTROL ADMIN */}
          {businesses.map(biz => (
            <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px", marginBottom: "10px", border: "1px solid #1e293b" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b>{biz.name}</b>
                <div style={{ display: "flex", gap: "10px" }}>
                  <Trash2 size={18} color="#ef4444" onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("businesses").delete().eq("id", biz.id); fetchData(); } }} />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "5px" }}>W: {biz.wa_clicks || 0} | M: {biz.map_clicks || 0} | QR: {biz.qr_clicks || 0}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ padding: "20px" }}>
            {/* BUSCADOR */}
            <div style={{ position: "relative", marginBottom: "15px" }}>
              <Search style={{ position: "absolute", left: "15px", top: "12px", color: "#475569" }} size={18} />
              <input placeholder="Buscar negocio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px 12px 40px", borderRadius: "12px", background: "#0f172a", border: "none", color: "#fff", outline: "none" }} />
            </div>

            {/* CATEGORÍAS */}
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "15px" }} className="hide-scroll">
              {categorias.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 15px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* MAPA (Corregido con iconos) */}
            <div style={{ height: "220px", borderRadius: "20px", overflow: "hidden", marginBottom: "25px", border: "1px solid #1e293b" }}>
              <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
                {filteredBiz.map(b => b.lat && b.lng && (
                  <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} />
                ))}
              </MapContainer>
            </div>

            {/* LISTA DE LOCALES (Con QR por local) */}
            {filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "20px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <h3 style={{ margin: 0, fontSize: "20px" }}>{biz.name}</h3>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Camera size={22} color="#3b82f6" onClick={() => { setSelectedBizId(biz.id); setView("scanner"); }} style={{ cursor: "pointer" }} />
                      <span style={{ color: "#ef4444", fontWeight: "900", fontSize: "18px" }}>{biz.discount_pct}% OFF</span>
                   </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
                  <button onClick={() => { trackClick(biz.id, 'map_clicks'); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`); }} style={{ background: "#fff", padding: "12px", borderRadius: "10px", fontWeight: "bold", border: "none", color: "#000" }}>UBICACIÓN</button>
                  <button onClick={() => { trackClick(biz.id, 'wa_clicks'); window.open(`https://wa.me/549${biz.phone}`); }} style={{ background: "#22c55e", padding: "12px", borderRadius: "10px", fontWeight: "bold", color: "#fff", border: "none" }}>WHATSAPP</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
