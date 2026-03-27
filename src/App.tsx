import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, Save, LogOut, MapPin, MessageCircle } from "lucide-react";

// Icono personalizado para el mapa
const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

// Imagen por defecto si el local no tiene foto
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=400&auto=format&fit=crop";

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login">("user");
  const [showForm, setShowForm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";
  const MI_WHATSAPP = "5492966694462"; // TU NÚMERO REAL

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", discount_short: "10%", image_url: "", lat: -50.34, lng: -72.27 });

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

  const cleanPhone = (phone: string) => {
    let num = phone.replace(/\D/g, ''); 
    if (num.startsWith('0')) num = num.substring(1); 
    if (!num.startsWith('549')) num = '549' + num; 
    return num;
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Datos incorrectos");
    else { if (email === ADMIN_EMAIL) setView("admin"); fetchData(); }
  };

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else {
      alert("En iPhone: Compartir -> 'Agregar a inicio'. En Android: 3 puntos -> 'Instalar'.");
    }
  };

  // --- VISTA ADMIN (PANEL CACHI) ---
  if (view === "admin") {
    return (
      <div style={{ padding: "15px", background: "#f8f9fa", minHeight: "100vh", color: "#333", paddingBottom: "100px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{color: "#011627", margin: 0}}>Panel Admin Cachi</h2>
          <button onClick={() => { supabase.auth.signOut(); setView("user"); }} style={{ background: "none", border: "none", cursor: "pointer" }}><LogOut color="red"/></button>
        </header>
        {businesses.map(b => (
          <div key={b.id} style={{ background: "#fff", padding: "12px", borderRadius: "12px", marginBottom: "10px", border: "1px solid #ddd", display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={b.image_url || DEFAULT_IMAGE} alt={b.name} style={{width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover"}} />
            <div>
              <b style={{fontSize: "16px"}}>{b.name}</b> <span style={{color: "#e74c3c", fontWeight: "bold"}}>({b.discount_short})</span>
              <div style={{fontSize: "12px", color: "#666"}}>{b.phone}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#011627", color: "#fff", border: "none", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", cursor: "pointer", zIndex: 100 }}>+ NUEVO LOCAL</button>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, padding: "25px", color: "#000", overflowY: "auto" }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><h2>Cargar Local</h2><button onClick={() => setShowForm(false)} style={{border: "none", background: "none"}}><X size={30}/></button></div>
            <input placeholder="Nombre del Comercio" onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
            <input placeholder="WhatsApp (Ej: 2966123456)" onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
            <input placeholder="Descuento Corto (Ej: 10%, 2x1)" onChange={e => setFormData({...formData, discount_short: e.target.value})} style={inputStyle} />
            <textarea placeholder="Descripción del descuento" onChange={e => setFormData({...formData, offer_es: e.target.value})} style={{...inputStyle, height: "80px"}} />
            <input placeholder="URL de la Foto (Link de FB/IG)" onChange={e => setFormData({...formData, image_url: e.target.value})} style={inputStyle} />
            <button onClick={() => navigator.geolocation.getCurrentPosition(p => setFormData({...formData, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", marginBottom: "15px", fontWeight: "bold" }}>📍 CAPTURAR UBICACIÓN ACTUAL</button>
            <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "18px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "18px" }}>GUARDAR Y PUBLICAR</button>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA PÚBLICO (USUARIO) ---
  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* BANNER INSTALACIÓN */}
      <div style={{ background: "#4A90D9", padding: "12px", textAlign: "center", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }} onClick={installApp}>
        <Download size={18} style={{marginRight: "8px", marginBottom: "-3px"}}/> INSTALAR APP CALAFATE PLUS
      </div>

      <header style={{ padding: "30px 20px", textAlign: "center", background: "linear-gradient(180deg, #022b4d 0%, #011627 100%)" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "bold", letterSpacing: "1px" }}>CALAFATE PLUS</h1>
        <p onClick={() => setView("login")} style={{ color: "#4A90D9", marginTop: "5px", fontSize: "14px", cursor: "pointer" }}>Descuentos en el Glaciar</p>
      </header>

      {/* BANNER CONTACTO (SÚPER LLAMATIVO) */}
      <div style={{ margin: "0 15px 25px 15px", background: "#FFD700", borderRadius: "20px", padding: "25px", textAlign: "center", color: "#000", boxShadow: "0 4px 15px rgba(255,215,0,0.3)" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "bold" }}>🚀 PUBLICITÁ TU NEGOCIO</h2>
        <p style={{ margin: "0 0 20px 0", fontSize: "15px", fontWeight: "500" }}>Llegá a miles de turistas y vecinos</p>
        <button 
          onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola!%20Quiero%20sumar%20mi%20negocio%20a%20Calafate%20Plus`)}
          style={{ background: "#000", color: "#fff", border: "none", padding: "14px 40px", borderRadius: "12px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)" }}
        >
          CONTACTARME
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => setUserLoc({lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ background: "#4A90D9", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 2px 10px rgba(74,144,217,0.3)" }}>
          📍 VER DESCUENTOS CERCA
        </button>
      </div>

      <main style={{ padding: "0 15px 100px 15px" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "20px", marginBottom: "20px", border: "1px solid rgba(74,144,217,0.2)", overflow: "hidden", position: "relative" }}>
            
            {/* CÍRCULO DE DESCUENTO LLAMATIVO */}
            <div style={{ position: "absolute", top: "15px", right: "15px", background: "#e74c3c", color: "#fff", width: "60px", height: "60px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", fontSize: "18px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", zIndex: 10 }}>
              {biz.discount_short || "10%"}
            </div>

            {/* FOTO DEL LOCAL */}
            <img src={biz.image_url || DEFAULT_IMAGE} alt={biz.name} style={{ width: "100%", height: "180px", objectFit: "cover", borderBottom: "1px solid rgba(74,144,217,0.2)" }} />

            <div style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "bold" }}>{biz.name}</h3>
              <p style={{ fontSize: "14px", color: "#ccc", marginBottom: "20px", lineHeight: "1.5" }}>{biz.offer_es}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button onClick={() => window.open(`http://googleusercontent.com/maps.google.com/3{biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  <MapPin size={16}/> MAPA
                </button>
                <button onClick={() => window.open(`https://wa.me/${cleanPhone(biz.phone)}`)} style={{ background: "#25D366", color: "#fff", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  <MessageCircle size={16}/> WHATSAPP
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* LOGIN MODAL */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{textAlign: "center", marginBottom: "20px"}}>Acceso Admin</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Clave" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "30px", color: "#fff", background: "none", border: "none", opacity: 0.5, cursor: "pointer" }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #ddd", fontSize: "16px", color: "#000" };
