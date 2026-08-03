import { useEffect, useMemo, useState } from "react";
import {
    FolderOpen,
    ArrowLeft,
    UserRound,
    CheckCircle2,
    Search,
    MapPin,
    Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getProjectsByUserEmail, getUsers } from "../../api/api.js";
import LoadingSpinner from "./LoadingSpinner";
import { getProjectControlTypeLabel } from "./ProjectWorkflow.js";
import "./ProjectSelectionPage.css";

export default function ProjectSelectionPage({ user, onProjectSelected }) {
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [entrepreneurs, setEntrepreneurs] = useState([]);

    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedEntrepreneurEmail, setSelectedEntrepreneurEmail] = useState("");

    const [searchTerm, setSearchTerm] = useState("");

    const [loading, setLoading] = useState(false);
    const [entrepreneursLoading, setEntrepreneursLoading] = useState(false);

    const [error, setError] = useState("");
    const [entrepreneursError, setEntrepreneursError] = useState("");

    const isAdmin = user?.role === "admin";
    const userName = user?.name || user?.email || "משתמש";

    const selectedEntrepreneur = useMemo(() => {
        return entrepreneurs.find(
            (entrepreneur) => entrepreneur.email === selectedEntrepreneurEmail
        );
    }, [entrepreneurs, selectedEntrepreneurEmail]);

    const projectOwnerEmail = isAdmin ? selectedEntrepreneurEmail : user?.email;

    useEffect(() => {
        const loadEntrepreneurs = async () => {
            if (!isAdmin) {
                setEntrepreneurs([]);
                setSelectedEntrepreneurEmail("");
                setEntrepreneursError("");
                return;
            }

            try {
                setEntrepreneursLoading(true);
                setEntrepreneursError("");

                const data = await getUsers();
                const usersList = Array.isArray(data) ? data : [];

                const entrepreneurUsers = usersList.filter(
                    (currentUser) => currentUser.role === "entrepreneur"
                );

                setEntrepreneurs(entrepreneurUsers);
            } catch {
                setEntrepreneursError("לא ניתן לטעון את רשימת היזמים");
            } finally {
                setEntrepreneursLoading(false);
            }
        };

        loadEntrepreneurs();
    }, [isAdmin]);

    useEffect(() => {
        const loadProjects = async () => {
            if (!user?.email) {
                setProjects([]);
                setSelectedProjectId("");
                setError("לא נמצא אימייל למשתמש המחובר");
                return;
            }

            if (isAdmin && !selectedEntrepreneurEmail) {
                setProjects([]);
                setSelectedProjectId("");
                setError("");
                setLoading(false);
                return;
            }

            if (!projectOwnerEmail) {
                setProjects([]);
                setSelectedProjectId("");
                setError("לא נמצא אימייל לטעינת פרויקטים");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await getProjectsByUserEmail(projectOwnerEmail);
                const loadedProjects = data?.projects || [];

                setProjects(loadedProjects);
                setSelectedProjectId("");
            } catch {
                setError(
                    isAdmin
                        ? "לא ניתן לטעון את הפרויקטים של היזם שנבחר"
                        : "לא ניתן לטעון את הפרויקטים שלך"
                );
            } finally {
                setLoading(false);
            }
        };

        loadProjects();
    }, [user, isAdmin, selectedEntrepreneurEmail, projectOwnerEmail]);

    const normalizeProject = (project) => {
        const projectId =
            project.id ||
            project.project_id ||
            project.monday_project_id ||
            project.mondayProjectId;

        const projectName =
            project.title ||
            project.name ||
            project.project_name ||
            "פרויקט ללא שם";

        const projectAddress =
            project.address ||
            project.project_address ||
            "";

        const exponetId =
            project.exponet_id ||
            project.exponetID ||
            project.exponetId ||
            project.exponet_project_id ||
            "";

        return {
            ...project,
            id: String(projectId || ""),
            project_id: String(projectId || ""),
            name: projectName,
            title: projectName,
            address: projectAddress,
            exponet_id: exponetId,
        };
    };

    const normalizedProjects = projects
        .map(normalizeProject)
        .filter((project) => project.id && project.id !== "undefined");

    const filteredProjects = normalizedProjects.filter((project) => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) {
            return true;
        }

        return (
            project.name.toLowerCase().includes(search) ||
            project.address.toLowerCase().includes(search)
        );
    });

    const selectedProject = normalizedProjects.find(
        (project) => String(project.id) === String(selectedProjectId)
    );

    const handleEntrepreneurChange = (event) => {
        const email = event.target.value;

        setSelectedEntrepreneurEmail(email);
        setSelectedProjectId("");
        setSearchTerm("");
        setProjects([]);

        localStorage.removeItem("selectedProject");
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("selectedExponetProjectId");
    };

    const handleProjectClick = (project) => {
        setSelectedProjectId(String(project.id));
    };

    const handleContinue = () => {
        if (!selectedProject) {
            return;
        }

        const projectToSave = {
            ...selectedProject,
            selected_by_admin: isAdmin,
            selected_entrepreneur_email: isAdmin
                ? selectedEntrepreneur?.email || selectedEntrepreneurEmail
                : user?.email || "",
            selected_entrepreneur_name: isAdmin
                ? selectedEntrepreneur?.name || ""
                : user?.name || "",
        };

        localStorage.setItem("selectedProject", JSON.stringify(projectToSave));
        localStorage.setItem("selectedProjectId", String(projectToSave.id));

        if (isAdmin && selectedEntrepreneur) {
            localStorage.setItem(
                "selectedEntrepreneur",
                JSON.stringify(selectedEntrepreneur)
            );
        } else {
            localStorage.removeItem("selectedEntrepreneur");
        }

        if (projectToSave.exponet_id) {
            localStorage.setItem(
                "selectedExponetProjectId",
                String(projectToSave.exponet_id)
            );
        } else {
            localStorage.removeItem("selectedExponetProjectId");
        }

        if (onProjectSelected) {
            onProjectSelected(projectToSave, projects);
        }

        navigate("/home");
    };

    const getProjectsCountText = () => {
        if (isAdmin && !selectedEntrepreneurEmail) {
            return "בחר/י יזם להצגת פרויקטים";
        }

        if (loading) {
            return "טוען...";
        }

        return `${normalizedProjects.length} פרויקטים זמינים`;
    };

    return (
        <main className="project-selection-page" dir="rtl">
            <section className="project-selection-shell">
                <section className="project-selection-hero">
                    <div className="hero-content">
                        <div className="hero-label">
                            <UserRound size={18} strokeWidth={1.6} />
                            <span>כניסה למערכת</span>
                        </div>

                        <h1>היי, {userName}</h1>

                        <p>
                            {isAdmin
                                ? "כמנהל מערכת, בחר/י קודם יזם ולאחר מכן את הפרויקט שלו לניהול."
                                : "לפני המעבר לדף הבית, בחר/י את הפרויקט שאותו תרצי לנהל. הפרויקטים המוצגים כאן משויכים לאימייל של המשתמש המחובר."}
                        </p>
                    </div>
                </section>

                <section className="projects-card">
                    <div className="projects-card-header">
                        <div>
                            <span className="section-label">
                                {isAdmin ? "בחירת יזם ופרויקט" : "הפרויקטים שלך"}
                            </span>

                            <h2>
                                {isAdmin
                                    ? "בחר/י יזם ולאחר מכן פרויקט"
                                    : "בחר/י פרויקט להמשך עבודה"}
                            </h2>

                            <p className="projects-card-description">
                                {isAdmin
                                    ? "לאחר בחירת יזם, יוצגו הפרויקטים המשויכים אליו בלבד."
                                    : "לאחר בחירת הפרויקט, כל הדפים במערכת יוצגו לפי הפרויקט הנבחר."}
                            </p>
                        </div>

                        <span className="projects-count">
                            {getProjectsCountText()}
                        </span>
                    </div>

                    {isAdmin && (
                        <div className="entrepreneur-select-card">
                            <div className="entrepreneur-select-title">
                                <Users size={18} strokeWidth={1.7} />
                                <div>
                                    <strong>בחירת יזם</strong>
                                    <span>
                                        בחרי יזם כדי לטעון את הפרויקטים המשויכים אליו
                                    </span>
                                </div>
                            </div>

                            <select
                                value={selectedEntrepreneurEmail}
                                onChange={handleEntrepreneurChange}
                                disabled={entrepreneursLoading}
                                className="entrepreneur-select"
                            >
                                <option value="">
                                    {entrepreneursLoading
                                        ? "טוען יזמים..."
                                        : "בחר/י יזם..."}
                                </option>

                                {entrepreneurs.map((entrepreneur) => (
                                    <option
                                        key={entrepreneur.id || entrepreneur.email}
                                        value={entrepreneur.email}
                                    >
                                        {entrepreneur.name || entrepreneur.email}
                                        {entrepreneur.email ? ` - ${entrepreneur.email}` : ""}
                                    </option>
                                ))}
                            </select>

                            {entrepreneursError && (
                                <div className="entrepreneur-error">
                                    {entrepreneursError}
                                </div>
                            )}

                            {!entrepreneursLoading &&
                                !entrepreneursError &&
                                entrepreneurs.length === 0 && (
                                    <div className="entrepreneur-empty">
                                        לא נמצאו יזמים במערכת.
                                    </div>
                                )}
                        </div>
                    )}

                    <div className="project-search-wrapper">
                        <Search size={18} strokeWidth={1.6} />

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="חיפוש פרויקט לפי שם או כתובת..."
                            disabled={loading || (isAdmin && !selectedEntrepreneurEmail)}
                        />
                    </div>

                    {loading && (
                        <div className="projects-state">
                            <LoadingSpinner text="טוען פרויקטים..." />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="projects-state error-state">
                            {error}
                        </div>
                    )}

                    {!loading && !error && isAdmin && !selectedEntrepreneurEmail && (
                        <div className="projects-state empty-state">
                            <Users size={28} strokeWidth={1.6} />
                            <h3>בחר/י יזם</h3>
                            <p>
                                לאחר בחירת יזם מהרשימה, יוצגו כאן הפרויקטים
                                המשויכים אליו.
                            </p>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        !(isAdmin && !selectedEntrepreneurEmail) &&
                        normalizedProjects.length === 0 && (
                            <div className="projects-state empty-state">
                                <FolderOpen size={28} strokeWidth={1.6} />
                                <h3>לא נמצאו פרויקטים</h3>
                                <p>
                                    {isAdmin
                                        ? "לא נמצאו פרויקטים המשויכים ליזם שנבחר."
                                        : "לא נמצאו פרויקטים המשויכים לאימייל שלך."}
                                </p>
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        normalizedProjects.length > 0 &&
                        filteredProjects.length === 0 && (
                            <div className="projects-state empty-state">
                                <Search size={28} strokeWidth={1.6} />
                                <h3>אין תוצאות</h3>
                                <p>לא נמצאו פרויקטים שתואמים לחיפוש.</p>
                            </div>
                        )}

                    {!loading && !error && filteredProjects.length > 0 && (
                        <div className="projects-grid">
                            {filteredProjects.map((project) => {
                                const isSelected =
                                    String(selectedProjectId) === String(project.id);
                                const controlTypeLabel =
                                    getProjectControlTypeLabel(project);

                                return (
                                    <button
                                        type="button"
                                        key={project.id}
                                        className={
                                            isSelected
                                                ? "project-option selected"
                                                : "project-option"
                                        }
                                        onClick={() => handleProjectClick(project)}
                                    >
                                        <div className="project-icon">
                                            <FolderOpen size={22} strokeWidth={1.6} />
                                        </div>

                                        <div className="project-details">
                                            <div className="project-title-row">
                                                <div className="project-main-text">
                                                    <div className="project-name-row">
                                                        <h3>{project.name}</h3>
                                                        {controlTypeLabel && (
                                                            <span className="project-control-type">
                                                                {controlTypeLabel}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="project-address-line">
                                                        <MapPin size={15} strokeWidth={1.7} />

                                                        <span>
                                                            {project.address || "כתובת לא הוגדרה"}
                                                        </span>
                                                    </div>

                                                    {isAdmin && selectedEntrepreneur && (
                                                        <div className="project-address-line">
                                                            <UserRound size={15} strokeWidth={1.7} />

                                                            <span>
                                                                יזם:{" "}
                                                                {selectedEntrepreneur.name ||
                                                                    selectedEntrepreneur.email}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {isSelected && (
                                                    <CheckCircle2
                                                        size={20}
                                                        strokeWidth={1.8}
                                                        className="selected-check-icon"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="selection-actions">
                        <button
                            type="button"
                            className="continue-button"
                            onClick={handleContinue}
                            disabled={
                                !selectedProjectId ||
                                loading ||
                                !!error ||
                                (isAdmin && !selectedEntrepreneurEmail)
                            }
                        >
                            <span>כניסה לדף הבית</span>
                            <ArrowLeft size={18} strokeWidth={1.6} />
                        </button>
                    </div>
                </section>
            </section>
        </main>
    );
}
