import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, LogOut, MapPin, MessageCircle, User, Store } from "lucide-react";

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
  const MI_WHATSAPP = "5492966694462"; 

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", discount_short: "10%", image_url: "", lat: -50.34, lng: -72.27 });

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const cleanPhone = (phone: string) => {
    let num = phone.replace(/\D/g, ''); 
    if (num.startsWith('0')) num = num.substring(1); 
    if (!num.startsWith('549')) num = '549' + num; 
    return num;
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Datos incorrectos");
    else { setView("admin"); fetchData(); }
  };

  const activeMap = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLoc({lat: p.coords.latitude, lng: p.coords.longitude}),
      (err) => alert("Por favor activá el GPS para ver locales cerca"),
      { enableHighAccuracy: true }
    );
  };

  if (view === "admin") {
    return (
      <div style={{ padding: "15px", background: "#f0f2f5", minHeight: "100vh", color: "#333", paddingBottom: "100px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{margin:0}}>Panel de Control</h2>
          <button onClick={() => { supabase.auth.signOut(); setView("user"); }} style={{ background: "#ff4757", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "8px" }}>SALIR</button>
        </header>
        {businesses.map(b => (
          <div key={b.id} style={{ background: "#fff", padding: "12px", borderRadius: "10px", marginBottom: "10px", border: "1px solid #ddd" }}>
            <b>{b.name}</b> <span style={{color:'red'}}>{b.discount_short}</span>
          </div>
        ))}
        <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#011627", color: "#fff", border: "none", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold", zIndex: 100 }}>+ AGREGAR LOCAL</button>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, padding: "20px", overflowY: "auto", color: "#000" }}>
            <h2>Nuevo Comercio</h2>
            <input placeholder="Nombre" onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
            <input placeholder="WhatsApp" onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
            <input placeholder="Descuento (ej: 15%)" onChange={e => setFormData({...formData, discount_short: e.target.value})} style={inputStyle} />
            <textarea placeholder="Descripción" onChange={e => setFormData({...formData, offer_es: e.target.value})} style={{...inputStyle, height: "80px"}} />
            <input placeholder="URL de la Foto" onChange={e => setFormData({...formData, image_url: e.target.value})} style={inputStyle} />
            <button onClick={() => navigator.geolocation.getCurrentPosition(p => setFormData({...formData, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "10px", border: "none", marginBottom: "10px" }}>📍 USAR MI UBICACIÓN ACTUAL</button>
            <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "15px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>GUARDAR LOCAL</button>
            <button onClick={() => setShowForm(false)} style={{ width: "100%", marginTop: "10px", background: "none", border: "none" }}>Cerrar</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER SUPERIOR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4A90D9", fontWeight: "bold" }} onClick={() => setDeferredPrompt(null)}>
          <Download size={18}/> APP
        </div>
        <button onClick={() => setView("login")} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
          <User size={14}/> LOGIN ADMIN
        </button>
      </div>

      <header style={{ padding: "30px 20px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>CALAFATE PLUS</h1>
        <p style={{ color: "#4A90D9", marginTop: "5px", letterSpacing: "2px" }}>DESCUENTOS EN EL GLACIAR</p>
      </header>

      {/* BANNER CONTACTO */}
      <div style={{ margin: "0 15px 20px 15px", background: "#FFD700", borderRadius: "20px", padding: "20px", textAlign: "center", color: "#000" }}>
        <h2 style={{ margin: "0 0 5px 0", fontSize: "20px", fontWeight: "bold" }}>🚀 PUBLICITÁ TU NEGOCIO</h2>
        <button 
          onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola!%20Quiero%20sumar%20mi%20negocio`)}
          style={{ background: "#000", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "10px", fontWeight: "bold", marginTop: "10px" }}
        >
          CONTACTARME
        </button>
      </div>

      {/* BOTÓN MAPA */}
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <button onClick={activeMap} style={{ background: "#4A90D9", color: "#fff", border: "none", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 15px rgba(74,144,217,0.4)" }}>
          📍 VER DESCUENTOS CERCA
        </button>
      </div>

      {/* EL MAPA SI ESTÁ ACTIVO */}
      {userLoc && (
        <div style={{ height: "300px", width: "92%", margin: "0 auto 25px auto", borderRadius: "20px", overflow: "hidden", border: "2px solid #4A90D9" }}>
          <MapContainer center={[userLoc.lat, userLoc.lng]} zoom={14} style={{ height: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {businesses.map(biz => (
              <Marker key={biz.id} position={[biz.lat, biz.lng]} icon={iconBiz}>
                <Popup><b>{biz.name}</b><br/>{biz.discount_short}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* LISTA DE LOCALES */}
      <main style={{ padding: "0 15px 100px 15px", maxWidth: "600px", margin: "0 auto" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", marginBottom: "20px", border: "1px solid rgba(74,144,217,0.2)", overflow: "hidden", position: "relative" }}>
            
            <div style={{ position: "absolute", top: "15px", right: "15px", background: "#e74c3c", color: "#fff", padding: "8px 15px", borderRadius: "50px", fontWeight: "bold", fontSize: "18px", zIndex: 5, boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              {biz.discount_short || "10%"}
            </div>

            {/* IMAGEN DEL LOCAL O PLACEHOLDER ELEGANTE */}
            {biz.image_url ? (
              <img src={biz.image_url} alt={biz.name} style={{ width: "100%", height: "200px", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "150px", background: "linear-gradient(45deg, #022b4d, #011627)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Store size={50} color="rgba(74,144,217,0.3)" />
              </div>
            )}

            <div style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "22px" }}>{biz.name}</h3>
              <p style={{ fontSize: "14px", color: "#ccc", marginBottom: "20px" }}>{biz.offer_es}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  <MapPin size={16}/> MAPA
                </button>
                <button onClick={() => window.open(`https://wa.me/${cleanPhone(biz.phone)}`)} style={{ background: "#25D366", color: "#fff", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  <MessageCircle size={16}/> WHATSAPP
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* MODAL DE LOGIN */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{textAlign: "center", marginBottom: "20px"}}>Acceso Comerciantes</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Clave" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "30px", color: "#fff", background: "none", border: "none", opacity: 0.5 }}>Volver atrás</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #ddd", fontSize: "16px", color: "#000" };
