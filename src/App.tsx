import React, { useState, useEffect, useMemo, CSSProperties } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, MessageCircle, Camera, Search, Star, Globe, LogOut, DollarSign } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- LÓGICA DE ICONOS PERSONALIZADOS ---
const getCustomIcon = (category: string) => {
  let color = "#3b82f6"; 
  let iconHtml = "📍";

  if (category === "Gastronomía") { color = "#ef4444"; iconHtml = "🍴"; }
  if (category === "Panadería") { color = "#f59e0b"; iconHtml = "🥖"; }
  if (category === "Láser" || category === "Servicios") { color = "#06b6d4"; iconHtml = "🛠️"; }
  if (category === "Emprendedores") { color = "#8b5cf6"; iconHtml = "🚀"; }
  if (category === "Regalos") { color = "#ec4899"; iconHtml = "🎁"; }
  if (category === "Excursiones") { color = "#10b981"; iconHtml = "🏔️"; }

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);">
             <div style="transform: rotate(45deg); font-size: 18px;">${iconHtml}</div>
           </div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 38]
  });
};

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "login" | "scanner">("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const CATEGORIES = ["Todos", "Gastronomía", "Panadería", "Láser", "Emprendedores", "Regalos", "Excursiones"];

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('is_featured', { ascending: false });
    if (data) setBusinesses(data);
  };

  const processPayment = async (biz: any) => {
    const now = new Date();
    const currentExpiry = (biz.expires_at && new Date(biz.expires_at) > now) ? new Date(biz.expires_at) : now;
    currentExpiry.setDate(currentExpiry.getDate() + 30);
    await supabase.from("businesses").update({ expires_at: currentExpiry.toISOString().split('T')[0], is_active: true }).eq("id", biz.id);
    fetchData();
  };

  const openWhatsApp = (phone: string) => {
    let cleanNumber = phone.replace(/\D/g, "");
    if (!cleanNumber.startsWith("54")) cleanNumber = "549" + cleanNumber;
    window.open(`https://wa.me/${cleanNumber}`, "_blank");
  };

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => 
      (catFilter === "Todos" || b.category === catFilter) &&
      (b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [businesses, searchTerm, catFilter]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && currentScannerId) {
      scanner = new Html5QrcodeScanner(currentScannerId, { fps: 10, qrbox: 250 }, false);
      scanner.render(async (text) => {
        const bizId = currentScannerId.split('-')[1];
        await supabase.from("businesses").update({ clicks_qr: 1 }).eq("id", bizId); // Simple track
        window.location.href = text;
        scanner?.clear();
        setView("user");
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view, currentScannerId]);

  // ESTILOS
  const bizCard: CSSProperties = { background: "#0a1929", borderRadius: "25px", marginBottom: "25px", padding: "20px", border: "1px solid #1e293b", position: "relative" };
  const discountCircle: CSSProperties = { position: "absolute", top: "20px", right: "20px", background: "#ef4444", color: "#fff", width: "55px", height: "55px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "12px", textAlign: "center", lineHeight: "1.1", zIndex: 10 };

  if (view === "scanner") return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h2 style={{color:"#fff", marginBottom:"20px"}}>Escaneando Promo...</h2>
      <div id={currentScannerId!} style={{ width: "85%", borderRadius: "20px", overflow: "hidden" }}></div>
      <button onClick={() => setView("user")} style={{ marginTop: "30px", background: "#ef4444", color: "#fff", border: "none", padding: "15px 40px", borderRadius: "12px", fontWeight: "bold" }}>CANCELAR</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" />
        {isAdmin ? <LogOut size={24} color="#ef4444" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin");}} /> : 
        <button onClick={() => setView("login")} style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid #3b82f6", padding: "6px 16px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>ADMIN</button>}
      </div>

      <header style={{ textAlign: "center", marginBottom: "20px" }}>
        <p style={{ color: "#3b82f6", fontWeight: "900", letterSpacing: "3px", fontSize: "12px", margin: "0 0 5px 0" }}>FULL DESCUENTOS</p>
        <h1 style={{ margin: 0, fontSize: "45px", fontWeight: "900", lineHeight: 0.9 }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
      </header>

      {/* BANNER CONTACTO */}
      <div style={{ background: "#fbbf24", margin: "20px", borderRadius: "25px", padding: "35px 20px", textAlign: "center", color: "#000" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 15px 0" }}>¿QUERÉS SUMAR TU LOCAL?</h2>
        <button onClick={() => openWhatsApp("2966694462")} style={{ background: "#000", color: "#fff", padding: "12px 30px", borderRadius: "30px", border: "none", fontWeight: "900", fontSize: "14px" }}>CONTACTARME</button>
      </div>

      {/* MAPA DINÁMICO */}
      <div style={{ height: "250px", margin: "20px", borderRadius: "25px", overflow: "hidden", border: "2px solid #1e293b" }}>
        <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {filteredBiz.map(b => b.lat && (
            <Marker key={b.id} position={[b.lat, b.lng]} icon={getCustomIcon(b.category)}>
              <Popup><div style={{color:"#000"}}><b>{b.name}</b><br/>{b.discount_short}</div></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* BUSCADOR Y CATEGORÍAS */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ background: "#0f172a", borderRadius: "15px", padding: "12px 15px", display: "flex", alignItems: "center", marginBottom: "15px", border: "1px solid #1e293b" }}>
          <Search size={20} color="#64748b" />
          <input placeholder="Buscar por nombre..." onChange={e => setSearchTerm(e.target.value)} style={{ background: "none", border: "none", color: "#fff", marginLeft: "10px", width: "100%", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ background: c === catFilter ? "#3b82f6" : "#1e293b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "12px", whiteSpace: "nowrap", fontWeight: "bold" }}>{c}</button>
          ))}
        </div>
      </div>

      {/* LISTA DE LOCALES */}
      <main style={{ padding: "20px" }}>
        {filteredBiz.map(biz => (
          <div key={biz.id} style={bizCard}>
            <div style={discountCircle}>{biz.discount_short || "10% OFF"}</div>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "24px", fontWeight: "900" }}>{biz.name}</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 20px 0" }}>{biz.offer_es}</p>
            
            <button onClick={() => {setCurrentScannerId(`r-${biz.id}`); setView("scanner");}} style={{ background: "#22c55e", color: "#fff", width: "100%", padding: "14px", borderRadius: "15px", border: "none", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
              <Camera size={20}/> ACCEDER A LA PROMO
            </button>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "15px", border: "none", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>📍 MAPA</button>
              <button onClick={() => openWhatsApp(biz.phone)} style={{ background: "none", border: "1.5px solid #22c55e", color: "#22c55e", padding: "12px", borderRadius: "15px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                <MessageCircle size={18}/> WHATSAPP
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* PANEL ADMIN */}
      {isAdmin && (
        <div style={{ background: "rgba(34, 197, 94, 0.05)", margin: "20px", borderRadius: "25px", padding: "20px", border: "1px solid #22c55e" }}>
          <h3 style={{ marginTop: 0, color: "#22c55e" }}>Gestión Maestra</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", color: "#64748b" }}>
                <th style={{ textAlign: "left", padding: "10px" }}>Local</th>
                <th style={{ textAlign: "center", padding: "10px" }}>Días</th>
                <th style={{ textAlign: "right", padding: "10px" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(biz => {
                const daysLeft = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                return (
                  <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "12px 10px" }}>{biz.name}</td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "900", color: daysLeft > 0 ? "#22c55e" : "#ef4444" }}>{daysLeft}d</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <button onClick={() => processPayment(biz)} style={{ background: "#22c55e", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>+30 DÍAS</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* LOGIN MODAL */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#010b14", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "85%", maxWidth: "350px", textAlign: "center" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "900", marginBottom: "20px" }}>Acceso Admin</h2>
            <input placeholder="Usuario" onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "15px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
            <input type="password" placeholder="Clave" onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "15px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff", boxSizing: "border-box" }} />
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); localStorage.setItem("cachi_admin","true"); setView("user");}else{alert("Credenciales incorrectas");}}} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "16px", borderRadius: "15px", border: "none", fontWeight: "900", marginTop: "10px" }}>INGRESAR AL PANEL</button>
            <button onClick={()=>setView("user")} style={{ marginTop: "20px", background: "none", border: "none", color: "#64748b" }}>Volver a la App</button>
          </div>
        </div>
      )}
    </div>
  );
}
