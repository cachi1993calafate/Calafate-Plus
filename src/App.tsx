import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ============================================================
// TRADUCCIONES (Idiomas para turistas)
// ============================================================
const translations: any = {
  es: {
    appName: "Calafate Plus",
    tagline: "Tu guía de beneficios",
    categories: {
      all: "Todos",
      gastronomy: "Gastronomía",
      entrepreneurs: "Emprendimientos",
      services: "Servicios",
    },
    viewCoupon: "Acceder al Cupón",
    location: "Ubicación",
    contact: "WhatsApp",
    scanQR: "Escaneá el QR del local",
    close: "Cerrar",
  },
  en: {
    appName: "Calafate Plus",
    tagline: "Your benefits guide",
    categories: {
      all: "All",
      gastronomy: "Gastronomy",
      entrepreneurs: "Entrepreneurs",
      services: "Services",
    },
    viewCoupon: "Get Coupon",
    location: "Location",
    contact: "WhatsApp",
    scanQR: "Scan the store QR code",
    close: "Close",
  },
  pt: {
    appName: "Calafate Plus",
    tagline: "Seu guia de benefícios",
    categories: {
      all: "Todos",
      gastronomy: "Gastronomia",
      entrepreneurs: "Empreendimentos",
      services: "Serviços",
    },
    viewCoupon: "Ver Cupom",
    location: "Localização",
    contact: "WhatsApp",
    scanQR: "Escaneie o QR da loja",
    close: "Fechar",
  },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CalafatePlus() {
  const [lang, setLang] = useState("es");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const t = translations[lang];

  // 1. Cargar locales de la base de datos
  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true);
      if (data) setBusinesses(data);
      setLoading(false);
    }
    loadData();
  }, []);

  // 2. Función para registrar el CLICK y abrir WhatsApp/Maps
  const handleAction = async (
    id: string,
    currentClicks: number,
    type: string,
    url: string
  ) => {
    // Registramos que hubo un interés en la DB
    if (type === "coupon") {
      await supabase
        .from("businesses")
        .update({ total_clicks: (currentClicks || 0) + 1 })
        .eq("id", id);
    }
    window.open(url, "_blank");
  };

  const filtered = businesses.filter(
    (b) => category === "all" || b.category === category
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#011627",
        color: "#fff",
        fontFamily: "sans-serif",
        padding: "20px",
      }}
    >
      {/* Selector de Idioma */}
      <div style={{ textAlign: "right", marginBottom: "10px" }}>
        <button onClick={() => setLang("es")}>🇦🇷</button>
        <button onClick={() => setLang("en")}>🇬🇧</button>
        <button onClick={() => setLang("pt")}>🇧🇷</button>
      </div>

      <header style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", margin: "0" }}>{t.appName}</h1>
        <p style={{ color: "#4A90D9" }}>{t.tagline}</p>
      </header>

      {/* Filtro por Categorías */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          marginBottom: "20px",
          paddingBottom: "10px",
        }}
      >
        {Object.keys(t.categories).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              background:
                category === cat ? "#4A90D9" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              borderRadius: "20px",
              padding: "8px 15px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.categories[cat]}
          </button>
        ))}
      </div>

      {/* Lista de Locales */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {loading ? (
          <p>Cargando locales de El Calafate...</p>
        ) : (
          filtered.map((biz) => (
            <div
              key={biz.id}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #4A90D933",
                borderRadius: "15px",
                padding: "15px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div>
                  <h2 style={{ margin: "0", fontSize: "20px" }}>{biz.name}</h2>
                  <p
                    style={{ margin: "5px 0", fontSize: "12px", color: "#aaa" }}
                  >
                    📍 {biz.address}
                  </p>
                </div>
                <div
                  style={{
                    background: "#27AE60",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    fontWeight: "bold",
                  }}
                >
                  {biz.offer_es || `${biz.discount_pct}% OFF`}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                {/* Botón Google Maps */}
                <button
                  onClick={() =>
                    handleAction(
                      biz.id,
                      biz.total_clicks,
                      "map",
                      `https://www.google.com/maps?q=${biz.lat},${biz.lng}`
                    )
                  }
                  style={{
                    background: "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  🗺️ {t.location}
                </button>

                {/* Botón WhatsApp */}
                <button
                  onClick={() =>
                    handleAction(
                      biz.id,
                      biz.total_clicks,
                      "ws",
                      `https://wa.me/${biz.phone?.replace(/\D/g, "")}`
                    )
                  }
                  style={{
                    background: "#25D366",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  📱 {t.contact}
                </button>
              </div>

              {/* Botón Cupón (Registra Click) */}
              <button
                onClick={() =>
                  handleAction(biz.id, biz.total_clicks, "coupon", "#")
                }
                style={{
                  width: "100%",
                  marginTop: "10px",
                  background: "linear-gradient(135deg, #4A90D9, #003366)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                🎫 {t.viewCoupon}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
