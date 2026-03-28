import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, Settings, Trash2, MessageCircle, Search, LayoutGrid, Bell, Plus, Minus, LogOut, ArrowLeft, User, Lock, MapPin, Utensils, ShoppingCart, Wrench } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- CONFIGURACIÓN DE ICONOS PARA EL MAPA ---
const userIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #3b82f6;"></div>`,
  className: "", iconSize: [14, 14], iconAnchor: [7, 7]
});

const getBizIcon = (category: string) => {
  const icons: any = { "gastronomía": "🍽️", "compras": "🛒", "servicios": "🛠️", "panaderia": "🍞" };
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
  
  // Login y Formulario de Nuevo Comercio
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
    const { error } = await supabase.from("businesses").insert([{
      name: newBiz.name, phone: newBiz.phone, category: newBiz.category,
      lat: parseFloat(newBiz.lat), lng: parseFloat(newBiz.lng),
      discount_pct: parseInt(newBiz.discount), expires_at: expires.toISOString().split('T')[0],
      wa_clicks: 0, map_clicks: 0, qr_clicks: 0
    }]);
    if (!error) {
      alert("Comercio agregado!");
      fetchData();
      setNewBiz({ name: "", phone: "", category: "compras", lat: "", lng: "", discount: "10" });
    }
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
      const daysLeft = Math.ceil((new Date(b.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category.toLowerCase() === activeCat.toLowerCase();
      return daysLeft > 0 && matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, activeCat]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* BANNER SUPERIOR (Tu imagen cargada) */}
      <div style={{ width: "100%", height: "auto", aspectRatio: "16/6", overflow: "hidden", position: "relative" }}>
        <img src="banner.png" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Calafate Plus Banner" />
        <div style={{ position: "absolute", top: "15px", left: "20px", right: "20px", display: "flex", justifyContent: "space-between", zIndex: 10 }}>
           <Download size={28} color="#fff" style={{ filter: "drop-shadow(0 0 5px #000)" }} />
           <Settings size={28} color="#fff" onClick={() => isAdmin ? setView("admin") : setView("login")} style={{ cursor: "pointer", filter: "drop-shadow(0 0 5px #000)" }} />
        </div>
      </div>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <h1 style={{ fontSize: "36px", margin: 0, fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
        <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "5px" }}>Guía Comercial y Descuentos</p>
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
      ) : view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
             <ArrowLeft onClick={() => setView("user")} style={{cursor:"pointer"}} />
             <LogOut color="#ef4444" onClick={() => { setIsAdmin(false); localStorage.removeItem("admin_auth"); setView("user"); }} />
          </div>

          {/* FORMULARIO AGREGAR COMERCIO */}
          <div style={{ background: "#0a1929", padding: "20px", borderRadius: "20px", border: "1px solid #3b82f6", marginBottom: "30px" }}>
            <h3 style={{marginTop: 0, color: "#fbbf24"}}>+ NUEVO COMERCIO</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              <input placeholder="Nombre del Local" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <input placeholder="WhatsApp (sin 0 ni 15)" value={newBiz.phone} onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <select value={newBiz.category} onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}>
                <option value="gastronomía">Gastronomía</option>
                <option value="compras">Compras</option>
                <option value="servicios">Servicios</option>
                <option value="panaderia">Panadería</option>
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input placeholder="Latitud" value={newBiz.lat} onChange={e => setNewBiz({...newBiz, lat: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                <input placeholder="Longitud" value={newBiz.lng} onChange={e => setNewBiz({...newBiz, lng: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              </div>
              <input placeholder="% Descuento" type="number" value={newBiz.discount} onChange={e => setNewBiz({...newBiz, discount: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
              <button onClick={createBusiness} style={{ background: "#22c55e", padding: "15px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "bold" }}>GUARDAR COMERCIO</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "15px" }}>
            {businesses.map(biz => {
              const days = Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div key={biz.id} style={{ background: "#0a1929", padding: "15px", borderRadius: "15px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>{biz.name}</b>
                    <span style={{ color: days <= 5 ? "#ef4444" : "#22c55e", fontWeight: "bold" }}>{days} Días restantes</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#3b82f6", margin: "10px 0" }}>W: {biz.wa_clicks || 0} | M: {biz.map_clicks || 0}</div>
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
          <div style={{ margin: "0 20px 15px", position: "relative" }}>
             <Search style={{ position: "absolute", left: "15px", top: "14px", color: "#475569" }} size={20} />
             <input placeholder="Buscar negocio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px 15px 12px 45px", borderRadius: "12px", background: "#0f172a", border: "none", color: "#fff" }} />
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px" }}>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 15px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                {cat.icon} {cat.label}
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
             {/* SECCIÓN REGISTRO */}
             <div style={{ background: "linear-gradient(45deg, #0a1929, #1e293b)", padding: "20px", borderRadius: "20px", marginBottom: "20px", textAlign: "center", border: "1px solid #3b82f6" }}>
                <h3 style={{ margin: "0 0 15px 0" }}>¿Querés sumar tu negocio?</h3>
                <button onClick={() => window.open(`https://wa.me/${ADMIN_USER}`)} style={{ background: "#22c55e", color: "#fff", padding: "12px 25px", borderRadius: "10px", fontWeight: "bold", border: "none", display: "flex", alignItems: "center", gap: "10px", margin: "0 auto" }}>
                   <MessageCircle size={20}/> CONTACTAME
                </button>
             </div>

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
