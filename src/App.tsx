import React, { useState, useEffect, useMemo, CSSProperties } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, MapPin, MessageCircle, Camera, CheckCircle, XCircle, Clock, Search, Star, Globe, Settings, LogOut, DollarSign } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const iconBiz = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41], iconAnchor: [12, 41]
});

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ app_title: 'CALAFATE PLUS', app_subtitle: 'FULL DESCUENTOS', app_banner_url: '' });
  const [view, setView] = useState<"user" | "login" | "scanner">("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  
  // Filtro de Admin (Ver solo Vencidos)
  const [adminFilter, setAdminFilter] = useState<"Todos" | "Activos" | "Vencidos">("Todos");

  const CATEGORIES = ["Todos", "Gastronomía", "Alojamiento", "Regalos", "Excursiones", "Otros"];

  useEffect(() => {
    fetchData();
    fetchConfig();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('expires_at', { ascending: true });
    if (data) setBusinesses(data);
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from("app_config").select("key, value");
    if (data) {
      const confObj = data.reduce((acc: any, item: any) => ({ ...acc, [item.key]: item.value }), {});
      setConfig(confObj);
    }
  };

  const handleAction = async (id: string, field: string, currentVal: number) => {
    await supabase.from("businesses").update({ [field]: (currentVal || 0) + 1 }).eq("id", id);
    fetchData();
  };

  const processPayment = async (biz: any) => {
    // Si ya está activo, sumamos 30 días a la fecha de vencimiento actual.
    // Si está vencido o no tiene fecha, sumamos 30 días a partir de hoy.
    const now = new Date();
    const currentExpiry = (biz.expires_at && new Date(biz.expires_at) > now) 
      ? new Date(biz.expires_at) 
      : now;
    
    currentExpiry.setDate(currentExpiry.getDate() + 30);
    
    const { error } = await supabase.from("businesses").update({ 
      expires_at: currentExpiry.toISOString().split('T')[0], 
      is_active: true 
    }).eq("id", biz.id);
    
    if (!error) fetchData();
  };

  const updateConfig = async (key: string, value: string) => {
    await supabase.from("app_config").update({ value }).eq("key", key);
    fetchConfig();
  };

  const filteredBiz = useMemo(() => {
    const now = new Date();
    return businesses.filter(b => {
      // Filtros básicos de usuario
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = catFilter === "Todos" || b.category === catFilter;
      
      if (!matchesSearch || !matchesCategory) return false;

      // Filtros avanzados de Admin
      if (isAdmin) {
        const isVencido = !b.expires_at || new Date(b.expires_at) < now;
        if (adminFilter === "Activos") return !isVencido;
        if (adminFilter === "Vencidos") return isVencido;
      }

      return true; // Si no es admin o adminFilter es 'Todos', mostrar
    });
  }, [businesses, searchTerm, catFilter, isAdmin, adminFilter]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner" && currentScannerId) {
      scanner = new Html5QrcodeScanner(currentScannerId, { fps: 10, qrbox: 250 }, false);
      scanner.render(async (text) => {
        const bizId = currentScannerId.split('-')[1];
        const biz = businesses.find(b => b.id === bizId);
        await handleAction(bizId, 'clicks_qr', biz?.clicks_qr);
        window.location.href = text;
        scanner?.clear();
        setView("user");
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view, currentScannerId, businesses]);

  // ESTILOS PROFESIONALES
  const fullModal: CSSProperties = { position: "fixed", inset: 0, background: "#011627", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };
  const fullModalWhite: CSSProperties = { position: "fixed", inset: 0, background: "#fff", zIndex: 2000, color: "#000", padding: "30px", display: "flex", justifyContent: "center" };
  const headerNav: CSSProperties = { display: "flex", justifyContent: "space-between", padding: "15px 20px", alignItems: "center" };
  const bannerCard: CSSProperties = { margin: "15px", borderRadius: "25px", padding: "30px 20px", textAlign: "center", backgroundSize: "cover", backgroundPosition: "center" };
  const searchBar: CSSProperties = { background: "rgba(255,255,255,0.05)", borderRadius: "15px", padding: "10px 15px", display: "flex", alignItems: "center", marginBottom: "15px" };
  const catScroll: CSSProperties = { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" };
  const bizCard: CSSProperties = { background: "rgba(255,255,255,0.03)", borderRadius: "25px", marginBottom: "25px", overflow: "hidden", position: "relative", border: "1px solid rgba(74,144,217,0.1)" };
  const discountTag: CSSProperties = { position: "absolute", top: "15px", right: "15px", background: "#e74c3c", color: "#fff", width: "55px", height: "55px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", zIndex: 5, fontSize: "14px" };
  
  // Estilos de la Tabla Admin
  const adminTable: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "13px", color: "#fff" };
  const thStyle: CSSProperties = { borderBottom: "1px solid #333", padding: "12px", textAlign: "left", color: "#4A90D9" };
  const trStyle: CSSProperties = { borderBottom: "1px solid #222" };
  const tdStyle: CSSProperties = { padding: "12px" };
  const btnRenew: CSSProperties = { background: "#25D366", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" };

  if (view === "scanner") return (
    <div style={fullModal}>
      <h2 style={{margin: "20px"}}>Validando Descuento...</h2>
      <div id={currentScannerId!} style={{ width: "90%", borderRadius: "20px", overflow: "hidden" }}></div>
      <button onClick={() => setView("user")} style={btnDanger}>CANCELAR</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#011627", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* BARRA SUPERIOR */}
      <div style={headerNav}>
        <Download size={24} color="#4A90D9" />
        {isAdmin ? (
          <div style={{display:"flex", gap:"15px", alignItems:"center"}}>
            <Settings size={22} onClick={() => setShowConfig(true)} style={{cursor:"pointer"}} />
            <LogOut size={22} color="#ff4757" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin");}} style={{cursor:"pointer"}} />
          </div>
        ) : (
          <button onClick={() => setView("login")} style={btnLogin}>ADMIN</button>
        )}
      </div>

      <header style={{ textAlign: "center", padding: "10px 20px" }}>
        <p style={{ color: "#4A90D9", fontWeight: "900", letterSpacing: "3px", fontSize: "12px", marginBottom: "5px" }}>{config.app_subtitle || "FULL DESCUENTOS"}</p>
        <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900", lineHeight: 0.9 }}>
          {(config.app_title || "CALAFATE PLUS").split(' ')[0]}<br/>
          <span style={{color: "#FFD700"}}>{(config.app_title || "CALAFATE PLUS").split(' ')[1]}</span>
        </h1>
      </header>

      {/* BANNER (SOLO PARA USUARIOS) */}
      {!isAdmin && (
        <div style={{...bannerCard, backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${config.app_banner_url || 'https://images.unsplash.com/photo-1516939884455-1445c8652f83'})`}}>
          <h2 style={{fontSize: "20px", margin: 0, fontWeight: "900"}}>TU PASE VIP EN LA CIUDAD</h2>
          <button onClick={() => window.open(`https://wa.me/5492966694462`)} style={btnPrimary}>SUMAR MI COMERCIO</button>
        </div>
      )}

      {/* BUSCADOR Y CATEGORÍAS (COMÚN) */}
      <div style={{padding: "0 20px 20px 20px"}}>
        <div style={searchBar}>
          <Search size={20} color="#777" />
          <input placeholder="Buscar local por nombre..." onChange={e => setSearchTerm(e.target.value)} style={searchInput} />
        </div>
        {!isAdmin && (
          <div style={catScroll}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={c === catFilter ? catBtnActive : catBtn}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* --- PANEL MAESTRO PRIVADO (SOLO ADMIN) --- */}
      {isAdmin && (
        <div style={{ padding: "0 20px 100px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", color: "#fff" }}>Gestión de Comercios</h2>
            <button onClick={() => setShowForm(true)} style={btnGreen}>+ NUEVO LOCAL</button>
          </div>

          {/* FILTROS DE ADMIN */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <button onClick={() => setAdminFilter("Todos")} style={adminFilter === "Todos" ? catBtnActive : catBtn}>Todos ({businesses.length})</button>
            <button onClick={() => setAdminFilter("Activos")} style={adminFilter === "Activos" ? btnGreenSmall : catBtn}>Activos ✔️</button>
            <button onClick={() => setAdminFilter("Vencidos")} style={adminFilter === "Vencidos" ? btnDangerSmall : catBtn}>Vencidos ❌</button>
          </div>

          {/* TABLA DE GESTIÓN CENTRALIZADA */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "15px", padding: "10px", overflowX: "auto" }}>
            <table style={adminTable}>
              <thead>
                <tr>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Comercio</th>
                  <th style={thStyle}>Días Left</th>
                  <th style={thStyle}>Vencimiento</th>
                  <th style={thStyle}>Scans QR</th>
                  <th style={thStyle}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredBiz.map(biz => {
                  const now = new Date();
                  const daysLeft = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - now.getTime()) / (1000*3600*24)) : 0;
                  const active = daysLeft > 0;

                  return (
                    <tr key={biz.id} style={trStyle}>
                      <td style={tdStyle}>
                        {active ? <CheckCircle size={22} color="#25D366" /> : <XCircle size={22} color="#ff4757" />}
                      </td>
                      <td style={{...tdStyle, fontWeight: "bold"}}>
                        {biz.name} {biz.is_featured && <Star size={14} color="#FFD700" fill="#FFD700" />}
                      </td>
                      <td style={{...tdStyle, color: daysLeft < 7 ? "#ff4757" : (daysLeft < 15 ? "#FFD700" : "#fff"), fontWeight: "bold"}}>
                        {daysLeft}d
                      </td>
                      <td style={{...tdStyle, color: "#bbb"}}>
                        {biz.expires_at ? new Date(biz.expires_at).toLocaleDateString() : 'Sin fecha'}
                      </td>
                      <td style={{...tdStyle, textAlign: "center", color: "#4A90D9", fontWeight: "bold"}}>
                        {biz.clicks_qr || 0}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => processPayment(biz)} style={btnRenew}>
                          <DollarSign size={14}/> Cobrar y Activar ✔️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBiz.length === 0 && <p style={{textAlign:"center", padding:"30px", color:"#777"}}>No hay comercios que coincidan con el filtro.</p>}
          </div>
        </div>
      )}

      {/* --- MODO TURISTA (SOLO USUARIOS) --- */}
      {!isAdmin && (
        <main style={{ padding: "0 15px 100px 15px", maxWidth: "600px", margin: "0 auto" }}>
          {filteredBiz.map(biz => {
            const now = new Date();
            const daysLeft = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - now.getTime()) / (1000*3600*24)) : 0;
            const active = daysLeft > 0;
            if (!active) return null; // El turista NO ve locales vencidos.

            return (
              <div key={biz.id} style={{...bizCard, border: biz.is_featured ? "2px solid #FFD700" : "1px solid rgba(74,144,217,0.1)"}}>
                <div style={discountTag}>{biz.discount_short || '10%'}</div>
                <img src={biz.image_url || 'https://via.placeholder.com/400x200'} style={{width:"100%", height:"180px", objectFit:"cover"}} alt={biz.name} />
                <div style={{padding: "15px"}}>
                  <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
                    <h3 style={{margin:0, fontSize: "20px"}}>{biz.name}</h3>
                    {biz.is_featured && <Star size={16} color="#FFD700" fill="#FFD700" />}
                  </div>
                  <p style={{color: "#bbb", fontSize: "13px", margin: "8px 0 15px 0"}}>{biz.offer_es}</p>
                  
                  <button onClick={() => {setCurrentScannerId(`r-${biz.id}`); setView("scanner");}} style={btnQR}>
                    <Camera size={18}/> ACCEDER A LA PROMO (QR)
                  </button>

                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
                    <button onClick={() => {handleAction(biz.id, 'total_clicks', biz.total_clicks); window.open(`https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lng}`)}} style={btnWhite}>📍 MAPA</button>
                    <button onClick={() => {handleAction(biz.id, 'total_clicks', biz.total_clicks); window.open(biz.link_url ? biz.link_url : `https://wa.me/${biz.phone}`)}} style={btnOutline}>
                      {biz.link_url ? <Globe size={18}/> : <MessageCircle size={18}/>} {biz.link_url ? 'WEB' : 'WHATSAPP'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      )}

      {/* --- MODALES Y LOGIN (COMÚN) --- */}
      {showConfig && (
        <div style={fullModalWhite}>
          <div style={{width:"100%", maxWidth:"400px"}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"20px"}}><h2>Personalizar App</h2><X onClick={()=>setShowConfig(false)} style={{cursor:"pointer"}}/></div>
            <label style={lab}>Título Principal</label>
            <input defaultValue={config.app_title} onBlur={e => updateConfig('app_title', e.target.value)} style={inStyle} />
            <label style={lab}>Subtítulo Azul</label>
            <input defaultValue={config.app_subtitle} onBlur={e => updateConfig('app_subtitle', e.target.value)} style={inStyle} />
            <label style={lab}>URL Imagen de Portada</label>
            <input defaultValue={config.app_banner_url} onBlur={e => updateConfig('app_banner_url', e.target.value)} style={inStyle} />
            <button onClick={()=>setShowConfig(false)} style={btnPrimaryFull}>CERRAR Y VER CAMBIOS</button>
          </div>
        </div>
      )}

      {view === "login" && (
        <div style={fullModal}>
          <div style={{width:"80%", maxWidth: "350px"}}>
            <h2 style={{textAlign:"center", marginBottom: "20px"}}>Acceso Maestro</h2>
            <input placeholder="Email Admin" type="email" onChange={e => setEmail(e.target.value)} style={inStyle} />
            <input placeholder="Contraseña" type="password" onChange={e => setPass(e.target.value)} style={inStyle} />
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); localStorage.setItem("cachi_admin","true"); setView("user");}else{alert("Credenciales incorrectas");}}} style={btnPrimaryFull}>INGRESAR AL PANEL</button>
            <button onClick={()=>setView("user")} style={{width:"100%", marginTop:"20px", background:"none", border:"none", color:"#fff", opacity:0.5}}>Volver a la App</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ESTILOS DE BOTONES ADICIONALES
const btnLogin: CSSProperties = { background: "rgba(74,144,217,0.1)", color: "#4A90D9", border: "1px solid #4A90D9", padding: "5px 15px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" };
const btnPrimary: CSSProperties = { background: "#FFD700", color: "#000", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "900", marginTop: "12px", fontSize: "14px" };
const btnPrimaryFull: CSSProperties = { width: "100%", background: "#4A90D9", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", fontWeight: "900", marginTop: "10px" };
const searchInput: CSSProperties = { background: "none", border: "none", color: "#fff", marginLeft: "10px", width: "100%", outline: "none" };
const catBtn: CSSProperties = { background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", padding: "8px 15px", borderRadius: "10px", whiteSpace: "nowrap", fontSize: "13px", cursor: "pointer" };
const catBtnActive: CSSProperties = { background: "#4A90D9", border: "none", color: "#fff", padding: "8px 15px", borderRadius: "10px", whiteSpace: "nowrap", fontWeight: "bold", fontSize: "13px", cursor: "pointer" };
const btnGreen: CSSProperties = { background: "#25D366", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" };
const btnGreenSmall: CSSProperties = { background: "#25D366", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "10px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" };
const btnDangerSmall: CSSProperties = { background: "#e74c3c", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "10px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" };
const btnQR: CSSProperties = { width: "100%", background: "#25D366", color: "#fff", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "900", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" };
const btnWhite: CSSProperties = { background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", fontSize: "14px" };
const btnOutline: CSSProperties = { background: "none", border: "1px solid #25D366", color: "#25D366", padding: "12px", borderRadius: "12px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontSize: "14px" };
const inStyle: CSSProperties = { width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #ccc", color: "#000", boxSizing: "border-box" };
const lab: CSSProperties = { fontSize: "12px", fontWeight: "bold", color: "#666", display: "block", marginTop: "10px" };
const btnDanger: CSSProperties = { marginTop: "30px", background: "#e74c3c", color: "#fff", border: "none", padding: "15px 40px", borderRadius: "12px", fontWeight: "bold" };
