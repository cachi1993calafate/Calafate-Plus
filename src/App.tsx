import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, LogOut, Settings, Trash2, MessageCircle, MinusCircle, Search, LayoutGrid } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const userIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(59,130,246,0.9);"></div>`,
  className: "", iconSize: [20, 20], iconAnchor: [10, 10]
});

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

function MapController({ markers }: { markers: any[] }) {
  const map = useMap();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    map.locate({ setView: false, watch: true, enableHighAccuracy: true });
    map.on("locationfound", (e) => setUserPos([e.latlng.lat, e.latlng.lng]));
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [markers, map]);

  return userPos ? <Marker position={userPos} icon={userIcon}><Popup>Estás aquí</Popup></Marker> : null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "scanner" | "admin">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  const [coordsInput, setCoordsInput] = useState("");
  const [newBiz, setNewBiz] = useState({ name: "", category: "shopping", phone: "", offer_es: "", discount_pct: 10, is_active: true });

  const MI_WHATSAPP = "5492966694462";
  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={16}/> },
    { id: "shopping", label: "Compras", icon: "🛒" },
    { id: "gastronomy", label: "Gastronomía", icon: "🍽️" },
    { id: "services", label: "Servicios", icon: "🛠️" }
  ];

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name', { ascending: true });
    if (data) {
      const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
      setBusinesses(uniqueData);
    }
  };

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
  }, []);

  const handleSaveBusiness = async () => {
    if(!newBiz.name || !newBiz.phone || !coordsInput) return alert("Faltan datos");
    let lat, lng;
    try {
        const parts = coordsInput.split(',').map(p => p.trim());
        lat = parseFloat(parts[0]); lng = parseFloat(parts[1]);
        if (lat > 0) lat *= -1; if (lng > 0) lng *= -1;
    } catch (e) { alert("Error en coordenadas"); return; }

    await supabase.from("businesses").insert([{ ...newBiz, lat, lng, expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] }]);
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

  const filteredBiz = useMemo(() => {
    const now = new Date();
    return businesses.filter(b => {
      const isExpired = b.expires_at && new Date(b.expires_at) < now;
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category === activeCat;
      return b.is_active && !isExpired && matchesSearch && matchesCat;
    });
  }, [businesses, searchTerm, activeCat]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (view === "scanner") {
      scanner = new Html5QrcodeScanner("r-scanner", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((text) => { window.location.href = text; scanner?.clear(); setView("user"); }, () => {});
    }
    return () => { scanner?.clear().catch(() => {}); };
  }, [view]);

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center" }}>
        <Download size={24} color="#3b82f6" />
        {isAdmin ? (
          <div style={{ display: "flex", gap: "15px" }}>
            <Settings size={24} color="#fbbf24" onClick={() => setView(view === "admin" ? "user" : "admin")} style={{cursor:"pointer"}} />
            <LogOut size={24} color="#ef4444" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin"); setView("user");}} style={{cursor:"pointer"}} />
          </div>
        ) : (
          <button onClick={() => {setIsAdmin(true); localStorage.setItem("cachi_admin", "true");}} style={{ background: "none", color: "#3b82f6", border: "1px solid #3b82f6", padding: "5px 12px", borderRadius: "15px", fontSize: "12px" }}>ADMIN</button>
        )}
      </div>

      {view === "scanner" ? (
        <div style={{ height: "100vh", padding: "20px" }}>
           <div id="r-scanner" style={{ width: "100%", borderRadius: "20px", overflow: "hidden" }}></div>
           <button onClick={() => setView("user")} style={{ width: "100%", marginTop: "20px", background: "#ef4444", color: "#fff", padding: "15px", borderRadius: "15px", border: "none", fontWeight: "bold" }}>CERRAR</button>
        </div>
      ) : view === "admin" ? (
        /* PANEL ADMIN */
        <div style={{ padding: "20px" }}>
          <h2 style={{ color: "#fbbf24", fontWeight: "900" }}>PANEL ADMIN</h2>
          <div style={{ background: "#0f172a", padding: "15px", borderRadius: "20px", border: "1px solid #3b82f6", marginBottom: "20px" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              <input value={newBiz.name} placeholder="Nombre" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
              <input value={newBiz.phone} placeholder="WhatsApp" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
              <input value={coordsInput} placeholder="Lat, Lng de Maps" onChange={e => setCoordsInput(e.target.value)} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #3b82f6", color: "#fbbf24" }} />
              <button onClick={handleSaveBusiness} style={{ background: "#3b82f6", padding: "14px", borderRadius: "10px", fontWeight: "bold", border: "none", color: "#fff" }}>CREAR LOCAL</button>
            </div>
          </div>
          <table style={{ width: "100%" }}>
            <tbody>
              {businesses.map(biz => (
                <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 0" }}><b>{biz.name}</b></td>
                  <td align="right">
                    <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                      <button onClick={() => adjustDays(biz, 30)} style={{background:"#22c55e", color:"#fff", border:"none", borderRadius:"5px", padding:"5px"}}>+30 d.</button>
                      <Trash2 size={18} color="#ef4444" onClick={() => supabase.from("businesses").delete().eq("id", biz.id).then(()=>fetchData())} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* VISTA USUARIO FINAL */
        <>
          <header style={{ textAlign: "center", marginBottom: "15px" }}>
            <h1 style={{ margin: 0, fontSize: "40px", fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "5px" }}>Guía Comercial y Descuentos</p>
          </header>

          {/* BUSCADOR */}
          <div style={{ margin: "0 20px 15px 20px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "12px", top: "12px", color: "#64748b" }} size={20} />
            <input 
              placeholder="Buscar negocio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "15px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
            />
          </div>

          {/* CATEGORÍAS */}
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px 20px" }} className="hide-scroll">
            {categorias.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                style={{ 
                  whiteSpace: "nowrap", padding: "8px 16px", borderRadius: "20px", border: "none", 
                  background: activeCat === cat.id ? "#3b82f6" : "#0f172a", 
                  color: "#fff", display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold" 
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ height: "230px", margin: "0 20px 20px 20px", borderRadius: "25px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {filteredBiz.filter(b => b.lat && b.lng).map(b => ( <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} /> ))}
              <MapController markers={filteredBiz.filter(b => b.lat && b.lng)} />
            </MapContainer>
          </div>

          <div style={{ margin: "20px", background: "linear-gradient(135deg, #1e293b 0%, #0a1120 100%)", borderRadius: "25px", padding: "20px", border: "2px solid #3b82f6", textAlign: "center" }}>
            <p style={{ color: "#fff", fontWeight: "bold", marginBottom: "10px", fontSize: "18px" }}>¿Querés sumar tu negocio?</p>
            <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}`)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "12px", fontWeight: "900", display: "flex", alignItems: "center", gap: "8px", margin: "0 auto", fontSize: "16px" }}>
              <MessageCircle size={20}/> CONTACTAME
            </button>
          </div>

          <main style={{ padding: "0 20px 100px 20px" }}>
            {filteredBiz.length > 0 ? filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "20px", padding: "20px", border: "1px solid #1e293b" }}>
                <h3 style={{ margin: "0", fontSize: "22px", fontWeight: "900" }}>{biz.name} <span style={{ color: "#ef4444", fontSize: "16px" }}>{biz.discount_pct}% OFF</span></h3>
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: "5px 0 15px 0" }}>{biz.offer_es}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>UBICACIÓN</button>
                  <button onClick={() => window.open(`https://wa.me/549${biz.phone}`)} style={{ background: "#22c55e", color: "#fff", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>WHATSAPP</button>
                </div>
              </div>
            )) : <p style={{ textAlign: "center", color: "#64748b" }}>No se encontraron negocios.</p>}

            <button onClick={() => setView("scanner")} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "18px", borderRadius: "20px", border: "none", fontWeight: "900", fontSize: "16px", marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <Camera size={24}/> ESCANEAR QR EN LOCAL
            </button>
          </main>
        </>
      )}
    </div>
  );
}
