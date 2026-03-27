import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, MapPin, MessageCircle, Store, Camera, LogOut } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

// Icono para el mapa
const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
});

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [view, setView] = useState<"user" | "admin" | "login" | "scanner">("user");
  const [showForm, setShowForm] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  
  const ADMIN_EMAIL = "cachi_93_16@hotmail.com";
  const MI_WHATSAPP = "5492966694462"; 

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", offer_es: "", discount_short: "10%", image_url: "", lat: -50.34, lng: -72.27 });

  useEffect(() => {
    // 1. Escuchar evento de instalación
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // 2. Autologin: Verificar si ya hay sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    fetchData();
  }, []);

  // 3. Manejar el Escáner QR
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && currentScannerId) {
      scanner = new Html5QrcodeScanner(
        currentScannerId, 
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        }, 
        /* verbose= */ false
      );
      scanner.render(
        (text) => {
          // Redirigir a la URL del QR
          window.location.href = text;
          if (scanner) scanner.clear().catch(err => console.error("Error clearing scanner", err));
          setView("user");
          setCurrentScannerId(null);
        }, 
        (errorMessage) => {
          // Manejar error silenciosamente
        }
      );
    }
    // Cleanup function al desmontar o cambiar de vista
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Error clearing scanner", e));
      }
    };
  }, [view, currentScannerId]);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Error: " + error.message);
    else { setSession(data.session); setView("user"); fetchData(); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView("user");
    fetchData();
  };

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    } else {
      alert("Para instalar:\n\nEn iPhone: Toca Compartir -> 'Agregar a inicio'.\n\nEn Android: Toca los 3 puntos -> 'Instalar app' o 'Agregar a pantalla principal'.");
    }
  };

  const openScannerForBusiness = (bizId: string) => {
    setCurrentScannerId(`reader-${bizId}`);
    setView("scanner");
  };

  const isAdmin = session?.user.email === ADMIN_EMAIL;

  // --- COMPONENTE DEL ESCÁNER QR ---
  const QRScannerModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
      <h2 style={{ marginBottom: "20px" }}>Escaneá el QR</h2>
      <div id={currentScannerId || "reader"} style={{ width: "100%", maxWidth: "400px", borderRadius: "20px", overflow: "hidden" }}></div>
      {/* Estilo para ocultar el selector de cámara nativo de html5-qrcode */}
      <style>
        {`
          #${currentScannerId || "reader"}__camera_selection {
            display: none !important;
          }
          #${currentScannerId || "reader"}__status_span {
            color: white !important;
          }
        `}
      </style>
      <button onClick={() => { setView("user"); setCurrentScannerId(null); }} style={{ marginTop: "30px", background: "#e74c3c", border: "none", color: "#fff", padding: "15px 40px", borderRadius: "12px", fontWeight:"bold", fontSize: "16px" }}>CERRAR</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* 1. BARRA SUPERIOR CORREGIDA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", background: "rgba(0,0,0,0.1)" }}>
        {/* ÍCONO DE INSTALACIÓN (ARRIBA A LA IZQUIERDA) */}
        <button onClick={installApp} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Download size={20} />
        </button>
        
        {isAdmin ? (
          <button onClick={handleLogout} style={{ background: "#ff4757", color: "#fff", border: "none", padding: "6px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>SALIR (ADMIN)</button>
        ) : (
          <button onClick={() => setView("login")} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "6px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
            INGRESAR
          </button>
        )}
      </div>

      {/* HEADER PRINCIPAL (TEXTOS CORREGIDOS) */}
      <header style={{ padding: "30px 20px", textAlign: "center", background: "linear-gradient(180deg, #022b4d 0%, #011627 100%)" }}>
        <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900", letterSpacing: "-1px" }}>CALAFATE<br/><span style={{color: "#FFD700"}}>PLUS</span></h1>
        <p style={{ color: "#4A90D9", marginTop: "10px", fontSize: "18px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px" }}>FULL DESCUENTOS</p>
      </header>

      {/* 2. BANNER PUBLICIDAD Impactante */}
      <div style={{ margin: "15px", background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", borderRadius: "25px", padding: "25px", textAlign: "center", color: "#000", boxShadow: "0 8px 20px rgba(255,165,0,0.3)" }}>
        <h2 style={{ margin: "0", fontSize: "24px", fontWeight: "900" }}>¿QUERÉS VENDER MÁS?</h2>
        <p style={{ margin: "10px 0 15px 0", fontSize: "16px", fontWeight: "600" }}>Sumá tu comercio a la red líder de Calafate.</p>
        <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola%20Cachi!%20Quiero%20sumar%20mi%20comercio`)} style={{ background: "#000", color: "#fff", border: "none", padding: "14px 35px", borderRadius: "15px", fontWeight: "bold", fontSize: "16px" }}>CONTACTARME</button>
      </div>

      {/* BOTÓN MAPA (Opcional, lo mantengo por utilidad) */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <button onClick={() => setUserLoc({lat: -50.34, lng: -72.27})} style={{ background: "rgba(74,144,217,0.2)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "10px 25px", borderRadius: "50px", fontWeight: "bold", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <MapPin size={18}/> VER LOCALES CERCA
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

      {/* 3. BOTÓN AGREGAR COMERCIO (SOLO ADMIN) */}
      {isAdmin && (
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <button onClick={() => setShowForm(true)} style={{ background: "#25D366", color: "#fff", border: "none", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 15px rgba(37,211,102,0.4)" }}>
            + AGREGAR NUEVO COMERCIO
          </button>
        </div>
      )}

      {/* FORMULARIO AGREGAR LOCAL (SOLO ADMIN) */}
      {showForm && isAdmin && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 9999, padding: "20px", overflowY: "auto", color: "#000" }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems: "center"}}><h2>Nuevo Comercio</h2><X onClick={()=>setShowForm(false)} size={30}/></div>
          <input placeholder="Nombre del Comercio" onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
          <input placeholder="WhatsApp (Ej: 2966123456)" onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} />
          <input placeholder="Descuento (ej: 15% OFF)" onChange={e => setFormData({...formData, discount_short: e.target.value})} style={inputStyle} />
          <textarea placeholder="Descripción del beneficio" onChange={e => setFormData({...formData, offer_es: e.target.value})} style={{...inputStyle, height: "100px"}} />
          <input placeholder="URL de la Foto" onChange={e => setFormData({...formData, image_url: e.target.value})} style={inputStyle} />
          <button onClick={() => navigator.geolocation.getCurrentPosition(p => setFormData({...formData, lat: p.coords.latitude, lng: p.coords.longitude}))} style={{ width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", marginBottom: "15px", fontWeight: "bold" }}>📍 CAPTURAR UBICACIÓN AQUÍ</button>
          <button onClick={async () => { await supabase.from("businesses").insert([formData]); setShowForm(false); fetchData(); }} style={{ width: "100%", background: "#25D366", color: "#fff", padding: "18px", borderRadius: "15px", border: "none", fontWeight: "bold", fontSize: "18px" }}>GUARDAR Y PUBLICAR</button>
        </div>
      )}

      {/* LISTA DE LOCALES (CON BOTÓN DE QR INTEGRADO) */}
      <main style={{ padding: "0 15px 100px 15px", maxWidth: "600px", margin: "0 auto" }}>
        {businesses.map(biz => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "25px", marginBottom: "25px", border: "1px solid rgba(74,144,217,0.15)", overflow: "hidden", position: "relative", boxShadow: "0 5px 15px rgba(0,0,0,0.2)" }}>
            
            {/* TAG DE DESCUENTO */}
            <div style={{ position: "absolute", top: "20px", right: "20px", background: "#e74c3c", color: "#fff", width: "70px", height: "70px", borderRadius: "50%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontWeight: "900", fontSize: "18px", zIndex: 10, boxShadow: "0 4px 10px rgba(231,76,60,0.4)" }}>
              {biz.discount_short || "10%"}
            </div>

            {biz.image_url ? (
              <img src={biz.image_url} alt={biz.name} style={{ width: "100%", height: "220px", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "150px", background: "linear-gradient(45deg, #022b4d, #011627)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Store size={50} color="rgba(74,144,217,0.3)" />
              </div>
            )}

            <div style={{ padding: "25px" }}>
              <h3 style={{ margin: "0", fontSize: "26px", fontWeight: "800" }}>{biz.name}</h3>
              <p style={{ color: "#bbb", margin: "12px 0 25px 0", fontSize: "15px", lineHeight: "1.5" }}>{biz.offer_es}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "15px" }}>
                {/* 4. BOTÓN "ACCEDER A LA PROMO" (ESCANEAR QR) */}
                <button onClick={() => openScannerForBusiness(biz.id)} style={{ background: "#25D366", color: "#fff", padding: "14px", borderRadius: "15px", border: "none", fontWeight: "900", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 10px rgba(37,211,102,0.3)" }}>
                  <Camera size={20}/> ACCEDER A LA PROMO
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <button onClick={() => window.open(`http://googlehttp://googleusercontent.com/maps.google.com/2{biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "900", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <MapPin size={18}/> MAPA
                </button>
                <button onClick={() => window.open(`https://wa.me/${biz.phone.replace(/\D/g, '')}`)} style={{ background: "#rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid #25D366", padding: "12px", borderRadius: "12px", fontWeight: "900", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <MessageCircle size={18}/> WHATSAPP
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* MODAL DEL ESCÁNER (CUANDO ESTÁ ACTIVO) */}
      {view === "scanner" && <QRScannerModal />}

      {/* MODAL DE LOGIN (INGRESAR) */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#011627", zIndex: 9999, padding: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{textAlign: "center", marginBottom: "30px", fontSize: "28px"}}>Acceso Admin</h2>
          <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} style={inputStyle} />
          <button onClick={handleLogin} style={{ width: "100%", padding: "18px", background: "#4A90D9", color: "#fff", border: "none", borderRadius: "15px", fontWeight: "900", fontSize: "16px" }}>INGRESAR AL PANEL</button>
          <button onClick={() => setView("user")} style={{ marginTop: "30px", color: "#fff", background: "none", border: "none", opacity: 0.6, fontSize: "14px" }}>VOLVER ATRÁS</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "18px", margin: "12px 0", borderRadius: "15px", border: "1px solid #333", background: "#fff", fontSize: "16px", color: "#000" };
