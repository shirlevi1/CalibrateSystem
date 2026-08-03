import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getProjectNotifications } from "../../api/api.js";
import { getHighestAllowedStep } from "./ProjectWorkflow.js";
import LoadingSpinner from "./LoadingSpinner";
import "./NotificationsPage.css";

/* ================= ICON LIBRARY ================= */
import {
    Bell,
    Calendar,
    FileText,
    Activity
} from "lucide-react";

/* ================= FORMAT ================= */
const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatValue = (value) => {
    if (!value) return "";

    if (/\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleDateString("he-IL");
    }

    return value;
};

function normalizeStep(value) {
    if (value === "approval" || value === "work_start_approval") {
        return "approval";
    }

    if (
        value === "execution" ||
        value === "execution_control" ||
        value === "execution_status"
    ) {
        return "execution";
    }

    return "content_control";
}

export default function NotificationsPage({
    projectId,
    currentStep,
    selectedProject = null,
}) {
    const location = useLocation();
    const projectStep = selectedProject ? getHighestAllowedStep(selectedProject) : "";
    const activeStep = normalizeStep(
        projectStep ||
        location.state?.currentStep ||
        currentStep
    );

    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState(null);
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        if (!projectId) {
            setError("לא נמצא מזהה פרויקט");
            setLoading(false);
            return;
        }

        fetchData();
    }, [activeStep, projectId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getProjectNotifications(projectId, {
                stage: activeStep,
            });
            setNotifications(data.notifications || []);
        } catch {
            setError("שגיאה בטעינת התראות");
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case "document":
                return <FileText size={18} />;
            case "report":
            case "update":
                return <Activity size={18} />;
            default:
                return <Bell size={18} />;
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="header-card">
                    <div>
                        <h2>עדכוני פרויקט</h2>
                        <p>מעקב אחר פעולות, מסמכים ושינויים</p>
                    </div>

                    <Bell size={22} />
                </div>

                <LoadingSpinner text="טוען התראות..." />
            </div>
        );
    }

    if (error) {
        return <div className="page-container error-text">{error}</div>;
    }

    return (
        <div className="page-container">
            <div className="header-card">
                <div>
                    <h2>עדכוני פרויקט</h2>
                    <p>מעקב אחר פעולות, מסמכים ושינויים</p>
                </div>

                <Bell size={22} />
            </div>

            <div className="notifications-list">
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        אין התראות זמינות כרגע עבור פרויקט זה
                    </div>
                ) : (
                    notifications.map((n, i) => (
                        <div key={i} className={`notification-card ${n.type || "system"}`}>
                            <div className="icon-box">
                                {getIcon(n.type)}
                            </div>

                            <div className="card-main">
                                <div className="title-row">
                                    <span className="title">{n.title}</span>
                                    <span className="time">{formatDate(n.time)}</span>
                                </div>

                                <div className="desc">
                                    {n.description}
                                </div>

                                <div className="footer">
                                    <span className="user">{n.user || "מערכת"}</span>

                                    {n.meta && (
                                        <button
                                            className="details-btn"
                                            onClick={() => setOpenId(openId === i ? null : i)}
                                        >
                                            צפה בפרטים
                                        </button>
                                    )}
                                </div>

                                {openId === i && n.meta && (
                                    <div className="meta-box">
                                        <div className="meta-title">
                                            {n.meta.field}
                                        </div>

                                        <div className="meta-value">
                                            עודכן ל־{formatValue(n.meta.new_value)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
