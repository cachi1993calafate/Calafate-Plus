import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { X, MapPin, MessageCircle, Store, Camera } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "admin" | "login" | "scanner">("user");
  const [showForm, setShowForm] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";
  const MI_WHATSAPP = "5492966694462"; 

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", discount_short: "10%", image_url: "", lat: -50.34, lng: -72.27 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user.email === ADMIN_EMAIL) setView("admin");
    });
    fetchData();
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner") {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        window.location.href = text;
        if (scanner) scanner.clear();
      }, () => {});
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Error clearing scanner", e));
      }
    };
  }, [view]);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const cleanPhone = (phone: string) => {
    let num = phone.replace(/\D/g, ''); 
    if (!num.startsWith('549')) num = '549' + num; 
    return num;
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Error: " + error.message);
    else { setSession(data.session); setView("admin"); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView("user");
  };

  if (view === "admin" || (session?.user.email === ADMIN_EMAIL && view !== "scanner")) {
    return (
      <div style={{ padding: "15px", background: "#f0f2f5", minHeight: "100vh", color: "#333", paddingBottom: "100px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{margin:0}}>Mi Panel 🏔️</h2>
          <button onClick={handleLogout} style={{ background: "#ff4757", color: "#fff", border: "none", padding: "10px 15px", borderRadius: "10px", fontWeight: "bold" }}>SALIR</button>
        </header>
        {businesses.map(b => (
          <div key={b.id} style={{ background: "#fff", padding: "12px", borderRadius: "12px", marginBottom: "10px", border: "1px solid #ddd", display: "flex", justifyContent: "space-between" }}>
            <b>{b.name}</b> <span>{b.discount_short}</span>
          </div>
        ))}
        <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", background: "#011627", color: "#fff", border: "none", padding: "20px 40px", borderRadius: "50px", fontWeight: "bold", boxShadow: "0 10px 20px rgba(0,0,0,0.3)", zIndex: 100 }}>+ NUEVO COMERCIO</button>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, padding: "20px", overflowY: "auto", color: "#000" }}>
            <div style={{display:"flex", justifyContent:"space-between"}}><h2>Cargar Datos</h2><X onClick={()=>setShowForm(false)} size={30}/></div>
            <input placeholder="Nombre del local" onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
            <input placeholder="WhatsApp (Ej: 2966123456)" onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
            <input placeholder="Descuento (ej: 15% OFF)" onChange={e => setFormData({...formData, discount_short: e.target.value})} style={inputStyle} />
            <textarea placeholder="Descripción del beneficio" onChange={e => setFormData({...formData, offer_es: e.target.value})} style={{...inputStyle, height: "80px"}} />
            <input placeholder="URL de la Foto" onChange={e => setFormData({...formData, image_url: e.target.value})} style={inputStyle} />
            <button onClick={() => navigator.geolocation.getCurrentPosition(p => setFormData({...formData, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", marginBottom: "15px", fontWeight: "bold" }}>📍 CLAVAR UBICACIÓN AQUÍ</button>
            <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "18px", borderRadius: "15px", border: "none", fontWeight: "bold" }}>GUARDAR Y PUBLICAR</button>
          </div>
        )}
      </div>
    );
  }

  if (view === "scanner") {
    return (
      <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "20px", textAlign: "center" }}>
        <h2 style={{marginBottom:"20px"}}>Escaneá el QR</h2>
        <div id="reader" style={{ width: "100%", borderRadius: "20px", overflow: "hidden" }}></div>
        <button onClick={() => setView("user")} style={{ marginTop: "30px", background: "#4A90D9", border: "none", color: "#fff", padding: "15px 40px", borderRadius: "12px" }}>VOLVER</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" }}>
        <div style={{ color: "#FFD700", fontWeight: "900" }}>FULL DESCUENTOS</div>
        <button onClick={() => setView("login")} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "6px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>INGRESAR</button>
      </div>
      <header style={{ padding: "30px 20px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900" }}>CALAFATE<br/><span style={{color: "#FFD700"}}>PLUS</span></h1>
        <p style={{ color: "#4A90D9", marginTop: "10px", fontSize: "14px", fontWeight: "bold" }}>FULL DESCUENTOS EN LA CIUDAD</p>
      </header>
      <div style={{ margin: "15px", background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", borderRadius: "25px", padding: "25px", textAlign: "center", color: "#000" }}>
        <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "900" }}>¿QUERÉS VENDER MÁS?</h2>
        <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}`)} style={{ background: "#000", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "12px", fontWeight: "bold", marginTop: "15px" }}>CONTACTARME</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <button onClick={() => setView("scanner")} style={{ background: "#fff", color: "#011627", border: "none", padding: "18px 35px", borderRadius: "50px", fontWeight: "900", display: "inline-flex", alignItems: "center", gap: "10px" }}>
          <Camera size={24}/> ESCANEAR QR
        </button>
      </div>
      <main style={{ padding: "0 15px 100px 15px" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "25px", marginBottom: "25px", border: "1px solid rgba(74,144,217,0.2)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: "15px", right: "15px", background: "#e74c3c", color: "#fff", padding: "10px 15px", borderRadius: "50px", fontWeight: "900", fontSize: "20px" }}>{biz.discount_short}</div>
            {biz.image_url && <img src={biz.image_url} alt={biz.name} style={{ width: "100%", height: "200px", objectFit: "cover" }} />}
            <div style={{ padding: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "24px" }}>{biz.name}</h3>
              <p style={{ color: "#bbb", margin: "10px 0 20px 0" }}>{biz.offer_es}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "900" }}>MAPA</button>
                <button onClick={() => window.open(`https://wa.me/${cleanPhone(biz.phone)}`)} style={{ background: "#25D366", color: "#fff", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "900" }}>WHATSAPP</button>
              </div>
            </div>
          </div>
        ))}
      </main>
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{textAlign: "center", marginBottom: "20px"}}>Acceso Maestro</h2>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Clave" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "20px", color: "#fff", background: "none", border: "none", opacity: 0.5 }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
const inputStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #ddd", fontSize: "16px", color: "#000" };
