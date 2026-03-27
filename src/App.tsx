import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, LogOut, MapPin, MessageCircle, User, Store, Camera } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login" | "scanner">("user");
  const [showForm, setShowForm] = useState(false);
  
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";
  const MI_WHATSAPP = "5492966694462"; 

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", discount_short: "10%", image_url: "", lat: -50.34, lng: -72.27 });

  useEffect(() => {
    fetchData();
    if (view === "scanner") {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((text) => {
        window.location.href = text;
        scanner.clear();
      }, () => {});
      return () => scanner.clear();
    }
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
    if (error) alert("Datos incorrectos");
    else { setView("admin"); fetchData(); }
  };

  if (view === "admin") {
    return (
      <div style={{ padding: "15px", background: "#f0f2f5", minHeight: "100vh", color: "#333" }}>
        <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{margin: 0}}>Panel Cachi</h2>
          <button onClick={() => setView("user")} style={{ background: "#eee", border: "none", padding: "10px", borderRadius: "8px" }}>VOLVER</button>
        </header>
        {businesses.map(b => (
          <div key={b.id} style={{ background: "#fff", padding: "10px", borderRadius: "10px", marginBottom: "8px", border: "1px solid #ddd" }}>
            <b>{b.name}</b> ({b.discount_short})
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
            <input placeholder="URL Foto" onChange={e => setFormData({...formData, image_url: e.target.value})} style={inputStyle} />
            <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "15px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>GUARDAR</button>
            <button onClick={() => setShowForm(false)} style={{ width: "100%", marginTop: "10px", border: "none", background: "none" }}>Cancelar</button>
          </div>
        )}
      </div>
    );
  }

  if (view === "scanner") {
    return (
      <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "20px", textAlign: "center" }}>
        <h2>Escaneá el código QR</h2>
        <div id="reader" style={{ width: "100%", borderRadius: "15px", overflow: "hidden" }}></div>
        <button onClick={() => setView("user")} style={{ marginTop: "30px", background: "#4A90D9", border: "none", color: "#fff", padding: "15px 30px", borderRadius: "10px" }}>Cerrar Cámara</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" }}>
        <div style={{ color: "#4A90D9", fontWeight: "bold" }}>CALAFATE PLUS</div>
        <button onClick={() => setView("login")} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "6px 15px", borderRadius: "20px", fontSize: "12px" }}>
          LOGIN ADMIN
        </button>
      </div>

      <header style={{ padding: "20px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "42px", fontWeight: "900", letterSpacing: "-1px" }}>CALAFATE PLUS</h1>
        <p style={{ color: "#4A90D9", marginTop: "5px", fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "3px" }}>FULL DESCUENTOS</p>
      </header>

      {/* BANNER PUBLICIDAD - ESTILO PREMIUM */}
      <div style={{ margin: "15px", background: "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)", borderRadius: "25px", padding: "30px 20px", textAlign: "center", color: "#000", boxShadow: "0 15px 25px rgba(255,140,0,0.3)" }}>
        <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "900" }}>¿TENÉS UN COMERCIO?</h2>
        <p style={{ margin: "8px 0 20px 0", fontSize: "16px", fontWeight: "600" }}>Aumentá tus clientes hoy mismo</p>
        <button 
          onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola%20Cachi!%20Quiero%20sumar%20mi%20negocio%20a%20Calafate%20Plus`)}
          style={{ background: "#000", color: "#fff", border: "none", padding: "14px 40px", borderRadius: "15px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}
        >
          ¡ASOCIATE AHORA!
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <button onClick={() => setView("scanner")} style={{ background: "#fff", color: "#011627", border: "none", padding: "15px 40px", borderRadius: "50px", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "12px", boxShadow: "0 8px 20px rgba(255,255,255,0.15)" }}>
          <Camera size={22}/> ESCANEAR QR
        </button>
      </div>

      <main style={{ padding: "0 15px 100px 15px", maxWidth: "600px", margin: "0 auto" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "25px", marginBottom: "30px", border: "1px solid rgba(74,144,217,0.2)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: "15px", right: "15
