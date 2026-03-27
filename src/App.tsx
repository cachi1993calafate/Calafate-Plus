import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Smartphone, Download, MapPin, X, Save, MessageCircle, LogOut, Send } from "lucide-react";

const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login">("user");
  const [showForm, setShowForm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";
  const MI_WHATSAPP = "5492902413151"; // <-- Confirmame si este es tu número

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", lat: -50.34, lng: -72.27 });

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.email === ADMIN_EMAIL) setView("admin");
      fetchData();
    };
    init();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Datos incorrectos");
    else { if (email === ADMIN_EMAIL) setView("admin"); fetchData(); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER PRINCIPAL */}
      <header style={{ padding: "40px 20px", textAlign: "center", background: "linear-gradient(180deg, #022b4d 0%, #011627 100%)", position: "relative" }}>
        <div onClick={() => setView("login")} style={{ position: "absolute", top: "10px", right: "10px", width: "30px", height: "30px", opacity: 0.1 }}>.</div>
        <img src="/logo512.png" alt="Logo" style={{ width: "120px", marginBottom: "15px" }} />
        <h1 style={{ margin: 0, fontSize: "28px", letterSpacing: "1px" }}>CALAFATE PLUS</h1>
        <p style={{ color: "#4A90D9", marginTop: "5px" }}>Descuentos en el Glaciar</p>
      </header>

      {/* BANNER PUBLICITARIO (ESTILO TU FOTO) */}
      <div style={{ margin: "0 15px 20px 15px", background: "#FFD700", borderRadius: "20px", padding: "20px", textAlign: "center", color: "#000" }}>
        <h2 style={{ margin: "0 0 10px 0", fontSize: "20px" }}>🚀 PUBLICITÁ TU NEGOCIO</h2>
        <p style={{ margin: "0 0 15px 0", fontSize: "14px", fontWeight: "bold" }}>Llegá a más turistas y vecinos</p>
        <button 
          onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola!%20Quiero%20sumar%20mi%20negocio%20a%20Calafate%20Plus`)}
          style={{ background: "#000", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}
        >
          CONTACTARME
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => setUserLoc({lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ background: "#4A90D9", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "50px", fontWeight: "bold" }}>
          📍 ACTIVAR MAPA
        </button>
      </div>

      {userLoc && (
        <div style={{ height: "250px", width: "90%", margin: "0 auto 20px auto", borderRadius: "15px", overflow: "hidden" }}>
          <MapContainer center={[userLoc.lat, userLoc.lng]} zoom={14} style={{ height: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {businesses.map(biz => (
              <Marker key={biz.id} position={[biz.lat, biz.lng]} icon={iconBiz}>
                <Popup><b>{biz.name}</b></Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <main style={{ padding: "0 15px 100px 15px" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "15px", padding: "15px", marginBottom: "15px", border: "1px solid rgba(74,144,217,0.3)" }}>
            <h3 style={{ margin: "0 0 5px 0", color: "#fff" }}>{biz.name}</h3>
            <p style={{ fontSize: "14px", color: "#ccc", marginBottom: "15px" }}>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => window.open(`http://maps.google.com/?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>VER MAPA</button>
              <button onClick={() => window.open(`https://wa.me/${biz.phone}`)} style={{ background: "#25D366", color: "#fff", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>WHATSAPP</button>
            </div>
          </div>
        ))}
      </main>

      {/* LOGIN MODAL */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{textAlign: "center"}}>Panel Admin</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Clave" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "20px", color: "#fff", background: "none", border: "none", opacity: 0.5 }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "none", fontSize: "16px", color: "#000" };
