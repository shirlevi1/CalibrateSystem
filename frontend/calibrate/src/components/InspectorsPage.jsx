import { useEffect, useState } from "react";
import { Building2, ClipboardList, Mail, Phone, UserRound } from "lucide-react";
import { getProjectInspectors } from "../../api/api.js";
import LoadingSpinner from "./LoadingSpinner";
import "./InspectorsPage.css";

const getInitialProjectName = (selectedProject) =>
    selectedProject?.title ||
    selectedProject?.name ||
    selectedProject?.project_name ||
    "";

const InspectorsPage = ({ projectId, selectedProject = null }) => {
    const [inspectors, setInspectors] = useState([]);
    const [projectName, setProjectName] = useState(getInitialProjectName(selectedProject));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const openGmail = (inspector) => {
        const contactName =
            inspector.contactName ||
            inspector.fullName ||
            inspector.name ||
            "";
        const subject = `פנייה בנושא פרויקט ${projectName}`;
        const body =
            `שלום ${contactName},\n\n` +
            `אשמח ליצור קשר בנוגע לפרויקט ${projectName}.\n\n` +
            `תודה.`;

        const gmailUrl =
            `https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1` +
            `&to=${encodeURIComponent(inspector.email)}` +
            `&su=${encodeURIComponent(subject)}` +
            `&body=${encodeURIComponent(body)}`;

        window.open(gmailUrl, "_blank");
    };

    useEffect(() => {
        const fetchInspectors = async () => {
            if (!projectId) {
                setError("לא נמצא מזהה פרויקט");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await getProjectInspectors(projectId);

                setInspectors(data.escortTeam || data.inspectors || []);
                setProjectName(data.project_name || getInitialProjectName(selectedProject));
            } catch {
                setError("לא ניתן לטעון את הצוות המלווה כרגע");
            } finally {
                setLoading(false);
            }
        };

        fetchInspectors();
    }, [projectId, selectedProject]);

    if (loading) {
        return (
            <main className="inspectors-page">
                <section className="inspectors-container">
                    <div className="inspectors-header">
                        <h1 className="inspectors-title">צוות מלווה</h1>
                        <p className="inspectors-subtitle">
                            אנחנו טוענים את פרטי הצוות המשויך לפרויקט
                        </p>
                    </div>

                    <LoadingSpinner text="טוען צוות מלווה..." />
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className="inspectors-page">
                <section className="inspectors-container">
                    <h1 className="inspectors-title">צוות מלווה</h1>
                    <div className="inspectors-empty">{error}</div>
                </section>
            </main>
        );
    }

    return (
        <main className="inspectors-page">
            <section className="inspectors-container">
                <div className="inspectors-header">
                    <h1 className="inspectors-title">צוות מלווה</h1>
                    <p className="inspectors-subtitle">
                        רשימת הגורמים המלווים המשויכים לפרויקט {projectName}
                    </p>
                </div>

                {inspectors.length === 0 ? (
                    <div className="inspectors-empty">
                        לא נמצא צוות מלווה לפרויקט זה
                    </div>
                ) : (
                    <div className="inspectors-grid">
                        {inspectors.map((inspector) => (
                            <article
                                key={inspector.id || inspector.userId}
                                className="inspector-card"
                            >
                                <div className="inspector-avatar">
                                    <Building2 size={38} strokeWidth={1.8} />
                                </div>

                                <h2 className="inspector-name">
                                    {inspector.name || inspector.fullName || "ללא שם"}
                                </h2>

                                <p className="inspector-role">צוות מלווה</p>

                                <div className="inspector-section">
                                    <div className="section-title">
                                        <UserRound size={18} strokeWidth={1.7} />
                                        איש קשר
                                    </div>

                                    <div className="escort-details">
                                        <span>
                                            {inspector.contactName ||
                                                inspector.fullName ||
                                                "לא צוין איש קשר"}
                                        </span>
                                    </div>
                                </div>

                                <div className="inspector-section">
                                    <div className="section-title">
                                        <ClipboardList size={18} strokeWidth={1.7} />
                                        פרטים
                                    </div>

                                    <div className="escort-details">
                                        {inspector.phone && (
                                            <span>
                                                <Phone size={15} strokeWidth={1.7} />
                                                {inspector.phone}
                                            </span>
                                        )}

                                        {inspector.email && (
                                            <span>
                                                <Mail size={15} strokeWidth={1.7} />
                                                {inspector.email}
                                            </span>
                                        )}

                                        {inspector.status && (
                                            <span>סטטוס: {inspector.status}</span>
                                        )}
                                    </div>
                                </div>

                                {inspector.email && (
                                    <button
                                        type="button"
                                        className="email-button"
                                        onClick={() => openGmail(inspector)}
                                    >
                                        <Mail size={18} strokeWidth={1.6} />
                                        שליחת מייל
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default InspectorsPage;
