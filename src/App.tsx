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

  // CORRECCIÓN PARA EL ERROR TS2345:
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (scanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render(
        (decodedText) => {
          setScanResult(decodedText);
          setScanning(false);
          if (scanner) scanner.clear();
        },
        (error) => { /* errores de lectura continuos */ }
      );
    }
    return () => {
      if (scanner) scanner.clear().catch(e => console.error(e));
    };
  }, [scanning]);

  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      <header style={{ background: "#003366", padding: "20px", textAlign: "center", borderBottom: "3px solid #4A90D9" }}>
        <h1 style={{ margin: 0 }}>🏔️ Calafate Plus</h1>
        <button onClick={handleGPS} style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "10px", borderRadius: "8px", marginTop: "10px" }}>
          {userLoc ? "📍 Ubicación Activa" : "📍 Activar GPS"}
        </button>
      </header>

      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
        {businesses.map((biz) => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "20px", marginBottom: "15px", border: "1px solid #4A90D933" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h3 style={{ margin: "0 0 10px 0" }}>{biz.name}</h3>
              <span style={{ color: "#FFD700", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
            </div>
            <p style={{ opacity: 0.9 }}>{biz.offer_es}</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lng}`, "_blank")}
                style={{ background: "#eee", color: "#333", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}>Mapa</button>
              
              <button onClick={() => {
                const cleanPhone = biz.phone.toString().replace(/\D/g,'');
                const finalPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
                window.open(`https://wa.me/${finalPhone}`, "_blank");
              }}
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}>WhatsApp</button>
            </div>

            <button onClick={() => setScanning(true)}
              style={{ width: "100%", marginTop: "10px", background: "#4A90D9", color: "#fff", border: "none", padding: "14px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
              VALIDAR EN LOCAL (QR)
            </button>
          </div>
        ))}
      </main>

      {scanning && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, padding: "20px", display: "flex", flexDirection: "column" }}>
          <h2 style={{ textAlign: "center" }}>Escaneá el QR del local</h2>
          <div id="reader" style={{ width: "100%", background: "#333", borderRadius: "10px" }}></div>
          <button onClick={() => setScanning(false)} style={{ width: "100%", marginTop: "auto", padding: "15px", background: "#ff4444", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>CANCELAR</button>
        </div>
      )}

      {scanResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ background: "#fff", color: "#000", padding: "40px", borderRadius: "30px", textAlign: "center", width: "80%", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: "60px", marginBottom: "10px" }}>✅</div>
            <h2 style={{ color: "#2d6a4f", margin: "0 0 10px 0" }}>PROMOCIÓN ACTIVADA</h2>
            <p style={{ color: "#555" }}>Mostrá esta pantalla al comerciante para recibir tu beneficio.</p>
            <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />
            <button onClick={() => setScanResult(null)} style={{ padding: "12px 30px", background: "#011627", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}>LISTO</button>
          </div>
        </div>
      )}
    </div>
  );
}
