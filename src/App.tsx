import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchBiz = async () => {
      const { data } = await supabase.from("businesses").select("*").eq("is_active", true);
      if (data) setBusinesses(data);
    };
    fetchBiz();
  }, []);

  // Función para abrir la cámara y escanear
  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        // Aquí podés validar si el QR coincide con el del local
        setScanResult(decodedText);
        setScanning(false);
        scanner.clear();
      }, (error) => { /* ignorar errores de escaneo continuo */ });
      return () => scanner.clear();
    }
  }, [scanning]);

  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      <header style={{ background: "#003366", padding: "20px", textAlign: "center" }}>
        <h1>🏔️ Calafate Plus</h1>
        <button onClick={handleGPS} style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "10px", borderRadius: "8px" }}>
          {userLoc ? "📍 Ubicación Activa" : "📍 Activar GPS"}
        </button>
      </header>

      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
        {businesses.map((biz) => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "20px", marginBottom: "15px", border: "1px solid #4A90D933" }}>
            <h3>{biz.name}</h3>
            <p>{biz.offer_es}</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {/* CORRECCIÓN MAPAS: Usa coordenadas exactas de la base de datos */}
              <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`, "_blank")}
                style={{ background: "#eee", border: "none", padding: "10px", borderRadius: "8px" }}>Mapa</button>
              
              {/* CORRECCIÓN WHATSAPP: Asegura el prefijo 549 (Argentina) */}
              <button onClick={() => {
                const cleanPhone = biz.phone.toString().replace(/\D/g,'');
                const finalPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
                window.open(`https://wa.me/${finalPhone}`, "_blank");
              }}
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "10px", borderRadius: "8px" }}>WhatsApp</button>
            </div>

            <button onClick={() => setScanning(true)}
              style={{ width: "100%", marginTop: "10px", background: "#4A90D9", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}>
              VALIDAR EN LOCAL (QR)
            </button>
          </div>
        ))}
      </main>

      {/* MODAL DEL ESCÁNER */}
      {scanning && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, padding: "20px" }}>
          <h2 style={{ textAlign: "center" }}>Escaneá el QR del local</h2>
          <div id="reader" style={{ width: "100%" }}></div>
          <button onClick={() => setScanning(false)} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "red", color: "#fff", border: "none", borderRadius: "10px" }}>CANCELAR</button>
        </div>
      )}

      {/* MODAL DE PROMOCIÓN ACTIVADA */}
      {scanResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ background: "#fff", color: "#000", padding: "40px", borderRadius: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "50px" }}>✅</div>
            <h2 style={{ color: "green" }}>PROMOCIÓN ACTIVADA</h2>
            <p>Mostrá esta pantalla al comerciante.</p>
            <button onClick={() => setScanResult(null)} style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: "5px" }}>LISTO</button>
          </div>
        </div>
      )}
    </div>
  );
}
