import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, LogOut, Settings, Trash2, Edit2, X, Bell, MessageCircle, MapPin, BarChart3, Users, Calendar } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

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

function MapController({ markers, center }: { markers: any[], center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    } else { map.setView(center, 14); }
  }, [markers, map, center]);
  return null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "login" | "scanner" | "admin">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentScannerId, setCurrentScannerId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [totalVisits, setTotalVisits] = useState(0);
  
  const [coordsInput, setCoordsInput] = useState("");
  const [newBiz, setNewBiz] = useState({ 
    name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, is_active: true 
  });

  const defaultCenter: [number, number] = [-50.338, -72.263];

  useEffect(() => {
    fetchData();
    trackPageVisit();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
    const style = document.createElement('style');
    style.innerHTML = `
      #r-scanner_camera_permission_button { background: #3b82f6; color: white; border: none; padding: 10px 20px; borderRadius: 10px; }
      video { border-radius: 20px; }
      .table-container::-webkit-scrollbar { display: none; }
      .admin-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 20px; margin-bottom: 20px; }
    `;
    document.head.appendChild(style);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name', { ascending: true });
    if (data) setBusinesses(data);
    
    // Obtener visitas totales (de una tabla que podrías crear llamada 'site_stats')
    const { data: stats } = await supabase.from("site_stats").select("count").eq("id", 1).single();
    if (stats) setTotalVisits(stats.count);
  };

  const trackPageVisit = async () => {
    // Incrementa el contador global de la página
    await supabase.rpc('increment_site_visits'); 
  };

  const handleSaveBusiness = async () => {
    if(!newBiz.name || !newBiz.phone || !coordsInput) return alert("Faltan datos");
    let lat = -50.338; let lng = -72.263;
    try {
        const parts = coordsInput.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            lat = parseFloat(parts[0]); lng = parseFloat(parts[1]);
            if (lat > 0) lat *= -1; if (lng > 0) lng *= -1;
        }
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

  const deleteBusiness = async (id: string, name: string) => {
    if(window.confirm(`¿BORRAR DEFINITIVAMENTE "${name}"?`)){
        // El ON DELETE CASCADE se encarga de los click_logs solo si usaste el comando SQL que te pasé
        const { error } = await supabase.from("businesses").delete().eq("id", id);
        if (error) alert("Error: " + error.message);
        else { setBusinesses(businesses.filter(b => b.id !== id)); alert("Eliminado."); }
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

  // LÓGICA DE FILTRADO: Solo muestra si está activo y NO ha vencido
  const publicBiz = useMemo(() => { 
    const now = new Date(); 
    return businesses.filter(b => { 
      const isExpired = b.expires_at && new Date(b.expires_at) < now; 
      return b.is_active && !isExpired; 
    }); 
  }, [businesses]);

  const mapMarkers = useMemo(() => publicBiz.filter(b => b.lat && b.lng), [publicBiz]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" />
        <div onClick={() => setView(view === "admin" ? "user" : "admin")} style={{cursor:"pointer"}}>
            {isAdmin ? <Settings size={26} color="#fbbf24" /> : <span style={{fontSize:"12px", color:"#3b82f6", fontWeight:"bold"}}>ADMIN</span>}
        </div>
      </div>

      {view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <header style={{marginBottom:"30px"}}>
            <h2 style={{ color: "#fbbf24", fontWeight: "900", margin:0 }}>PANEL PROFESIONAL</h2>
            <div style={{display:"flex", gap:"15px", marginTop:"10px"}}>
                <div style={{background:"#1e293b", padding:"10px 15px", borderRadius:"12px", display:"flex", alignItems:"center", gap:"8px"}}>
                    <Users size={18} color="#3b82f6"/>
                    <span style={{fontSize:"14px"}}>Visitas Web: <b>{totalVisits}</b></span>
                </div>
            </div>
          </header>

          {/* FORMULARIO */}
          <div className="admin-card">
            <h3 style={{marginTop:0, fontSize:"16px", color:"#94a3b8"}}>Carga de Locales</h3>
            <div style={{ display: "grid", gap: "12px" }}>
              <input value={newBiz.name} placeholder="Nombre del Negocio" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #1e293b", background: "#010b14", color: "#fff", boxSizing:"border-box" }} />
              <input value={newBiz.offer_es} placeholder="Promoción (Ej: 20% OFF en Pizzas)" onChange={e => setNewBiz({...newBiz, offer_es: e.target.value})} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #1e293b", background: "#010b14", color: "#fff", boxSizing:"border-box" }} />
              <div style={{ position: "relative" }}>
                <MapPin size={18} style={{ position: "absolute", left: "12px", top: "15px", color: "#3b82f6" }} />
                <input value={coordsInput} placeholder="Pegar desde Google Maps" onChange={e => setCoordsInput(e.target.value)} style={{ width: "100%", padding: "14px 14px 14px 40px", borderRadius: "12px", border: "2px solid #3b82f6", background: "#010b14", color: "#fbbf24", boxSizing: "border-box" }} />
              </div>
              <button onClick={handleSaveBusiness} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "16px", borderRadius: "12px", fontWeight: "900", border:"none" }}>
                {editingId ? "ACTUALIZAR DATOS" : "CREAR Y ACTIVAR"}
              </button>
            </div>
          </div>

          {/* TABLA DE MÉTRICAS MENSÚALES */}
          <div className="table-container" style={{ background: "#0a1929", borderRadius: "20px", padding: "15px", border: "1px solid #1e293b" }}>
            <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"15px", color:"#94a3b8"}}>
                <BarChart3 size={18}/> <span style={{fontSize:"14px", fontWeight:"bold"}}>Métricas Mensuales (W / M / Q)</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#64748b", fontSize: "11px", textAlign:"left" }}>
                  <th style={{padding:"10px"}}>LOCAL</th>
                  <th style={{textAlign:"center"}}>ESTADO</th>
                  <th style={{textAlign:"center"}}>CLICKS</th>
                  <th style={{textAlign:"right"}}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(biz => {
                  const days = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                  const active = days > 0;
                  return (
                    <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "15px 5px" }}>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>{biz.name}</div>
                        <div style={{ fontSize: "11px", color: active ? "#22c55e" : "#ef4444" }}>{active ? `${days} días` : 'Vencido'}</div>
                      </td>
                      <td align="center">
                         <div style={{width:"10px", height:"10px", borderRadius:"50%", background: active ? "#22c55e" : "#ef4444", margin:"0 auto"}}></div>
                      </td>
                      <td align="center">
                        <span style={{ fontSize: "12px", fontWeight: "900", color: "#fbbf24" }}>{biz.clicks_wa || 0}/{biz.clicks_map || 0}/{biz.clicks_qr || 0}</span>
                      </td>
                      <td align="right">
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                          <Edit2 size={18} color="#3b82f6" onClick={() => startEdit(biz)} style={{cursor:"pointer"}} />
                          <Trash2 size={18} color="#ef4444" onClick={() => deleteBusiness(biz.id, biz.name)} style={{cursor:"pointer"}} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA USUARIO (MAPA Y LISTA) */
        <div style={{ padding: "0 20px 100px 20px" }}>
            <header style={{ textAlign: "center", marginBottom: "30px" }}>
                <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900", letterSpacing:"-1px" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
                <p style={{color:"#94a3b8", fontSize:"14px"}}>Descuentos exclusivos en la ciudad</p>
            </header>

            <div style={{ height: "300px", borderRadius: "25px", overflow: "hidden", border: "2px solid #1e293b", marginBottom:"30px" }}>
                <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
                    {mapMarkers.map(b => ( 
                        <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)}>
                            <Popup><div style={{color:"#000"}}><b>{b.name}</b><br/>{b.offer_es}</div></Popup>
                        </Marker> 
                    ))}
                    <MapController markers={mapMarkers} center={defaultCenter} />
                </MapContainer>
            </div>

            <div style={{display:"grid", gap:"20px"}}>
                {publicBiz.map(biz => (
                    <div key={biz.id} style={{ background: "#0a1929", borderRadius: "25px", padding: "20px", border: "1px solid #1e293b" }}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"start"}}>
                            <h3 style={{margin:0, fontSize:"22px", fontWeight:"900"}}>{biz.name}</h3>
                            <span style={{background:"#ef4444", padding:"4px 10px", borderRadius:"10px", fontSize:"12px", fontWeight:"bold"}}>{biz.discount_pct}% OFF</span>
                        </div>
                        <p style={{color:"#94a3b8", margin:"10px 0 20px 0"}}>{biz.offer_es}</p>
                        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
                            <button onClick={() => trackClick(biz.id, 'clicks_wa', biz.clicks_wa)} style={{background:"#22c55e", border:"none", color:"#fff", padding:"12px", borderRadius:"12px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px"}}><MessageCircle size={18}/> WhatsApp</button>
                            <button onClick={() => trackClick(biz.id, 'clicks_map', biz.clicks_map)} style={{background:"#fff", border:"none", color:"#000", padding:"12px", borderRadius:"12px", fontWeight:"bold", display:"flex", alignItems:"center", justifyContent:"center", gap:"5px"}}><MapPin size={18}/> Ubicación</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
