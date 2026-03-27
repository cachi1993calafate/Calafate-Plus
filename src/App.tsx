import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// Función para calcular distancia entre el usuario y el local
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<any>(null);

  // Cargar comercios de Supabase
  useEffect(() => {
    const fetchBiz = async () => {
      const { data } = await supabase.from("businesses").select("*").eq("is_active", true);
      if (data) setBusinesses(data);
    };
    fetchBiz();
  }, []);

  // Registrar Clicks en la base de datos
  const trackClick = async (id: string, type: 'wa' | 'maps' | 'coupon') => {
    try {
      const { data: current } = await supabase.from("businesses").select("*").eq("id", id).single();
      const column = type === 'wa' ? 'click_wa' : type === 'maps' ? 'click_maps' : 'total_clicks';
      await supabase.from("businesses").update({ [column]: (current[column] || 0) + 1 }).eq("id", id);
    } catch (e) {
      console.error("Error al trackear click", e);
    }
  };

  // Activar GPS
  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLoc(coords);
      // Ordenar por cercanía
      const sorted = [...businesses].sort((a, b) => 
        getDistance(coords.lat, coords.lng, a.lat, a.lng) - getDistance(coords.lat, coords.lng, b.lat, b.lng)
      );
      setBusinesses(sorted);
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      <header style={{ background: "#003366", padding: "20px", textAlign: "center", borderBottom: "3px solid #4A90D9" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>🏔️ Calafate Plus</h1>
        <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "15px" }}>Tu guía de beneficios local</p>
        <button onClick={handleGPS} style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>
          {userLoc ? "📍 Ubicación Activada" : "📍 Activar GPS Cercanos"}
        </button>
      </header>

      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
        {businesses.map((biz) => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "20px", marginBottom: "20px", border: "1px solid #4A90D933", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "20px" }}>{biz.name}</h3>
              <div style={{ background: "#FFD700", color: "#000", padding: "4px 8px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px" }}>
                {biz.discount_pct}% OFF
              </div>
            </div>
            
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", marginBottom: "15px" }}>{biz.offer_es}</p>
            
            {userLoc && (
              <div style={{ marginBottom: "15px", color: "#4A90D9", fontSize: "13px", fontWeight: "bold" }}>
                Estás a {getDistance(userLoc.lat, userLoc.lng, biz.lat, biz.lng).toFixed(1)} km
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <button 
                onClick={() => { trackClick(biz.id, 'maps'); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`, "_blank") }}
                style={{ background: "#334155", color: "#fff", border: "none", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>
                🗺️ Mapa
              </button>
              
              <button 
                onClick={() => { trackClick(biz.id, 'wa'); window.open(`https://wa.me/${biz.phone?.toString().replace(/\D/g,'')}`, "_blank") }}
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                📱 WhatsApp
              </button>
            </div>

            <button 
              onClick={() => { trackClick(biz.id, 'coupon'); setActiveCoupon(biz); }}
              style={{ width: "100%", background: "linear-gradient(135deg, #4A90D9, #003366)", color: "#fff", border: "none", padding: "15px", borderRadius: "12px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 10px rgba(74,144,217,0.3)" }}>
              🎫 VER CUPÓN
            </button>
          </div>
        ))}
      </main>

      {activeCoupon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zUnit: 1000, padding: "20px" }}>
          <div style={{ background: "#fff", color: "#000", padding: "30px", borderRadius: "25px", textAlign: "center", width: "100%", maxWidth: "350px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <h2 style={{ margin: "0 0 10px 0", color: "#003366" }}>{activeCoupon.name}</h2>
            <div style={{ fontSize: "48px", fontWeight: "900", color: "#4A90D9", margin: "10px 0" }}>{activeCoupon.discount_pct}%</div>
            <p style={{ fontWeight: "bold", color: "#333" }}>¡Beneficio Activo!</p>
            
            <div style={{ background: "#f1f5f9", border: "2px dashed #4A90D9", padding: "20px", borderRadius: "15px", margin: "20px 0" }}>
               <small style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Código de Validación</small>
               <div style={{ fontSize: "32px", fontWeight: "bold", color: "#000", letterSpacing: "4px" }}>
                 CP-{Math.floor(1000 + Math.random() * 9000)}
               </div>
            </div>
            
            <p style={{ fontSize: "13px", color: "#64748b" }}>⏳ Presentá este código en caja.<br/>Válido por 10 minutos.</p>
            
            <button 
              onClick={() => setActiveCoupon(null)} 
              style={{ width: "100%", padding: "12px", background: "#0f172a", color: "#fff", borderRadius: "10px", border: "none", marginTop: "15px", fontWeight: "bold", cursor: "pointer" }}>
              CERRAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
