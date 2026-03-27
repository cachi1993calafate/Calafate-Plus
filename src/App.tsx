import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Iconos
const iconBiz = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png", iconSize: [25, 41], iconAnchor: [12, 41] });
const iconUser = L.icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png", iconSize: [25, 41], iconAnchor: [12, 41] });

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { fetchBiz(); }, []);

  const fetchBiz = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name');
    if (data) setBusinesses(data);
  };

  const trackClick = async (id: string, column: string) => {
    const biz = businesses.find(b => b.id === id);
    await supabase.from("businesses").update({ [column]: (biz[column] || 0) + 1 }).eq("id", id);
  };

  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (scanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250, rememberLastUsedCamera: true, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] }, false);
      scanner.render((text) => { setScanResult(text); setScanning(false); if (scanner) scanner.clear(); }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(() => {}); };
  }, [scanning]);

  if (isAdmin) {
    return (
      <div style={{ padding: "20px", background: "#fff", color: "#000", minHeight: "100vh" }}>
        <h3>📊 Estadísticas de Clics</h3>
        <button onClick={() => setIsAdmin(false)}>Cerrar Panel</button>
        <div style={{ marginTop: "20px", overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#eee" }}><th>Local</th><th>WA</th><th>Maps</th><th>QR</th></tr></thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td>{b.name}</td><td>{b.clicks_wa}</td><td>{b.clicks_maps}</td><td>{b.clicks_qr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: "#003366", padding: "15px", textAlign: "center", borderBottom: "3px solid #4A90D9" }}>
        <h2 onClick={() => setIsAdmin(true)} style={{ margin: 0 }}>🏔️ Calafate Plus</h2>
        <button onClick={handleGPS} style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "10px", borderRadius: "10px", marginTop: "10px", fontWeight: "bold" }}>
          {userLoc ? "📍 Ubicación Activa" : "📍 Ver Mapa y Cercanos"}
        </button>
      </header>

      {/* MAPA */}
      {userLoc && (
        <div style={{ height: "250px", width: "100%" }}>
          <MapContainer center={[userLoc.lat, userLoc.lng]} zoom={15} style={{ height: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[userLoc.lat, userLoc.lng]} icon={iconUser} />
            {businesses.map(biz => (
              <Marker key={biz.id} position={[biz.lat, biz.lng]} icon={iconBiz} />
            ))}
          </MapContainer>
        </div>
      )}

      {/* BANNER DE PUBLICIDAD (Para captar clientes) */}
      <div style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)", color: "#000", padding: "20px", textAlign: "center", margin: "15px", borderRadius: "15px" }}>
          <h3 style={{ margin: 0 }}>¿Querés publicitar acá? 🚀</h3>
          <p style={{ margin: "5px 0 15px 0" }}>Llegá a más turistas y vecinos de El Calafate.</p>
          <button onClick={() => window.open('https://wa.me/5492902XXXXXX', '_blank')} 
            style={{ background: "#000", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold" }}>
            CONTACTARME AHORA
          </button>
      </div>

      {/* LISTA DE LOCALES */}
      <main style={{ padding: "15px" }}>
        {businesses.filter(b => b.is_active).map((biz) => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "15px", marginBottom: "15px", border: "1px solid #4A90D933" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{biz.name}</h3>
              <span style={{ color: "#FFD700", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
            </div>
            <p>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => { trackClick(biz.id, 'clicks_maps'); window.open(`http://googleusercontent.com/maps.google.com/4{biz.lat},${biz.lng}`, "_blank") }}
                style={{ background: "#eee", color: "#333", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "bold" }}>Mapa</button>
              <button onClick={() => { 
                trackClick(biz.id, 'clicks_wa');
                const finalPhone = biz.phone.toString().startsWith('54') ? biz.phone : `549${biz.phone}`;
                window.open(`https://wa.me/${finalPhone}`, "_blank");
              }}
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "bold" }}>WhatsApp</button>
            </div>
            <button onClick={() => { setScanning(true); trackClick(biz.id, 'clicks_qr'); }}
              style={{ width: "100%", marginTop: "10px", background: "#4A90D9", color: "#fff", border: "none", padding: "15px", borderRadius: "10px", fontWeight: "bold" }}>
              VALIDAR EN LOCAL (QR)
            </button>
          </div>
        ))}
      </main>

      {/* MODALES SCANNER Y ÉXITO */}
      {scanning && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, padding: "20px" }}>
          <div id="reader" style={{ width: "100%", borderRadius: "15px", overflow: "hidden" }}></div>
          <button onClick={() => setScanning(false)} style={{ width: "100%", marginTop: "20px", padding: "15px", background: "red", color: "#fff", border: "none", borderRadius: "10px" }}>CANCELAR</button>
        </div>
      )}

      {scanResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ background: "#fff", color: "#000", padding: "40px", borderRadius: "30px", textAlign: "center", width: "80%" }}>
            <h2 style={{ color: "green" }}>✅ PROMOCIÓN ACTIVADA</h2>
            <p>Mostrá esta pantalla en caja.</p>
            <button onClick={() => setScanResult(null)} style={{ padding: "12px 30px", background: "#000", color: "#fff", borderRadius: "10px", marginTop: "20px" }}>LISTO</button>
          </div>
        </div>
      )}
    </div>
  );
}
