import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, LogOut, Settings, Trash2, Edit2, X, Bell, MessageCircle, MapPin, MinusCircle } from "lucide-react";
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

// Controlador de Mapa con Localización
function MapController({ markers, center }: { markers: any[], center: [number, number] }) {
  const map = useMap();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    map.locate({ setView: false, watch: true });
    map.on("locationfound", (e) => { setUserPos([e.latlng.lat, e.latlng.lng]); });
    
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [markers, map]);

  return userPos ? (
    <Circle center={userPos} radius={50} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6' }}>
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
  const [newBiz, setNewBiz] = useState({ 
    name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, is_active: true 
  });

  const defaultCenter: [number, number] = [-50.338, -72.263];
  const MI_WHATSAPP = "5492966694462"; // TU NÚMERO CORREGIDO

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name', { ascending: true });
    if (data) setBusinesses(data);
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

  const trackClick = async (id: string, column: string, currentVal: number) => {
    await supabase.from("businesses").update({ [column]: (currentVal || 0) + 1 }).eq("id", id);
    fetchData();
  };

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

      {view === "admin" ? (
        <div style={{ padding: "20px" }}>
          <h2 style={{ color: "#fbbf24", fontWeight: "900" }}>PANEL ADMIN</h2>
          {/* Formulario de Carga */}
          <div style={{ background: "#0f172a", padding: "15px", borderRadius: "20px", marginBottom: "20px", border: "1px solid #1e293b" }}>
             <input value={newBiz.name} placeholder="Nombre" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
             <input value={newBiz.phone} placeholder="WhatsApp del local (Ej: 2902401234)" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
             <input value={coordsInput} placeholder="Lat, Lng de Google Maps" onChange={e => setCoordsInput(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "10px", background: "#010b14", border: "1px solid #3b82f6", color: "#fbbf24" }} />
             <button onClick={handleSaveBusiness} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "15px", borderRadius: "10px", fontWeight: "bold" }}>{editingId ? "ACTUALIZAR" : "CREAR LOCAL"}</button>
          </div>

          <div className="table-container" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "400px" }}>
              <thead><tr style={{ color: "#64748b", fontSize: "12px" }}><th align="left">LOCAL</th><th align="center">W/M/Q</th><th align="right">DIAS / ACCIÓN</th></tr></thead>
              <tbody>
                {businesses.map(biz => (
                  <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 0" }}><b>{biz.name}</b></td>
                    <td align="center" style={{fontSize: "12px", color: "#fbbf24"}}>{biz.clicks_wa || 0}/{biz.clicks_map || 0}/{biz.clicks_qr || 0}</td>
                    <td align="right">
                      <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                        <button onClick={() => adjustDays(biz, -30)} style={{background:"#ef4444", color:"#fff", border:"none", borderRadius:"5px", padding:"5px"}}><MinusCircle size={14}/></button>
                        <button onClick={() => adjustDays(biz, 30)} style={{background:"#22c55e", color:"#fff", border:"none", borderRadius:"5px", padding:"5px", fontWeight:"bold"}}>+30</button>
                        <Trash2 size={18} color="#ef4444" onClick={() => { if(confirm("¿Borrar?")) supabase.from("businesses").delete().eq("id", biz.id).then(()=>fetchData()) }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
          </header>

          {/* BANNER CONTACTO CORREGIDO */}
          <div style={{ margin: "20px", background: "linear-gradient(135deg, #1e293b 0%, #0a1120 100%)", borderRadius: "25px", padding: "20px", border: "2px solid #3b82f6", textAlign: "center" }}>
            <p style={{ margin: "0 0 10px 0", color: "#fff", fontWeight: "bold" }}>¿Querés sumar tu negocio?</p>
            <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}`)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px", margin: "0 auto" }}>
              <MessageCircle size={20}/> CONTACTAME
            </button>
          </div>

          <div style={{ height: "250px", margin: "20px", borderRadius: "25px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {mapMarkers.map(b => ( <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} /> ))}
              <MapController markers={mapMarkers} center={defaultCenter} />
            </MapContainer>
          </div>

          <main style={{ padding: "20px" }}>
            {publicBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "20px", padding: "20px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: "0 0 10px 0" }}>{biz.name} <span style={{ color: "#ef4444", fontSize: "14px" }}>{biz.discount_pct}% OFF</span></h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button onClick={() => {trackClick(biz.id, "clicks_map", biz.clicks_map); window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`);}} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}>UBICACIÓN</button>
                  <button onClick={() => {trackClick(biz.id, "clicks_wa", biz.clicks_wa); window.open(`https://wa.me/549${biz.phone}`);}} style={{ background: "#22c55e", color: "#fff", padding: "12px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}>WHATSAPP</button>
                </div>
              </div>
            ))}
          </main>
        </>
      )}
    </div>
  );
}
