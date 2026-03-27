import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Smartphone, Download, MapPin, X, Save, MessageCircle, LogOut } from "lucide-react";

// Icono para el mapa
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
    // Traemos TODOS los locales de la tabla sin filtros para que no aparezca vacía
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Datos incorrectos");
    else { if (email === ADMIN_EMAIL) setView("admin"); fetchData(); }
  };

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("En iPhone: Compartir -> Agregar a inicio. En Android: 3 puntos -> Instalar.");
    }
  };

  // --- VISTA ADMIN (PANEL CACHI) ---
  if (view === "admin") {
    return (
      <div style={{ padding: "15px", background: "#f8f9fa", minHeight: "100vh", color: "#333", paddingBottom: "100px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2>Panel Admin</h2>
          <button onClick={() => { supabase.auth.signOut(); setView("user"); }} style={{ background: "none", border: "none" }}><LogOut color="red"/></button>
        </header>
        <h3>Locales: {businesses.length}</h3>
        {businesses.map(b => (
          <div key={b.id} style={{ background: "#fff", padding: "10px", borderRadius: "10px", marginBottom: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <b>{b.name}</b>
          </div>
        ))}
        <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#003366", color: "#fff", border: "none", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold" }}>+ NUEVO LOCAL</button>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, padding: "25px", overflowY: "auto", color: "#000" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><h2>Cargar Local</h2><button onClick={() => setShowForm(false)} style={{ border: "none", background: "none" }}><X size={30}/></button></div>
            <input placeholder="Nombre" onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
            <input placeholder="WhatsApp (Ej: 5492902...)" onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
            <textarea placeholder="Descripción del descuento" onChange={e => setFormData({...formData, offer_es: e.target.value})} style={{...inputStyle, height: "100px"}} />
            <button onClick={() => navigator.geolocation.getCurrentPosition(p => setFormData({...formData, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", marginBottom: "15px", fontWeight: "bold" }}>📍 UBICACIÓN ACTUAL</button>
            <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "18px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>GUARDAR LOCAL</button>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA PÚBLICO (USUARIO) ---
  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      <div style={{ background: "#4A90D9", padding: "12px", textAlign: "center", fontWeight: "bold" }} onClick={installApp}>
        <Download size={18} style={{marginRight: "8px"}}/> INSTALAR APP CALAFATE PLUS
      </div>

      <header style={{ height: "180px", background: "#011627", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", borderBottom: "2px solid #4A90D9" }}>
         {/* Botón invisible para entrar al Admin */}
        <div onClick={() => setView("login")} style={{ position: "absolute", top: "60px", right: "20px", width: "40px", height: "40px", opacity: 0.1 }}>.</div>
        <h1 style={{ fontSize: "28px", margin: 0 }}>CALAFATE PLUS</h1>
        <p style={{ margin: "5px 0", color: "#4A90D9" }}>Descuentos en el Glaciar</p>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => setUserLoc({lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ background: "#4A90D9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", marginTop: "10px" }}>📍 VER MAPA</button>
      </header>

      {userLoc && (
        <div style={{ height: "250px", width: "100%" }}>
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

      <main style={{ padding: "15px" }}>
        {businesses.length === 0 && <p style={{textAlign: "center", opacity: 0.5}}>Cargando locales...</p>}
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "15px", padding: "15px", marginBottom: "15px", border: "1px solid #4A90D9" }}>
            <h3 style={{ margin: 0 }}>{biz.name}</h3>
            <p style={{ fontSize: "14px", margin: "10px 0" }}>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>MAPA</button>
              <button onClick={() => window.open(`https://wa.me/${biz.phone}`)} style={{ background: "#25D366", color: "#fff", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>WHATSAPP</button>
            </div>
          </div>
        ))}
      </main>

      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2>Acceso Maestro</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Clave" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "10px" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "20px", color: "#fff", background: "none", border: "none" }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "none", fontSize: "16px", color: "#000" };
