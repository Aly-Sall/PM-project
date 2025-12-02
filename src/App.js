// src/App.js - VERSION FINALE CERTIFIÉE (TRI URGENT + ROUTAGE)
import React, { useState, useEffect } from "react";
import {
  Home,
  Coffee,
  DollarSign,
  FileText,
  Bus,
  Users,
  Inbox,
  Menu,
  RefreshCw,
  Activity,
  Brain,
  CheckCircle,
  AlertTriangle,
  Layers,
  LayoutDashboard,
  Clock, // Icône pour le Follow-up
} from "lucide-react";
import "./App.css";

// 🚨 URL DE PRODUCTION (À remplacer par ton URL Webhook n8n finale)
const API_URL = "https://classiftest.app.n8n.cloud/webhook/tickets";

// --- CONFIGURATION DU ROUTAGE (Selon Technical Doc p.2 & p.6) ---
const departmentRouting = [
  {
    id: "housing",
    label: "Housing Office",
    categories: ["Housing"],
    icon: <Home size={18} />,
  },
  {
    id: "student_life",
    label: "Student Life",
    categories: ["Food", "Transportation"], // Regroupe Food & Transport [cite: 110]
    icon: <Coffee size={18} />,
  },
  {
    id: "finance",
    label: "Financial Aid",
    categories: ["Finance"],
    icon: <DollarSign size={18} />,
  },
  {
    id: "admin",
    label: "Admin / Registrar",
    categories: ["Admin"],
    icon: <FileText size={18} />,
  },
  {
    id: "hr",
    label: "Internal / HR",
    categories: ["Internal"],
    icon: <Users size={18} />,
  },
  {
    id: "general",
    label: "Front Desk",
    categories: ["General"], // Cible spécifique pour le général [cite: 110]
    icon: <Inbox size={18} />,
  },
];

const categoryIcons = {
  Housing: <Home size={16} />,
  Food: <Coffee size={16} />,
  Finance: <DollarSign size={16} />,
  Admin: <FileText size={16} />,
  Transportation: <Bus size={16} />,
  Internal: <Users size={16} />,
  General: <Inbox size={16} />,
};

const categoryColors = {
  Housing: "#FF6B6B",
  Food: "#4ECDC4",
  Finance: "#45B7D1",
  Admin: "#96CEB4",
  Transportation: "#FECA57",
  Internal: "#DDA0DD",
  General: "#A8A8A8",
};

const priorityColors = {
  urgent: "#FF3B30", // Rouge
  important: "#FF9500", // Jaune
  low: "#34C759", // Vert
};

// Données de secours (Mocks)
const sampleEmails = [
  {
    id: "MOCK-1",
    from: "Alex Dupont",
    subject: "URGENT: Eviction Notice Help Needed",
    fullContent: "I received an eviction notice today...",
    category: "Housing",
    priority: "urgent",
    time: "2 min ago",
    status: "unread",
    ticketNumber: "TKT-1121-001",
    reasoning: "Keyword 'Eviction' detected regarding accommodation safety.",
    suggestedDept: "Housing Office",
    sentiment: "Negative",
  },
];

function App() {
  // --- ÉTATS (STATES) ---
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Navigation
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("all_inbox"); // 'dashboard', 'all_inbox', ou ID dept

  // Modals
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");

  // Backend
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown");

  // --- LOGIQUE MÉTIER ---

  const fetchRealEmails = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Connexion à n8n:", API_URL);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      const data = await response.json();

      // Gestion structure n8n
      let items = [];
      if (Array.isArray(data) && data.length > 0 && data[0].data)
        items = data[0].data;
      else if (data.data && Array.isArray(data.data)) items = data.data;
      else if (Array.isArray(data)) items = data;

      if (items.length === 0) {
        setBackendStatus("connected");
        return;
      }

      const transformedEmails = items.map((email, index) => ({
        id: email.ticket_id || `TEMP-${index}`,
        from: email.from_email || "Inconnu",
        subject: email.subject || "(Sans Objet)",
        fullContent: email.final_email_body || email.content || "...",
        category: email.category || "General",
        priority: (email.priority || "low").toLowerCase(),
        time: email.created_at
          ? new Date(email.created_at).toLocaleString()
          : "Date inconnue",
        status: email.status === "DONE" ? "read" : "unread",
        ticketNumber: email.ticket_id || "N/A",
        // Nouveaux champs IA
        reasoning: email.reasoning || "Analyse en attente...",
        suggestedDept: email.suggested_department || "General Desk",
        sentiment: email.sentiment || "Neutral",
      }));

      setEmails(transformedEmails);
      setBackendStatus("connected");
    } catch (error) {
      console.error("❌ Erreur:", error);
      setBackendStatus("disconnected");
      loadSampleEmails();
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleEmails = () => {
    setEmails(sampleEmails);
  };

  useEffect(() => {
    fetchRealEmails();
  }, []);

  // --- ACTIONS UTILISATEUR ---

  const handleAutoReply = (email) => {
    // Action: Auto-Reply (Info) [cite: 70]
    setAutoReplyMessage(email.fullContent || "Pas de brouillon disponible.");
    setShowAutoReplyModal(true);
  };

  const handleFollowUp = (email) => {
    // Action: Create Follow-Up [cite: 70]
    alert(
      `Ticket ${email.ticketNumber} mis en attente pour documents manquants.`
    );
    // TODO: Connecter à un webhook "Update Status -> PENDING_DOCS"
  };

  const handleMarkAsDone = (email) => {
    // Action: Archive / Close
    alert(`Ticket ${email.ticketNumber} clôturé avec succès !`);
    setEmails(
      emails.map((e) => (e.id === email.id ? { ...e, status: "read" } : e))
    );
  };

  // --- FILTRAGE ET TRI (CORRIGÉ POUR URGENCES) ---
  const getFilteredEmails = () => {
    let filtered = [];

    // 1. Filtrage (Vue Manager vs Vue Agent)
    if (currentView === "dashboard") {
      return [];
    } else if (currentView === "all_inbox") {
      filtered = emails; // Tout le monde [cite: 137]
    } else {
      // Vue Département (ex: Housing Office)
      const activeDept = departmentRouting.find((d) => d.id === currentView);
      if (activeDept) {
        filtered = emails.filter((e) =>
          activeDept.categories.includes(e.category)
        );
      }
    }

    // 2. TRI PAR PRIORITÉ (URGENT EN PREMIER)
    // Urgent(3) > Important(2) > Low(1) > Date
    const priorityWeight = { urgent: 3, important: 2, low: 1 };

    return filtered.sort((a, b) => {
      const weightA = priorityWeight[a.priority] || 0;
      const weightB = priorityWeight[b.priority] || 0;

      // Si priorités différentes, le plus urgent passe en premier
      if (weightA !== weightB) return weightB - weightA;

      // Si même priorité, le plus récent passe en premier
      return new Date(b.time) - new Date(a.time);
    });
  };

  const filteredEmails = getFilteredEmails();

  // --- STATS DASHBOARD ---
  const categoryStats = Object.keys(categoryIcons)
    .map((cat) => ({
      name: cat,
      value: emails.filter((e) => e.category === cat).length,
      color: categoryColors[cat],
    }))
    .sort((a, b) => b.value - a.value);

  const getUnreadCount = (categories = null) => {
    if (!categories) return emails.length;
    return emails.filter((e) => categories.includes(e.category)).length;
  };

  // --- COMPOSANTS UI ---
  const SimpleBarChart = ({ data }) => {
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {data.map((item) => (
          <div key={item.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.85rem",
                marginBottom: "4px",
              }}
            >
              <span>{item.name}</span>
              <span style={{ fontWeight: "bold", color: "#666" }}>
                {item.value}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                background: "#f0f0f0",
                borderRadius: "4px",
                height: "8px",
              }}
            >
              <div
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  background: item.color,
                  height: "100%",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // --- RENDU PRINCIPAL ---
  return (
    <div
      className="app"
      style={{
        fontFamily: "Inter, sans-serif",
        color: "#1d1d1f",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "white",
          padding: "0 1.5rem",
          height: "60px",
          borderBottom: "1px solid #e5e5e7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "#E0C78F",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Brain size={20} color="white" />
            </div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: "600" }}>
              ClassifIA Admin
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              background: backendStatus === "connected" ? "#dcfce7" : "#fee2e2",
              color: backendStatus === "connected" ? "#166534" : "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "currentColor",
              }}
            />
            {backendStatus === "connected" ? "Online" : "Offline"}
          </div>
          <button
            onClick={fetchRealEmails}
            disabled={isLoading}
            style={{
              background: "#1d1d1f",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <RefreshCw size={16} className={isLoading ? "spin" : ""} />
            {isLoading ? "..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          background: "#f5f5f7",
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            width: sidebarOpen ? "260px" : "70px",
            background: "white",
            borderRight: "1px solid #e5e5e7",
            padding: "1rem 0.5rem",
            transition: "width 0.3s",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
            overflowY: "auto",
          }}
        >
          {/* Section Manager */}
          <button
            onClick={() => setCurrentView("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              background:
                currentView === "dashboard" ? "#E0C78F" : "transparent",
              color: currentView === "dashboard" ? "white" : "#1d1d1f",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <LayoutDashboard size={18} /> {sidebarOpen && "Vue Manager (Stats)"}
          </button>

          <button
            onClick={() => setCurrentView("all_inbox")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem",
              background:
                currentView === "all_inbox" ? "#E0C78F" : "transparent",
              color: currentView === "all_inbox" ? "white" : "#1d1d1f",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <Layers size={18} /> {sidebarOpen && "Boîte Globale"}
            </div>
            {sidebarOpen && (
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                {getUnreadCount()}
              </span>
            )}
          </button>

          {/* Section Départements */}
          {sidebarOpen && (
            <div
              style={{
                padding: "1rem 0.75rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Routage Départements
            </div>
          )}

          {departmentRouting.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setCurrentView(dept.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem",
                background: currentView === dept.id ? "#f0f0f0" : "transparent",
                color: "#1d1d1f",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {dept.icon} {sidebarOpen && dept.label}
              </div>
              {sidebarOpen && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    background: "#eee",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    color: "#555",
                  }}
                >
                  {getUnreadCount(dept.categories)}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* MAIN AREA */}
        <main style={{ flex: 1, padding: "1.5rem", overflow: "hidden" }}>
          {currentView !== "dashboard" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                height: "100%",
              }}
            >
              {/* LISTE DES TICKETS (TRIÉE) */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "1rem",
                  overflowY: "auto",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <h2
                  style={{
                    fontSize: "1rem",
                    marginBottom: "1rem",
                    color: "#666",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {currentView === "all_inbox"
                    ? "Tous les tickets"
                    : departmentRouting.find((d) => d.id === currentView)
                        ?.label || "Liste"}
                  <span
                    style={{
                      fontSize: "0.8rem",
                      background: "#eee",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {filteredEmails.length}
                  </span>
                </h2>

                {filteredEmails.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "#999",
                      fontSize: "0.9rem",
                    }}
                  >
                    Aucun ticket dans ce dossier.
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      style={{
                        padding: "1rem",
                        borderBottom: "1px solid #f0f0f0",
                        cursor: "pointer",
                        background:
                          selectedEmail?.id === email.id ? "#f8f9fa" : "white",
                        borderLeft: `4px solid ${
                          priorityColors[email.priority] || "#ccc"
                        }`,
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                          {email.from}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#999" }}>
                          {email.time}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          marginBottom: "0.4rem",
                          color: "#333",
                        }}
                      >
                        {email.subject}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: "#f0f0f0",
                            color: "#555",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {categoryIcons[email.category]} {email.category}
                        </span>
                        {email.priority === "urgent" && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "#FF3B30",
                              fontWeight: "700",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <AlertTriangle size={10} /> URGENT
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DÉTAIL DU TICKET */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "2rem",
                  overflowY: "auto",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {selectedEmail ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    {/* EN-TÊTE */}
                    <div
                      style={{
                        borderBottom: "1px solid #eee",
                        paddingBottom: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <h2
                        style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}
                      >
                        {selectedEmail.subject}
                      </h2>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#666",
                          fontSize: "0.9rem",
                        }}
                      >
                        <span>
                          De: <strong>{selectedEmail.from}</strong>
                        </span>
                        <span>Réf: {selectedEmail.ticketNumber}</span>
                      </div>
                    </div>

                    {/* BLOC ANALYSE IA (Justification & Routage) */}
                    <div
                      style={{
                        background: "#f0f9ff",
                        border: "1px solid #bce3eb",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 0.8rem 0",
                          fontSize: "0.9rem",
                          color: "#0056b3",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Brain size={16} /> Analyse de l'Assistant
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr",
                          gap: "1.5rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              display: "block",
                              marginBottom: "0.3rem",
                              color: "#444",
                            }}
                          >
                            Justification IA
                          </strong>
                          <p
                            style={{
                              margin: 0,
                              color: "#333",
                              lineHeight: "1.4",
                            }}
                          >
                            {selectedEmail.reasoning}
                          </p>
                        </div>
                        <div
                          style={{
                            borderLeft: "1px solid #dbeafe",
                            paddingLeft: "1rem",
                          }}
                        >
                          <strong
                            style={{
                              display: "block",
                              marginBottom: "0.3rem",
                              color: "#444",
                            }}
                          >
                            Routage Suggéré
                          </strong>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#0056b3",
                              marginBottom: "0.5rem",
                            }}
                          >
                            → {selectedEmail.suggestedDept}
                          </div>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background:
                                selectedEmail.sentiment === "Negative"
                                  ? "#ffebee"
                                  : "#e8f5e9",
                              color:
                                selectedEmail.sentiment === "Negative"
                                  ? "#c62828"
                                  : "#2e7d32",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            Sentiment: {selectedEmail.sentiment}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CONTENU MESSAGE */}
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                        color: "#333",
                        fontSize: "0.95rem",
                        marginBottom: "2rem",
                        flex: 1,
                      }}
                    >
                      {selectedEmail.fullContent}
                    </div>

                    {/* BARRE D'ACTIONS (Selon Tech Doc p.4 & p.5) */}
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginTop: "1rem",
                        borderTop: "1px solid #eee",
                        paddingTop: "1.5rem",
                      }}
                    >
                      {/* 1. Réponse Auto (Pour Low/Standard) */}
                      <button
                        onClick={() => handleAutoReply(selectedEmail)}
                        style={{
                          flex: 1,
                          padding: "0.8rem",
                          background: "#f8f9fa",
                          color: "#333",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                        }}
                      >
                        ✉️ Réponse Auto
                      </button>

                      {/* 2. Créer Suivi (Pour Missing Docs) */}
                      <button
                        onClick={() => handleFollowUp(selectedEmail)}
                        style={{
                          flex: 1,
                          padding: "0.8rem",
                          background: "#FFF3CD",
                          color: "#856404",
                          border: "1px solid #ffeeba",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Clock size={18} /> Créer Suivi
                      </button>

                      {/* 3. Marquer Traité (Pour Clôture) */}
                      <button
                        onClick={() => handleMarkAsDone(selectedEmail)}
                        style={{
                          flex: 1,
                          padding: "0.8rem",
                          background: "#d1e7dd",
                          color: "#0f5132",
                          border: "1px solid #badbcc",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <CheckCircle size={18} /> Traité
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#aaa",
                    }}
                  >
                    <Inbox
                      size={48}
                      style={{ marginBottom: "1rem", opacity: 0.3 }}
                    />
                    <p>Sélectionnez un ticket pour voir l'analyse.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DASHBOARD MANAGER VIEW */
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              <h2 style={{ marginBottom: "1.5rem" }}>
                Tableau de bord (Manager)
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <div
                  style={{
                    background: "white",
                    padding: "1.5rem",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      color: "#666",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Total Tickets
                  </div>
                  <div style={{ fontSize: "2.5rem", fontWeight: "700" }}>
                    {emails.length}
                  </div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: "1.5rem",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      color: "#666",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Urgences (Rouge)
                  </div>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: "700",
                      color: "#FF3B30",
                    }}
                  >
                    {emails.filter((e) => e.priority === "urgent").length}
                  </div>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: "1.5rem",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      color: "#666",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Sentiment Négatif
                  </div>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: "700",
                      color: "#c62828",
                    }}
                  >
                    {emails.filter((e) => e.sentiment === "Negative").length}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <h3 style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>
                  Volume par Catégorie
                </h3>
                <SimpleBarChart data={categoryStats} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL RÉPONSE AUTO */}
      {showAutoReplyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "12px",
              width: "600px",
              maxWidth: "90%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Brouillon généré par l'IA</h3>
            <div
              style={{
                background: "#f5f5f7",
                padding: "1.5rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                fontSize: "0.95rem",
                whiteSpace: "pre-wrap",
                border: "1px solid #e5e5e7",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {autoReplyMessage}
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowAutoReplyModal(false)}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "transparent",
                  color: "#666",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert("Email envoyé !");
                  setShowAutoReplyModal(false);
                }}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "#1d1d1f",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
