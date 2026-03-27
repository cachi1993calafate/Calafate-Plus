import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const T: any = {
  es: { appName: "Calafate Plus", tagline: "Tu guía de beneficios en El Calafate", all: "Todos", gastronomy: "Gastronomía", experiences: "Experiencias", shopping: "Compras", services: "Servicios", viewCoupon: "Ver Cupón", location: "Cómo llegar", contact: "WhatsApp", scanQR: "Escaneá el QR en caja", close: "Cerrar", newCoupon: "Nuevo Cupón", timeLeft: "Tiempo restante", expired: "Cupón Expirado", expiredMsg: "Escanea el QR nuevamente.", couponWarning: "Válido 10 min · Solo en caja", admin: "Admin", business: "Mi Local", login: "Ingresar", email: "Email", password: "Pass", adminPanel: "Panel Admin", businessPanel: "Panel Comercio", hotelRanking: "Hoteles", manageBusinesses: "Comercios", totalClicks: "Clicks", expiration: "Vencimiento", claimPayment: "Reclamar", toggleActive: "Estado", offerEs: "Oferta ES", offerEn: "Oferta EN", offerPt: "Oferta PT", save: "Guardar", saved: "¡Guardado!", active: "Activo", inactive: "Inactivo", logout: "Salir", featured: "DESTACADO", enableGPS: "Activar GPS", kmAway: "km", mapView: "Mapa", listView: "Lista", loading: "Cargando..." },
};

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CalafatePlus() {
  const [lang, setLang] = useState("es");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [coupon, setCoupon] = useState<any>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const t = T[lang] || T.es;

  useEffect(() => {
    supabase.from("businesses").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setBusinesses(data);
      setLoading(false);
    });
  }, []);

  const locate = () => {
    navigator.geolocation.getCurrentPosition((p) => {
      setUserLat(p.coords.latitude);
      setUserLng(p.coords.longitude);
    });
  };

  const filtered = businesses.filter((b) => category === "all" || b.category === category);

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: "sans-serif" }}>
      <header style={{ background: "#003366", padding: "15px", textAlign: "center", borderBottom: "2px solid #4A90D9" }}>
        <h2 style={{ margin: 0 }}>🏔️ Calafate Plus</h2>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button onClick={locate} style={{ padding: "12px 20px", borderRadius: 10, background: "#4A90D9", color: "#fff", border: "none", fontWeight: "bold" }}>
             {userLat ? "📍 GPS Conectado" : "📍 Activar Beneficios Cercanos"}
          </button>
        </div>

        <div style={{ display: "grid", gap: 15 }}>
          {filtered.map((biz) => (
            <div key={biz.id} style={{ background: "rgba(255,255,255,0.05)", padding: 20, borderRadius: 15, border: "1px solid #4A90D933" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                 <h3 style={{ margin: 0 }}>{biz.name}</h3>
                 <span style={{ color: "#FFD700", fontWeight: "bold", fontSize: 20 }}>{biz.discount_pct}% OFF</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 15 }}>{biz.offer_es}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* BOTÓN CÓMO LLEGAR */}
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lng}`, "_blank")}
                  style={{ padding: 10, borderRadius: 8, background: "#333", color: "#fff", border: "none", cursor: "pointer" }}>
                  📍 Mapa
                </button>
                
                {/* BOTÓN WHATSAPP */}
                <button 
                  onClick={() => window.open(`https://wa.me/${biz.phone?.toString().replace(/\D/g,'')}`, "_blank")}
                  style={{ padding: 10, borderRadius: 8, background: "#25D366", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  📱 WhatsApp
                </button>
              </div>

              <button 
                onClick={() => setCoupon(biz)}
                style={{ width: "100%", marginTop: 10, padding: 15, borderRadius: 8, background: "linear-gradient(135deg, #4A90D9, #003366)", color: "#fff", border: "none", fontWeight: "bold", fontSize: 16 }}>
                🎫 VER CUPÓN
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL DEL CUPÓN */}
      {coupon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}>
          <div style={{ background: "#fff", color: "#000", padding: 30, borderRadius: 20, textAlign: "center", width: "100%", maxWidth: 350 }}>
            <h2 style={{ margin: 0 }}>{coupon.name}</h2>
            <h1 style={{ fontSize: 40, color: "#4A90D9" }}>{coupon.discount_pct}% OFF</h1>
            <div style={{ background: "#eee", padding: 20, borderRadius: 10, margin: "20px 0" }}>
               <p style={{ margin: 0, fontWeight: "bold", fontSize: 24, letterSpacing: 3 }}>CP-{Math.floor(Math.random()*9000)+1000}</p>
               <small>Presentar este código en caja</small>
            </div>
            <p>⏳ Válido por 10 minutos</p>
            <button onClick={() => setCoupon(null)} style={{ width: "100%", padding: 12, background: "#000", color: "#fff", borderRadius: 10, border: "none" }}>CERRAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
