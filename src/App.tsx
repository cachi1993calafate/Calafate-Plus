import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, MapPin, MessageCircle, Store, Camera, LogOut } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login" | "scanner">("user");
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  
  const MI_WHATSAPP = "5492966694462"; 

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", discount_short: "10%", image_url: "", lat: -50.34, lng: -72.27 });

  useEffect(() => {
    fetchData();
    const logged = localStorage.getItem("cachi_admin");
    if (logged === "true") setIsAdmin(true);
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && currentScannerId) {
      scanner = new Html5QrcodeScanner(currentScannerId, { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        window.location.href = text;
        scanner?.clear();
        setView("user");
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view, currentScannerId]);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const handleManualLogin = () => {
    if (email === "admin@calafateplus.com" && pass === "Cachi2026") {
      setIsAdmin(true);
      localStorage.setItem("cachi_admin", "true");
      setView("user");
    } else {
      alert("Datos incorrectos");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("cachi_admin");
  };

  if (view === "scanner") {
    return (
      <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "20px", textAlign: "center" }}>
        <h2 style={{margin: "20px 0"}}>Escaneá el QR</h2>
        <div id={currentScannerId || "reader"} style={{ width: "100%", borderRadius: "20px", overflow: "hidden" }}></div>
        <style>{`#${currentScannerId || "reader"}__camera_selection { display: none !important; }`}</style>
        <button onClick={() => setView("user")} style={{ marginTop: "30px", background: "#e74c3c", border: "none", color: "#fff", padding: "15px 40px", borderRadius: "12px", fontWeight: "bold" }}>CERRAR</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* BARRA SUPERIOR LIMPIA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" }}>
        <button onClick={() => alert("Instalando...")} style={{ background: "none", border: "none", color: "#4A90D9" }}>
          <Download size={28} />
        </button>
        {isAdmin ? (
          <button onClick={handleLogout} style={{ background: "#ff4757", border: "none", color: "#fff", padding: "8px 15px", borderRadius: "20px", fontWeight: "bold" }}>SALIR</button>
        ) : (
          <button onClick={() => setView("login")} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "8px 20px", borderRadius: "20px", fontWeight: "bold" }}>INGRESAR</button>
        )}
      </div>

      <header style={{ padding: "20px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900" }}>CALAFATE<br/><span style={{color: "#FFD700"}}>PLUS</span></h1>
        <p style={{ color: "#4A90D9", marginTop: "5px", fontWeight: "bold", fontSize: "18px" }}>FULL DESCUENTOS</p>
      </header>

      <div style={{ margin: "15px", background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", borderRadius: "25px", padding: "20px", textAlign: "center", color: "#000" }}>
        <h2 style={{ margin: "0", fontSize: "22px", fontWeight: "900" }}>¿QUERÉS VENDER MÁS?</h2>
        <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}`)} style={{ background: "#000", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "12px", fontWeight: "bold", marginTop: "10px" }}>CONTACTARME</button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button onClick={() => setUserLoc({lat: -50.34, lng: -72.27})} style={{ background: "rgba(74,144,217,0.1)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "10px 20px", borderRadius: "50px", fontWeight: "bold" }}>📍 VER MAPA</button>
      </div>

      {isAdmin && (
        <div style={{padding: "0 20px 20px 20px"}}>
          <button onClick={() => setShowForm(true)} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>+ AGREGAR NUEVO COMERCIO</button>
        </div>
      )}

      <main style={{ padding: "0 15px 100px 15px" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "25px", marginBottom: "25px", border: "1px solid rgba(74,144,217,0.1)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: "15px", right: "15px", background: "#e74c3c", color: "#fff", width: "60px", height: "60px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "18px", zIndex: 10 }}>
              {biz.discount_short}
            </div>
            {biz.image_url && <img src={biz.image_url} style={{ width: "100%", height: "200px", objectFit: "cover" }} />}
            <div style={{ padding: "20px" }}>
              <h3 style={{ margin: "0", fontSize: "24px", fontWeight: "800" }}>{biz.name}</h3>
              <p style={{ color: "#bbb", margin: "10px 0 20px 0" }}>{biz.offer_es}</p>
              
              <button onClick={() => { setCurrentScannerId(`r-${biz.id}`); setView("scanner"); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "15px", borderRadius: "15px", border: "none", fontWeight: "900", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <Camera size={20}/> ACCEDER A LA PROMO
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button onClick={() => window.open(`https://maps.google.com/?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>MAPA</button>
                <button onClick={() => window.open(`https://wa.me/${biz.phone}`)} style={{ background: "none", border: "1px solid #25D366", color: "#25D366", padding: "12px", borderRadius: "12px", fontWeight: "bold" }}>WHATSAPP</button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{textAlign: "center", marginBottom: "20px"}}>Acceso Admin</h2>
          <input placeholder="Usuario" onChange={e => setEmail(e.target.value)} style={inStyle} />
          <input type="password" placeholder="Clave" onChange={e => setPass(e.target.value)} style={inStyle} />
          <button onClick={handleManualLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "20px", color: "#fff", background: "none", border: "none", opacity: 0.5 }}>Cerrar</button>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 999, padding: "20px", overflowY: "auto", color: "#000" }}>
          <div style={{display:"flex", justifyContent:"space-between"}}><h2>Nuevo Local</h2><X onClick={()=>setShowForm(false)} /></div>
          <input placeholder="Nombre" onChange={e => setFormData({...formData, name: e.target.value})} style={inStyle} />
          <input placeholder="WhatsApp" onChange={e => setFormData({...formData, phone: e.target.value})} style={inStyle} />
          <input placeholder="Descuento (ej: 15% OFF)" onChange={e => setFormData({...formData, discount_short: e.target.value})} style={inStyle} />
          <textarea placeholder="Descripción" onChange={e => setFormData({...formData, offer_es: e.target.value})} style={{...inStyle, height: "80px"}} />
          <input placeholder="URL Foto" onChange={e => setFormData({...formData, image_url: e.target.value})} style={inStyle} />
          <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>GUARDAR</button>
        </div>
      )}
    </div>
  );
}
const inStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #ccc", color: "#000" };
