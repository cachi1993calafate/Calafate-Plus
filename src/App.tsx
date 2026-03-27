import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

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

  useEffect(() => {
    const fetchBiz = async () => {
      const { data } = await supabase.from("businesses").select("*").eq("is_active", true);
      if (data) setBusinesses(data);
    };
    fetchBiz();
  }, []);

  const trackClick = async (id: string, type: 'wa' | 'maps' | 'coupon') => {
    try {
      const { data: current } = await supabase.from("businesses").select("*").eq("id", id).single();
      const column = type === 'wa' ? 'click_wa' : type === 'maps' ? 'click_maps' : 'total_clicks';
      await supabase.from("businesses").update({ [column]: (current[column] || 0) + 1 }).eq("id", id);
    } catch (e) { console.error(e); }
  };

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
        <h1 style={{ margin: 0 }}>🏔️ Calafate Plus</h1>
        <button onClick={handleGPS} style={{ background: "#4A90D9", border: "none", color: "#fff", padding: "12px 20px", borderRadius: "10px", marginTop: "10px", fontWeight: "bold" }}>
          {userLoc ? "📍 GPS Activo" : "📍 Ver Cercanos"}
        </button>
      </header>

      <main style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
        {businesses.map((biz) => (
          <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "20px", marginBottom: "15px", border: "1px solid #4A90D933" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{biz.name}</h3>
              <span style={{ color: "#FFD700", fontWeight: "bold" }}>{biz.discount_pct}% OFF</span>
            </div>
            <p style={{ opacity: 0.8 }}>{biz.offer_es}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button onClick={() => { trackClick(biz.id, 'maps'); window.open(`https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lng}`, "_blank") }}
                style={{ background: "#eee", border: "none", padding: "10px", borderRadius: "8px" }}>Como llegar</button>
              <button onClick={() => { trackClick(biz.id, 'wa'); window.open(`https://wa.me/${biz.phone}`, "_blank") }}
                style={{ background: "#25D366", color: "#fff", border: "none", padding: "10px", borderRadius: "8px" }}>WhatsApp</button>
            </div>
            <button onClick={() => { trackClick(biz.id, 'coupon'); setActiveCoupon(biz); }}
              style={{ width: "100%", marginTop: "10px", background: "#4A90D9", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}>
              VER CUPÓN
            </button>
          </div>
        ))}
      </main>

      {activeCoupon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", color: "#000", padding: "30px", borderRadius: "20px", textAlign: "center", width: "80%" }}>
            <h2>{activeCoupon.name}</h2>
            <div style={{ border: "2px dashed #4A90D9", padding: "20px", margin: "20px 0", fontSize: "24px", fontWeight: "bold" }}>
              CP-{Math.floor(1000 + Math.random() * 9000)}
            </div>
            <button onClick={() => setActiveCoupon(null)} style={{ padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: "5px" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
