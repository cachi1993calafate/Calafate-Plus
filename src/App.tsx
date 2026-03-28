import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, LogOut, Settings, Trash2, Edit2, X, Bell, MessageCircle, MapPin, MinusCircle, Users } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

// --- ICONOS ---
const getBizIcon = (category: string) => {
  let color = "#3b82f6"; let iconHtml = "📍";
  const cat = category ? category.toLowerCase().trim() : "";
  if (cat === "gastronomy" || cat === "gastronomía") { color = "#ef4444"; iconHtml = "🍽️"; }
  else if (cat === "shopping" || cat === "compras") { color = "#facc15"; iconHtml = "🛒"; }
  else if (cat === "services" || cat === "servicios") { color = "#06b6d4"; iconHtml = "🛠️"; }
  else { color = "#64748b"; iconHtml = "📦"; } 
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);"><div style="transform: rotate(45deg); font-size: 18px;">${iconHtml}</div></div>`,
    className: "", iconSize: [38, 38], iconAnchor: [19, 38]
  });
};

// Controlador de Mapa con Localización (PUNTO AZUL)
function MapController({ markers, center }: { markers: any[], center: [number, number] }) {
  const map = useMap();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    // Intenta localizar al usuario
    map.locate({ setView: false, watch: true });
    map.on("locationfound", (e) => {
      setUserPos([e.latlng.lat, e.latlng.lng]);
    });
    
    // Ajusta la vista a los marcadores si existen
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    } else {
      map.setView(center, 14);
    }
  }, [markers, map, center]);

  return userPos ? (
    <Circle center={userPos} radius={50} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5 }}>
      <Popup>Estás aquí</Popup>
    </Circle>
  ) : null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "login" | "scanner" | "admin">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coordsInput, setCoordsInput] = useState("");
  const [totalVisits, setTotalVisits] = useState(0);
  const [newBiz, setNewBiz] = useState({ 
    name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, is_active: true 
  });

  const defaultCenter: [number, number] = [-50.338, -72.263];
  const MI_WHATSAPP = "5492966694462"; // TU NÚMERO

  useEffect(() => {
    fetchData();
    // trackPageVisit(); // Podés activar esto si creaste la tabla 'site_stats' en Supabase
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
    const style = document.createElement('style');
    style.innerHTML = `
      #r-scanner_camera_permission_button { background: #3b82f6; color: white; border: none; padding: 10px 20px; borderRadius: 10px; fontWeight: bold; marginTop: 10px; }
      #r-scanner__dashboard_section_csr { display: none !important; }
      video { border-radius: 20px; }
      .table-container::-webkit-scrollbar { display: none; }
    `;
    document.head.appendChild(style);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name', { ascending: true });
    if (data) setBusinesses(data);
    const { data: stats } = await supabase.from("site_stats").select("count").eq("id", 1).single();
    if (stats) setTotalVisits(stats.count);
  };

  const handleSaveBusiness = async () => {
    if(!newBiz.name || !newBiz.phone || !coordsInput) return alert("Faltan datos");
    let lat = -50.338; let lng = -72.263;
    try {
        const parts = coordsInput.split(',').map(p => p.trim());
        lat = parseFloat(parts[0]); lng = parseFloat(parts[1]);
        if (lat > 0) lat *= -1; if (lng > 0) lng *= -1;
    } catch (e) { alert("Error en coordenadas"); return; }

    const dataToSave = { ...newBiz, lat, lng };
    if (editingId) { 
      await supabase.from("businesses").update(dataToSave).eq("id", editingId);
      setEditingId(null); 
    } else { 
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30); 
      await supabase.from("businesses").insert([{ ...dataToSave, expires_at: expiry.toISOString().split('T')[0] }]); 
    }
    fetchData(); 
    setNewBiz({ name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, is_active: true });
    setCoordsInput("");
  };

  const adjustDays = async (biz: any, days: number) => {
    const current = biz.expires_at ? new Date(biz.expires_at) : new Date();
    current.setDate(current.getDate() + days);
    await supabase.from("businesses").update({ expires_at: current.toISOString().split('T')[0], is_active: true }).eq("id", biz.id);
    fetchData();
  };

  const deleteBusiness = async (id: string, name: string) => {
    if(window.confirm(`¿BORRAR DEFINITIVAMENTE "${name}"?`)){
        // El ON DELETE CASCADE se encarga de los logs si usaste el SQL SQL que te pasé
        const { error } = await supabase.from("businesses").delete().eq("id", id);
        if (error) alert("Error: " + error.message);
        else { setBusinesses(businesses.filter(b => b.id !== id)); }
        fetchData();
    }
  };

  const trackClick = async (id: string, column: string, currentVal: number) => {
    await supabase.from("businesses").update({ [column]: (currentVal || 0) + 1 }).eq("id", id);
    fetchData();
  };

  const startEdit = (biz: any) => { 
    setEditingId(biz.id); 
    setNewBiz({ name: biz.name, category: biz.category || "shopping", phone: biz.phone, offer_es: biz.offer_es, discount_pct: biz.discount_pct, is_active: biz.is_active }); 
    setCoordsInput(`${biz.lat}, ${biz.lng}`);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const publicBiz = useMemo(() => { 
    const now = new Date(); 
    return businesses.filter(b => { 
      const isExpired = b.expires_at && new Date(b.expires_at) < now; 
      return b.is_active && !isExpired; 
    }); 
  }, [businesses]);

  const mapMarkers = useMemo(() => publicBiz.filter(b => b.lat && b.lng), [publicBiz]);

  // Lógica del Escáner QR
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner") {
      scanner = new Html5QrcodeScanner("r-scanner", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((text) => {
        window.location.href = text;
        scanner?.clear(); setView("user");
      }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif', overflowX: "hidden" }}>
      {/* HEADER SUPERIOR */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" />
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          {isAdmin ? (
            <>
              <Settings size={24} color="#fbbf24" onClick={() => setView(view === "admin" ? "user" : "admin")} style={{cursor:"pointer"}} />
              <LogOut size={24} color="#ef4444" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin"); setView("user");}} style={{cursor:"pointer"}} />
            </>
          ) : (
            <button onClick={() => {setIsAdmin(true); localStorage.setItem("cachi_admin", "true");}} style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid #3b82f6", padding: "6px 16px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>ADMIN</button>
          )}
        </div>
      </div>

      {view === "scanner" ? (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", padding: "20px" }}>
           <div id="r-scanner" style={{ width: "100%", maxWidth: "400px", borderRadius: "25px", overflow: "hidden" }}></div>
           <button onClick={() => setView("user")} style={{ marginTop: "30px", background: "#ef4444", color: "#fff", padding: "15px 40px", borderRadius: "15px", border: "none", fontWeight: "bold", width: "100%", maxWidth: "400px" }}>CANCELAR</button>
        </div>
      ) : view === "admin" ? (
        /* PANEL ADMIN (RESPETADO CON CONTEO DE DÍAS Y BOTÓN -30) */
        <div style={{ padding: "20px" }}>
          <h2 style={{ color: "#fbbf24", fontWeight: "900", marginBottom: "5px" }}>CONTROL TOTAL</h2>
          <div style={{background:"#1e293b", padding:"10px 15px", borderRadius:"12px", display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"20px"}}>
              <Users size={18} color="#3b82f6"/>
              <span style={{fontSize:"14px"}}>Visitas Web: <b>{totalVisits}</b></span>
          </div>

          <div style={{ background: "#0f172a", padding: "20px", borderRadius: "20px", marginBottom: "30px", border: "1px solid #3b82f6" }}>
            <div style={{ display: "grid", gap: "12px" }}>
              <input value={newBiz.name} placeholder="Nombre del Local" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "14px", borderRadius: "12px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <input value={newBiz.offer_es} placeholder="Promoción (Ej: 15% OFF)" onChange={e => setNewBiz({...newBiz, offer_es: e.target.value})} style={{ padding: "14px", borderRadius: "12px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <input value={newBiz.phone} placeholder="WhatsApp (Ej: 2902401234)" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "14px", borderRadius: "12px", background: "#010b14", border: "1px solid #1e293b", color: "#fff" }} />
              <div style={{ position: "relative" }}>
                <MapPin size={18} style={{ position: "absolute", left: "12px", top: "15px", color: "#3b82f6" }} />
                <input value={coordsInput} placeholder="Pegar coordenadas de Maps" onChange={e => setCoordsInput(e.target.value)} style={{ width: "100%", padding: "14px 14px 14px 40px", borderRadius: "12px", border: "1px solid #3b82f6", background: "#010b14", color: "#fbbf24", boxSizing: "border-box" }} />
              </div>
              <button onClick={handleSaveBusiness} style={{ background: "#3b82f6", color: "#fff", padding: "16px", borderRadius: "12px", fontWeight: "900", border: "none" }}>{editingId ? "GUARDAR CAMBIOS" : "CREAR LOCAL"}</button>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: "auto", background: "#0a1929", borderRadius: "20px", border: "1px solid #1e293b", padding: "10px" }}>
            <table style={{ width: "100%", minWidth: "400px" }}>
              <thead><tr style={{ color: "#64748b", fontSize: "11px" }}><th align="left">NEGOCIO</th><th align="center">W/M/Q</th><th align="right">DIAS / ACCIÓN</th></tr></thead>
              <tbody>
                {businesses.map(biz => {
                  // CÁLCULO DE DÍAS RESTANTES (RECUPERADO)
                  const days = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                  return (
                    <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "12px 5px" }}>
                        <div style={{ fontWeight: "bold", fontSize: "13px" }}>{biz.name}</div>
                        <div style={{ fontSize: "10px", color: days <= 0 ? "#ef4444" : "#22c55e" }}>{days <= 0 ? 'Vencido' : `${days} d. rest.`}</div>
                      </td>
                      <td align="center"><span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "900" }}>{biz.clicks_wa || 0}/{biz.clicks_map || 0}/{biz.clicks_qr || 0}</span></td>
                      <td align="right" style={{ display: "flex", gap: "8px", justifyContent: "flex-end", padding: "12px 0" }}>
                        <Bell size={18} color="#fbbf24" onClick={() => { const msg = `Hola ${biz.name}! Recordatorio de Calafate Plus.`; window.open(`https://wa.me/549${biz.phone}?text=${encodeURIComponent(msg)}`); }} style={{cursor:"pointer"}}/>
                        <Edit2 size={18} color="#3b82f6" onClick={() => startEdit(biz)} style={{cursor:"pointer"}}/>
                        {/* BOTONES DE AGREGAR/QUITAR DÍAS (RESPETADOS) */}
                        <button onClick={() => adjustDays(biz, -30)} style={{background:"#ef4444", color:"#fff", border:"none", borderRadius:"8px", padding:"6px 10px", cursor:"pointer"}}><MinusCircle size={14}/></button>
                        <button onClick={() => adjustDays(biz, 30)} style={{background:"#22c55e", color:"#fff", border:"none", borderRadius:"8px", padding:"6px 10px", fontWeight:"bold", cursor:"pointer"}}>+30</button>
                        <Trash2 size={18} color="#ef4444" onClick={() => deleteBusiness(biz.id, biz.name)} style={{cursor:"pointer"}}/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA USUARIO FINAL (REINCORPORADAS FUNCIONES PERDIDAS) */
        <>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={{ color: "#3b82f6", fontWeight: "900", letterSpacing: "3px", fontSize: "12px", margin: "0 0 5px 0" }}>FULL DESCUENTOS</p>
            <h1 style={{ margin: 0, fontSize: "45px", fontWeight: "900", lineHeight: 0.9 }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
          </header>

          {/* BOTÓN ESCÁNER (REINCORPORADO) */}
          <div style={{ padding: "0 20px", marginBottom:"20px" }}>
            <button onClick={() => setView("scanner")} style={{ background: "#22c55e", color: "#fff", width: "100%", padding: "18px", borderRadius: "20px", border: "none", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "18px", boxShadow: "0 4px 15px rgba(34, 197, 94, 0.4)" }}>
              <Camera size={24}/> ESCANEAR CÓDIGO PROMO
            </button>
          </div>

          {/* BANNER CONTACTO (RESPETADO) */}
          <div style={{ margin: "20px", background: "linear-gradient(135deg, #1e293b 0%, #0a1120 100%)", borderRadius: "25px", padding: "25px", border: "2px solid #3b82f6", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 15px 0", fontSize: "20px", fontWeight: "900", color: "#fff" }}>¿Querés sumar tu negocio?</h2>
            <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}`)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "15px", fontWeight: "900", fontSize: "16px", display: "flex", alignItems: "center", gap: "10px", margin: "0 auto" }}>
              <MessageCircle size={22}/> CONTACTAME
            </button>
          </div>

          <div style={{ height: "250px", margin: "20px", borderRadius: "25px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {mapMarkers.map(b => ( <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} /> ))}
              {/* MAPCONTROLLER CON LOCALIZACIÓN (PUNTO AZUL) */}
              <MapController markers={mapMarkers} center={defaultCenter} />
            </MapContainer>
          </div>

          <main style={{ padding: "20px", paddingBottom: "100px" }}>
            {publicBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "25px", marginBottom: "25px", padding: "20px", border: "1px solid #1e293b", position: "relative" }}>
                <div style={{ position: "absolute", top: "20px", right: "20px", background: "#ef4444", color: "#fff", padding: "5px 12px", borderRadius: "12px", fontWeight: "900", fontSize: "12px" }}>{biz.discount_pct}% OFF</div>
                <h3 style={{ margin: "0", fontSize: "24px", fontWeight: "900" }}>{biz.name}</h3>
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: "5px 0 20px 0" }}>{biz.offer_es}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button onClick={() => {trackClick(biz.id, "clicks_map", biz.clicks_map); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`);}} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "15px", border: "none", fontWeight: "bold", fontSize: "14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}><MapPin size={18}/> MAPA</button>
                  <button onClick={() => {trackClick(biz.id, "clicks_wa", biz.clicks_wa); window.open(`https://wa.me/549${biz.phone}`);}} style={{ background: "none", border: "1.5px solid #22c55e", color: "#22c55e", padding: "12px", borderRadius: "15px", fontWeight: "bold", fontSize: "14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}><MessageCircle size={18}/> WHATSAPP</button>
                </div>
              </div>
            ))}
          </main>
        </>
      )}
    </div>
  );
}
