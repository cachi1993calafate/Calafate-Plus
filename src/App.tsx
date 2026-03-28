import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, Camera, LogOut, Settings, Trash2, MessageCircle, Search, LayoutGrid } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

const userIcon = L.divIcon({
  html: `<div style="background: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
  className: "", iconSize: [18, 18], iconAnchor: [9, 9]
});

const getBizIcon = (category: string) => {
  let color = "#3b82f6"; let icon = "📍";
  const cat = category?.toLowerCase() || "";
  if (cat.includes("gastro")) { color = "#ef4444"; icon = "🍽️"; }
  else if (cat.includes("compra") || cat.includes("shop") || cat.includes("regal")) { color = "#facc15"; icon = "🛒"; }
  else if (cat.includes("serv") || cat.includes("const")) { color = "#06b6d4"; icon = "🛠️"; }
  else if (cat.includes("pana")) { color = "#f97316"; icon = "🍞"; }
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white;"><div style="transform: rotate(45deg); font-size: 16px;">${icon}</div></div>`,
    className: "", iconSize: [36, 36], iconAnchor: [18, 36]
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

  return userPos ? <Marker position={userPos} icon={userIcon}><Popup>Estás acá</Popup></Marker> : null;
}

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"user" | "scanner" | "admin">("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCat, setActiveCat] = useState("todos");
  const [coordsInput, setCoordsInput] = useState("");
  const [newBiz, setNewBiz] = useState({ name: "", category: "compras", phone: "", offer_es: "", discount_pct: 10, is_active: true });

  const MI_WHATSAPP = "5492966694462";
  const categorias = [
    { id: "todos", label: "Todos", icon: <LayoutGrid size={16}/> },
    { id: "gastronomía", label: "Gastronomía", icon: "🍽️" },
    { id: "compras", label: "Compras", icon: "🛒" },
    { id: "servicios", label: "Servicios", icon: "🛠️" },
    { id: "construcción", label: "Construcción", icon: "🏗️" },
    { id: "cuidado personal", label: "✂️ Cuidado Personal", icon: "" },
    { id: "regalería", label: "🎁 Regalería", icon: "" },
    { id: "emprendedores", label: "🚀 Emprendedores", icon: "" },
    { id: "varios", label: "💰 Varios", icon: "" },
    { id: "panaderia", label: "🍞 Panadería", icon: "" }
  ];

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('name', { ascending: true });
    if (data) setBusinesses(data);
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

    const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
    await supabase.from("businesses").insert([{ ...newBiz, lat, lng, expires_at: expiry.toISOString().split('T')[0] }]);
    fetchData(); 
    setNewBiz({ name: "", category: "compras", phone: "", offer_es: "", discount_pct: 10, is_active: true });
    setCoordsInput("");
  };

  const deleteBusiness = async (id: string) => {
    if (!confirm("¿Borrar local?")) return;
    await supabase.from("click_logs").delete().eq("business_id", id);
    await supabase.from("businesses").delete().eq("id", id);
    fetchData();
  };

  const filteredBiz = useMemo(() => {
    const now = new Date();
    return businesses.filter(b => {
      const isExpired = b.expires_at && new Date(b.expires_at) < now;
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = activeCat === "todos" || b.category.toLowerCase() === activeCat.toLowerCase();
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
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif', paddingBottom: "60px" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 20px", alignItems: "center" }}>
        <Download size={22} color="#3b82f6" />
        <Settings size={24} color={view === "admin" ? "#fbbf24" : "#64748b"} onClick={() => setView(view === "admin" ? "user" : "admin")} style={{cursor:"pointer"}} />
      </div>

      {view === "scanner" ? (
        <div style={{ padding: "20px" }}>
           <div id="r-scanner" style={{ width: "100%", borderRadius: "20px", overflow: "hidden" }}></div>
           <button onClick={() => setView("user")} style={{ width: "100%", marginTop: "20px", background: "#ef4444", color: "#fff", padding: "15px", borderRadius: "15px", border: "none", fontWeight: "bold" }}>CANCELAR</button>
        </div>
      ) : view === "admin" ? (
        <div style={{ padding: "0 20px" }}>
          <h2 style={{ color: "#fbbf24", fontWeight: "900", textAlign: "center" }}>PANEL CONTROL</h2>
          <div style={{ background: "#0f172a", padding: "15px", borderRadius: "20px", border: "1px solid #1e293b", marginBottom: "20px" }}>
            <div style={{ display: "grid", gap: "10px" }}>
              <input value={newBiz.name} placeholder="Nombre" onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
              <input value={newBiz.phone} placeholder="WhatsApp" onChange={e => setNewBiz({...newBiz, phone: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }} />
              <select value={newBiz.category} onChange={e => setNewBiz({...newBiz, category: e.target.value})} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #333", color: "#fff" }}>
                {categorias.filter(c => c.id !== "todos").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input value={coordsInput} placeholder="Lat, Lng" onChange={e => setCoordsInput(e.target.value)} style={{ padding: "12px", borderRadius: "10px", background: "#010b14", border: "1px solid #3b82f6", color: "#fbbf24" }} />
              <button onClick={handleSaveBusiness} style={{ background: "#3b82f6", padding: "14px", borderRadius: "10px", fontWeight: "bold", border: "none", color: "#fff" }}>AGREGAR LOCAL</button>
            </div>
          </div>
          {businesses.map(biz => (
            <div key={biz.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1e293b" }}>
              <span>{biz.name}</span>
              <Trash2 size={20} color="#ef4444" onClick={() => deleteBusiness(biz.id)} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={{ color: "#fbbf24", fontWeight: "900", fontSize: "14px", letterSpacing: "3px", margin: 0 }}>FULL DESCUENTOS</p>
            <h1 style={{ margin: 0, fontSize: "44px", fontWeight: "900" }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
          </header>

          <div style={{ margin: "0 20px 15px 20px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "14px", top: "14px", color: "#475569" }} size={20} />
            <input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "14px 14px 14px 45px", borderRadius: "15px", background: "#0f172a", border: "1px solid #1e293b", color: "#fff", outline: "none" }} />
          </div>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "0 20px 20px 20px" }} className="hide-scroll">
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ whiteSpace: "nowrap", padding: "10px 16px", borderRadius: "20px", border: "none", background: activeCat === cat.id ? "#3b82f6" : "#0f172a", color: "#fff", display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ height: "230px", margin: "0 20px 20px 20px", borderRadius: "25px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <MapContainer center={[-50.338, -72.263]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
              {filteredBiz.map(b => b.lat && b.lng && ( <Marker key={b.id} position={[b.lat, b.lng]} icon={getBizIcon(b.category)} /> ))}
              <MapController markers={filteredBiz.filter(b => b.lat && b.lng)} />
            </MapContainer>
          </div>

          {/* CUADRO CONTACTO CORREGIDO */}
          <div style={{ margin: "20px", background: "linear-gradient(135deg, #1e293b 0%, #0a1120 100%)", borderRadius: "20px", padding: "15px 20px", border: "2px solid #3b82f6", textAlign: "center" }}>
            <p style={{ color: "#fff", fontWeight: "900", marginBottom: "12px", fontSize: "20px" }}>¿QUERÉS SUMAR TU NEGOCIO?</p>
            <button onClick={() => window.open(`https://wa.me/${MI_WHATSAPP}`)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "12px 30px", borderRadius: "12px", fontWeight: "900", display: "flex", alignItems: "center", gap: "10px", margin: "0 auto", fontSize: "18px" }}>
              <MessageCircle size={22}/> CONTACTAME
            </button>
          </div>

          <main style={{ padding: "0 20px 80px 20px" }}>
            {filteredBiz.map(biz => (
              <div key={biz.id} style={{ background: "#0a1929", borderRadius: "20px", marginBottom: "15px", padding: "20px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "900" }}>{biz.name}</h3>
                   <span style={{ color: "#ef4444", fontSize: "18px", fontWeight: "900" }}>{biz.discount_pct}% OFF</span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: "5px 0 15px 0" }}>{biz.offer_es || "Aprovechá este descuento especial"}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button onClick={() => window.open(`https://www.google.com/maps?q=${biz.lat},${biz.lng}`)} style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "900" }}>UBICACIÓN</button>
                  <button onClick={() => window.open(`https://wa.me/549${biz.phone}`)} style={{ background: "#22c55e", color: "#fff", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "900" }}>WHATSAPP</button>
                </div>
              </div>
            ))}
          </main>

          {/* BOTÓN ESCÁNER FIJO ABAJO */}
          <div style={{ position: "fixed", bottom: "20px", left: "20px", right: "20px", zIndex: 1000 }}>
            <button onClick={() => setView("scanner")} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "18px", borderRadius: "20px", border: "none", fontWeight: "900", fontSize: "17px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", boxShadow: "0 5px 15px rgba(0,0,0,0.5)" }}>
              <Camera size={24}/> ESCANEAR QR EN LOCAL
            </button>
          </div>
        </>
      )}
    </div>
  );
}
