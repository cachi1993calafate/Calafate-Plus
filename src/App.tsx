import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

// --- FUNCIONES DE AYUDA ---
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la tierra en km
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

  // 1. Cargar comercios de Supabase
  useEffect(() => {
    const fetchBiz = async () => {
      const { data } = await supabase.from("businesses").select("*").eq("is_active", true);
      if (data) setBusinesses(data);
    };
    fetchBiz();
  }, []);

  // 2. Función para registrar Clicks (Estadísticas)
  const trackClick = async (id: string, type: 'wa' | 'maps' | 'coupon') => {
    // Esto asume que tenés columnas llamadas click_wa, click_maps, click_coupon en Supabase
    const { data: current } = await supabase.from("businesses").select("*").eq("id", id).single();
    const column = type === 'wa' ? 'click_wa' : type === 'maps' ? 'click_maps' : 'total_clicks';
    await supabase.from("businesses").update({ [column]: (current[column] || 0) + 1 }).eq("id", id);
  };

  // 3. Activar GPS y ordenar por cercanía
  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLoc(coords);
      const sorted = [...businesses].sort((a, b) => 
        getDistance(coords.lat, coords.lng, a.lat, a.lng) - getDistance(coords.lat, coords.lng, b.lat, b.lng)
      );
      setBusinesses(sorted);
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      <header style={{ background: "#003366", padding: "20px", textAlign: "center", borderBottom: "3px solid #4A90D9" }}>
        <h1>Calafate Plus</h1>
        <button onClick={handleGPS} style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold" }}>
          {userLoc ? "📍 Ubicación Activada" : "Activar GPS"}
        </button>
      </header>

      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
        {businesses.map((biz) => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "15px", padding: "20px", marginBottom: "15px", border: "1px solid #4A90D933" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{biz.name}</h3>
              <span style={{ color: "#FFD700", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)" }}>{biz.offer_es}</p>
            
            {userLoc && <small style={{ display: "block", marginBottom: "10px", color: "#4A90D9" }}>
              A {getDistance(userLoc.lat, userLoc.lng, biz.lat, biz.lng).toFixed(1)} km de vos
            </small>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => { trackClick(biz.id, 'maps'); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`) }}
                style={{ background: "#eee", color: "#000", border: "none", padding: "10px", borderRadius: "8px" }}>Como llegar</button>
              
              <button onClick={() => { trackClick(biz.id, 'wa'); window.open(`https://wa.me/${biz.phone}`) }}
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "bold" }}>WhatsApp</button>
            </div>

            <button onClick={() => { trackClick(biz.id, 'coupon'); setActiveCoupon(biz); }}
              style={{ width: "100%", marginTop: "10px", background: "#4A90D9", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}>
              Ver Cupón
            </button>
          </div>
        ))}
      </main>

      {/* MODAL DE CUPÓN SIMPLE (Luego agregamos la cámara) */}
      {activeCoupon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", color: "#000", padding: "30px", borderRadius: "20px", textAlign: "center", width: "80%" }}>
            <h2>{activeCoupon.name}</h2>
            <p>Escaneá el código del local para validar</p>
            <div style={{ border: "2px dashed #4A90D9", padding: "20px", margin: "20px 0", fontSize: "24px", fontWeight: "bold" }}>
              CÓDIGO: {Math.floor(1000 + Math.random() * 9000)}
            </div>
            <button onClick={() => setActiveCoupon(null)} style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: "5px" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
