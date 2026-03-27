import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Lock, LogOut, Bell, PlusCircle, Trash2, Save } from "lucide-react";

// Configuración de iconos
const getIcon = (cat: string) => {
  let color = "blue";
  if (cat === "Gastronomía") color = "red";
  if (cat === "Láser") color = "orange";
  if (cat === "Ropa") color = "violet";
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  });
};

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login">("user");
  const [session, setSession] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // Login & Form
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";

  useEffect(() => {
    fetchData();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user.email === ADMIN_EMAIL) setView("admin");
    });
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*");
    if (data) setBusinesses(data);
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Error: " + error.message);
    else {
      setSession(data.session);
      setView(email === ADMIN_EMAIL ? "admin" : "user");
    }
  };

  const trackClick = async (id: string, col: string) => {
    const biz = businesses.find(b => b.id === id);
    await supabase.from("businesses").update({ [col]: (biz[col] || 0) + 1 }).eq("id", id);
  };

  // --- VISTA ADMIN ---
  if (view === "admin") {
    return (
      <div style={{ padding: "20px", background: "#f8f9fa", minHeight: "100vh", color: "#333" }}>
        <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2>⚙️ Panel Cachi</h2>
          <button onClick={() => { supabase.auth.signOut(); setView("user"); }} style={{ border: "none", background: "none" }}><LogOut/></button>
        </header>

        <section style={{ background: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
          <h4 style={{ color: "#d9534f" }}><Bell size={18}/> Vencimientos próximos</h4>
          {businesses.filter(b => {
            const dias = Math.ceil((new Date(b.valid_until).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            return dias <= 5;
          }).map(b => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <span>{b.name}</span>
              <button onClick={() => window.open(`https://wa.me/${b.phone}?text=Hola%20${b.name},%20tu%20anuncio%20en%20Calafate%20Plus%20vence%20pronto!`)} 
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "8px" }}>Cobrar</button>
            </div>
          ))}
        </section>

        <h3>Locales Activos</h3>
        {businesses.map(b => (
          <div key={b.id} style={{ background: "#fff", padding: "10px", borderRadius: "10px", marginBottom: "10px", fontSize: "14px" }}>
            <b>{b.name}</b> | WA: {b.clicks_wa || 0} | QR: {b.clicks_qr || 0}
          </div>
        ))}
        
        <button onClick={() => setView("user")} style={{ width: "100%", marginTop: "20px", padding: "15px", borderRadius: "10px", border: "none" }}>Ver como Usuario</button>
      </div>
    );
  }

  // --- VISTA PÚBLICA ---
  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff" }}>
      <header style={{ 
        height: "250px", 
        backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1513032334033-02f8420076a0?auto=format&fit=crop&w=800&q=80')", 
        backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"
      }}>
        <div style={{ position: "absolute", top: "15px", right: "15px" }}>
          <button onClick={() => setView("login")} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "10px", borderRadius: "50%" }}><Lock size={20}/></button>
        </div>
        <h1 style={{ fontSize: "38px", margin: 0, textShadow: "2px 2px 8px #000" }}>CALAFATE PLUS</h1>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => setUserLoc({lat: p.coords.latitude, lng: p.coords.longitude}))} 
          style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "12px 25px", borderRadius: "30px", fontWeight: "bold", marginTop: "15px" }}>
          📍 ACTIVAR MAPA
        </button>
      </header>

      {userLoc && (
        <div style={{ height: "300px", width: "100%" }}>
          <MapContainer center={[userLoc.lat, userLoc.lng]} zoom={14} style={{ height: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {businesses.filter(b => new Date(b.valid_until) > new Date()).map(biz => (
              <Marker key={biz.id} position={[biz.lat, biz.lng]} icon={getIcon(biz.category)}>
                <Popup><b>{biz.name}</b><br/>{biz.discount_pct}% OFF</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Banner Venta */}
      <div style={{ background: "gold", color: "#000", margin: "15px", padding: "20px", borderRadius: "20px", textAlign: "center" }}>
        <h3 style={{ margin: 0 }}>🚀 PUBLICITÁ TU NEGOCIO</h3>
        <button onClick={() => window.open('https://wa.me/5492902XXXXXX')} style={{ background: "#000", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "10px", fontWeight: "bold", marginTop: "10px" }}>CONTACTARME</button>
      </div>

      <main style={{ padding: "15px" }}>
        {businesses.filter(b => new Date(b.valid_until) > new Date()).map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "25px", padding: "20px", marginBottom: "15px", border: "1px solid rgba(74,144,217,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{biz.name}</h3>
              <span style={{ color: "gold", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
            </div>
            <p style={{ fontSize: "12px", color: "#4A90D9" }}>🏷️ {biz.category}</p>
            <p>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => { trackClick(biz.id, 'clicks_maps'); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`) }} style={{ background: "#fff", color: "#000", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>MAPA</button>
              <button onClick={() => { trackClick(biz.id, 'clicks_wa'); window.open(`https://wa.me/549${biz.phone}`) }} style={{ background: "#25D366", color: "#fff", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>WHATSAPP</button>
            </div>
          </div>
        ))}
      </main>

      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px" }}>
          <h2>Ingreso Privado</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px", margin: "10px 0" }} />
          <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "12px", margin: "10px 0" }} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "10px" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ width: "100%", marginTop: "10px", background: "none", color: "#fff", border: "none" }}>VOLVER</button>
        </div>
      )}
    </div>
  );
}
