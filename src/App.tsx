import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Lock, LogOut, Bell, PlusCircle, Save, X, Trash2, Check, XCircle, Clock, Smartphone, Download, Send, MapPin } from "lucide-react";

const getIcon = (cat: string) => {
  let color = "blue";
  if (cat === "Gastronomía") color = "red";
  if (cat === "Láser") color = "orange";
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  });
};

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login">("user");
  const [showForm, setShowForm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";

  const [formData, setFormData] = useState({ name: "", phone: "", category: "General", discount_pct: 10, offer_es: "", lat: -50.34, lng: -72.27, valid_until: "", payment_status: false });
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

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
    const { data } = await supabase.from("businesses")
      .select("*")
      .order('payment_status', { ascending: true })
      .order('valid_until', { ascending: true });
    if (data) setBusinesses(data);
  };

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("En iPhone: Tocá 'Compartir' y luego 'Agregar a inicio'. En Android: Tocá los 3 puntos y 'Instalar'.");
    }
  };

  const handlePaymentAction = async (biz: any) => {
    const newStatus = !biz.payment_status;
    let newDate = biz.valid_until;
    if (newStatus) {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      newDate = date.toISOString().split('T')[0];
    }
    await supabase.from("businesses").update({ payment_status: newStatus, valid_until: newDate }).eq("id", biz.id);
    fetchData();
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Error de acceso"); else { if (email === ADMIN_EMAIL) setView("admin"); fetchData(); }
  };

  if (view === "admin") {
    return (
      <div style={{ padding: "15px", background: "#f8f9fa", minHeight: "100vh", paddingBottom: "100px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "#003366" }}>Panel Admin</h2>
          <button onClick={() => { supabase.auth.signOut(); setView("user"); }} style={{ background: "none", border: "none" }}><LogOut color="red"/></button>
        </header>

        {businesses.map(b => {
          const diff = Math.ceil((new Date(b.valid_until).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          return (
            <div key={b.id} style={{ background: "#fff", padding: "15px", borderRadius: "15px", marginBottom: "12px", borderLeft: b.payment_status ? "6px solid #2ecc71" : "6px solid #e74c3c", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px" }}>{b.name}</h3>
                  <p style={{ margin: "5px 0", fontSize: "12px" }}>Vence: {b.valid_until} ({diff}d)</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handlePaymentAction(b)} style={{ background: b.payment_status ? "#e8f5e9" : "#ffebee", border: "none", borderRadius: "10px", padding: "10px" }}>
                    {b.payment_status ? <Check color="#2ecc71"/> : <XCircle color="#e74c3c"/>}
                  </button>
                  <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from("businesses").delete().eq("id", b.id); fetchData(); } }} style={{ background: "none", border: "none" }}><Trash2 color="#ccc" size={18}/></button>
                </div>
              </div>
            </div>
          );
        })}

        <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#003366", color: "#fff", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold", zIndex: 100 }}>+ NUEVO LOCAL</button>
        
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, padding: "25px", overflowY: "auto", color: "#000" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><h2>Cargar Local</h2><button onClick={() => setShowForm(false)} style={{ border: "none", background: "none" }}><X size={30}/></button></div>
            <input placeholder="Nombre" onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
            <input placeholder="WhatsApp (5492902...)" onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
            <input type="date" onChange={e => setFormData({...formData, valid_until: e.target.value})} style={inputStyle} />
            <button onClick={() => navigator.geolocation.getCurrentPosition(p => setFormData({...formData, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", marginBottom: "15px", fontWeight: "bold" }}>📍 CAPTURAR UBICACIÓN AQUÍ</button>
            <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "18px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>GUARDAR Y ACTIVAR</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff" }}>
      <div style={{ background: "linear-gradient(to right, #4A90D9, #003366)", padding: "12px", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }} onClick={installApp}>
        <Download size={18}/> <span style={{ fontSize: "14px", fontWeight: "bold" }}>{deferredPrompt ? "INSTALAR APP CALAFATE PLUS" : "AGREGAR A PANTALLA DE INICIO"}</span>
      </div>

      <header style={{ height: "220px", backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1513032334033-02f8420076a0?auto=format&fit=crop&w=800&q=80')", backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
        <button onClick={() => setView("login")} style={{ position: "absolute", top: "15px", right: "15px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px", borderRadius: "50%" }}><Smartphone size={18}/></button>
        <h1 style={{ fontSize: "30px", margin: 0, fontWeight: "bold" }}>CALAFATE PLUS</h1>
        <button onClick={() => navigator.geolocation.getCurrentPosition(p => setUserLoc({lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ background: "#4A90D9", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", marginTop: "15px" }}>📍 BENEFICIOS CERCA</button>
      </header>

      {userLoc && (
        <div style={{ height: "250px", width: "100%" }}>
          <MapContainer center={[userLoc.lat, userLoc.lng]} zoom={14} style={{ height: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {businesses.filter(b => new Date(b.valid_until) >= new Date()).map(biz => (
              <Marker key={biz.id} position={[biz.lat, biz.lng]} icon={getIcon(biz.category)}>
                <Popup><b>{biz.name}</b></Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <main style={{ padding: "15px" }}>
        {businesses.filter(b => new Date(b.valid_until) >= new Date()).map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "18px", marginBottom: "15px", border: "1px solid rgba(74,144,217,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><h3>{biz.name}</h3><span style={{ color: "gold", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span></div>
            <p style={{ opacity: 0.8, fontSize: "14px" }}>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold" }}>UBICACIÓN</button>
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
          <button onClick={handleLogin} style={{ width: "100%", padding: "15px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>ENTRAR</button>
          <button onClick={() => setView("user")} style={{ marginTop: "20px", color: "#fff", background: "none", border: "none" }}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #ddd", fontSize: "16px", color: "#000" };
