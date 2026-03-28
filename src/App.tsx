import React, { useState, useEffect, useMemo, CSSProperties } from "react";
import { supabase } from "./supabase";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Download, X, MessageCircle, Camera, CheckCircle, XCircle, Search, Star, Globe, Settings, LogOut, DollarSign } from "lucide-react";

export default function CalafatePlus() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ app_title: 'CALAFATE PLUS', app_subtitle: 'FULL DESCUENTOS' });
  const [view, setView] = useState<"user" | "login">("user");
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const CATEGORIES = ["Todos", "Gastronomía", "Alojamiento", "Regalos", "Excursiones", "Otros"];

  useEffect(() => {
    fetchData();
    if (localStorage.getItem("cachi_admin") === "true") setIsAdmin(true);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("businesses").select("*").order('is_featured', { ascending: false });
    if (data) setBusinesses(data);
  };

  const processPayment = async (biz: any) => {
    const now = new Date();
    const currentExpiry = (biz.expires_at && new Date(biz.expires_at) > now) ? new Date(biz.expires_at) : now;
    currentExpiry.setDate(currentExpiry.getDate() + 30);
    await supabase.from("businesses").update({ expires_at: currentExpiry.toISOString().split('T')[0], is_active: true }).eq("id", biz.id);
    fetchData();
  };

  const filteredBiz = useMemo(() => {
    return businesses.filter(b => 
      (catFilter === "Todos" || b.category === catFilter) &&
      (b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [businesses, searchTerm, catFilter]);

  // ESTILOS RESPETANDO TU DISEÑO ORIGINAL
  const bizCard: CSSProperties = { background: "#0a1929", borderRadius: "20px", marginBottom: "20px", padding: "15px", border: "1px solid #1e293b" };
  const btnPromo: CSSProperties = { background: "#22c55e", color: "#fff", width: "100%", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" };
  const adminPanel: CSSProperties = { background: "rgba(34, 197, 94, 0.1)", borderRadius: "20px", padding: "20px", marginTop: "40px", border: "1px solid #22c55e" };

  return (
    <div style={{ minHeight: "100vh", background: "#010b14", color: "#fff", fontFamily: 'sans-serif', paddingBottom: "50px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px" }}>
        <Download size={24} color="#3b82f6" />
        {isAdmin ? <LogOut size={24} color="#ef4444" onClick={() => {setIsAdmin(false); localStorage.removeItem("cachi_admin");}} /> : 
        <button onClick={() => setView("login")} style={{ background: "rgba(59,130,246,0.2)", color: "#3b82f6", border: "1px solid #3b82f6", padding: "5px 15px", borderRadius: "20px", fontSize: "12px" }}>ADMIN</button>}
      </div>

      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2 style={{ color: "#3b82f6", fontSize: "14px", letterSpacing: "2px", margin: 0 }}>FULL DESCUENTOS</h2>
        <h1 style={{ fontSize: "48px", fontWeight: "900", margin: 0 }}>CALAFATE <span style={{ color: "#fbbf24" }}>PLUS</span></h1>
      </div>

      {/* BANNER ORIGINAL */}
      <div style={{ background: "#fbbf24", margin: "20px", borderRadius: "25px", padding: "30px", textAlign: "center", color: "#000" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "900", margin: "0 0 15px 0" }}>¿QUERÉS VENDER MÁS?</h2>
        <button style={{ background: "#000", color: "#fff", padding: "10px 25px", borderRadius: "30px", border: "none", fontWeight: "bold" }}>CONTACTARME</button>
      </div>

      {/* BUSCADOR */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ background: "#0f172a", borderRadius: "15px", padding: "12px", display: "flex", alignItems: "center", marginBottom: "15px" }}>
          <Search size={20} color="#64748b" />
          <input placeholder="Buscar local por nombre..." onChange={e => setSearchTerm(e.target.value)} style={{ background: "none", border: "none", color: "#fff", marginLeft: "10px", width: "100%", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", marginBottom: "20px" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ background: c === catFilter ? "#3b82f6" : "#1e293b", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "10px", whiteSpace: "nowrap" }}>{c}</button>
          ))}
        </div>
      </div>

      {/* LISTA DE LOCALES (SIEMPRE VISIBLE) */}
      <main style={{ padding: "0 20px" }}>
        {filteredBiz.map(biz => (
          <div key={biz.id} style={bizCard}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "22px" }}>{biz.name}</h3>
                  <p style={{ color: "#94a3b8", fontSize: "14px", margin: "5px 0" }}>10% de descuento</p>
                </div>
                <div style={{ width: "50px", height: "50px", background: "#ef4444", borderRadius: "50%" }}></div>
             </div>
             
             <button style={btnPromo}><Camera size={20}/> ACCEDER A LA PROMO</button>
             
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button style={{ background: "#fff", color: "#000", padding: "12px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>MAPA</button>
                <button style={{ background: "none", border: "1px solid #22c55e", color: "#22c55e", padding: "12px", borderRadius: "12px", fontWeight: "bold" }}>WHATSAPP</button>
             </div>
          </div>
        ))}
      </main>

      {/* PANEL ADMIN (SOLO ABAJO SI ESTÁS LOGUEADO) */}
      {isAdmin && (
        <div style={adminPanel}>
          <h3 style={{ marginTop: 0 }}>Panel de Gestión</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "10px" }}>Local</th>
                  <th style={{ textAlign: "center", padding: "10px" }}>Días</th>
                  <th style={{ textAlign: "right", padding: "10px" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map(biz => {
                  const daysLeft = biz.expires_at ? Math.ceil((new Date(biz.expires_at).getTime() - new Date().getTime()) / (1000*3600*24)) : 0;
                  return (
                    <tr key={biz.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px" }}>{biz.name}</td>
                      <td style={{ padding: "10px", textAlign: "center", fontWeight: "bold", color: daysLeft > 0 ? "#22c55e" : "#ef4444" }}>{daysLeft}d</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button onClick={() => processPayment(biz)} style={{ background: "#22c55e", border: "none", color: "#fff", padding: "5px 10px", borderRadius: "5px", fontSize: "10px" }}>+30 DÍAS</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {view === "login" && (
        <div style={{ position: "fixed", inset: 0, background: "#010b14", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "80%", maxWidth: "350px" }}>
            <h2 style={{ textAlign: "center" }}>Acceso Admin</h2>
            <input placeholder="Usuario" onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff" }} />
            <input type="password" placeholder="Clave" onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: "15px", margin: "10px 0", borderRadius: "12px", border: "1px solid #1e293b", background: "#0f172a", color: "#fff" }} />
            <button onClick={() => {if(email==="admin@calafateplus.com" && pass==="Cachi2026"){setIsAdmin(true); localStorage.setItem("cachi_admin","true"); setView("user");}else{alert("Mal");}}} style={{ width: "100%", background: "#3b82f6", color: "#fff", padding: "15px", borderRadius: "12px", border: "none", fontWeight: "bold" }}>ENTRAR</button>
            <button onClick={()=>setView("user")} style={{ width: "100%", marginTop: "20px", background: "none", border: "none", color: "#64748b" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
