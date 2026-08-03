import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import CompletionDocumentsPage from "./components/CompletionDocumentsPage.jsx";
import MissingDocsPage from "./components/MissingDocsPage.jsx";
import RequiredDocumentsPage from "./components/ProjectRequiredDocuments.jsx";
import ProjectSelectionPage from "./components/ProjectSelectionPage";
import NotificationsPage from "./components/NotificationsPage.jsx";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./components/Login.jsx";
import ForgotPasswordPage from "./components/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./components/ResetPasswordPage.jsx";
import AboutUsPage from "./components/AboutUsPage.jsx";
import ContactCard from "./components/ContactCard.jsx";
import ContactPage from "./components/ContactPage.jsx";
import ScrollToTop from "./components/ScrollToTop";
import UserManagementPage from "./components/UserManagementPage";
import ProfilePage from "./components/ProfilePage.jsx";
import FloatingContactButton from "./components/FloatingContactButton";
import ProjectTrackingPage from "./components/ProjectTrackingPage.jsx";
import HomePage from "./components/HomePage.jsx";
import InformationAndGuidesPage from "./components/InformationAndGuidesPage.jsx";
import InspectorsPage from "./components/InspectorsPage.jsx";
import WorkEmphasesPage from "./components/WorkNotesPage.jsx";
import LabTestsPage from "./components/LabTestsPage.jsx";
import VisitsPlanPage from "./components/VisitsPlanPage.jsx";
import BottomNav from "./components/BottomNav";
import CookieBanner from "./components/CookieBanner.jsx";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage.jsx";
import {
    getHighestAllowedStep,
    isProjectStepAllowed,
} from "./components/ProjectWorkflow.js";

import { getCurrentUser } from "../api/api.js";

import theme from "./theme";
import accessibleTheme from "./accessibleTheme";

import "./components/ProjectTrackingPage.css";
import "./accessibility.css";
import "./App.css";

const SESSION_TIME = 1000 * 60 * 60;

const Page = ({ title }) => (
    <div className="step-page">
        <h2 className="page-title">{title}</h2>
    </div>
);

const getSavedSelectedProject = () => {
    try {
        const savedProject = localStorage.getItem("selectedProject");

        if (!savedProject) {
            return null;
        }

        return JSON.parse(savedProject);
    } catch {
        localStorage.removeItem("selectedProject");
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("selectedExponetProjectId");
        return null;
    }
};

const ProtectedByPrivacy = ({ user, children }) => {
    if (user && user.privacy_policy_accepted === false) {
        return <Navigate to="/privacy-policy" replace />;
    }

    return children;
};

const RequireSelectedProject = ({ selectedProject, children }) => {
    if (!selectedProject) {
        return <Navigate to="/select-project" replace />;
    }

    return children;
};

const RequireAllowedProjectStep = ({
    selectedProject,
    requiredStep,
    children,
}) => {
    const isAllowed = isProjectStepAllowed(selectedProject, requiredStep);
    const highestAllowedStep = getHighestAllowedStep(selectedProject);

    if (!isAllowed) {
        return (
            <Navigate
                to="/home"
                replace
                state={{ workflowStep: highestAllowedStep }}
            />
        );
    }

    return children;
};

function MainLayout({
                        user,
                        onLogout,
                        onPrivacyAccepted,
                        currentStep,
                        setCurrentStep,
                        accessibilityEnabled,
                        onToggleAccessibility,
                        selectedProject,
                        onProjectSelected,
                        userProjects,
                    }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const privacyLocked = user && user.privacy_policy_accepted === false;

    const selectedProjectId =
        selectedProject?.id ||
        selectedProject?.project_id ||
        selectedProject?.monday_project_id ||
        selectedProject?.mondayProjectId ||
        localStorage.getItem("selectedProjectId");

    const toggleSidebar = () => {
        if (privacyLocked) {
            return;
        }

        setSidebarOpen((prev) => !prev);
    };

    return (
        <div className={`app-layout ${sidebarOpen ? "sidebar-open" : ""}`}>
            <Header
                user={user}
                isSidebarOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                navigationDisabled={privacyLocked}
                selectedProject={selectedProject}
                userProjects={userProjects}
                onProjectSelected={onProjectSelected}
            />

            <Sidebar
                user={user}
                onLogout={onLogout}
                isOpen={sidebarOpen && !privacyLocked}
                toggleSidebar={setSidebarOpen}
                navigationDisabled={privacyLocked}
            />

            <Routes>
                <Route
                    path="/"
                    element={
                        <Navigate
                            to={
                                privacyLocked
                                    ? "/privacy-policy"
                                    : selectedProject
                                        ? "/home"
                                        : "/select-project"
                            }
                            replace
                        />
                    }
                />

                <Route
                    path="/privacy-policy"
                    element={
                        <PrivacyPolicyPage onAccepted={onPrivacyAccepted} />
                    }
                />

                <Route
                    path="/select-project"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <ProjectSelectionPage
                                user={user}
                                onProjectSelected={onProjectSelected}
                            />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/home"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <HomePage
                                    currentStep={currentStep}
                                    setCurrentStep={setCurrentStep}
                                    selectedProject={selectedProject}
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/content-control"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <ProjectTrackingPage
                                    projectId={selectedProjectId}
                                    currentStep="content_control"
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/execution-status"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <ProjectTrackingPage
                                        projectId={selectedProjectId}
                                        currentStep="execution_status"
                                    />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/work-start-approval"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="approval"
                                >
                                    <Page title="אישור תחילת עבודה" />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/execution-control"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <Page title="בקרת ביצוע" />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/start-work"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <Page title="תחילת עבודה" />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/guide"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <InformationAndGuidesPage
                                    currentStep={currentStep}
                                    user={user}
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/required-docs"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequiredDocumentsPage
                                    projectId={selectedProjectId}
                                    selectedProject={selectedProject}
                                    currentStep={currentStep}
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/missing-docs"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <MissingDocsPage
                                    projectId={selectedProjectId}
                                    selectedProject={selectedProject}
                                    currentStep={currentStep}
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/team"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <InspectorsPage
                                    projectId={selectedProjectId}
                                    selectedProject={selectedProject}
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/notifications"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <NotificationsPage
                                    projectId={selectedProjectId}
                                    currentStep={currentStep}
                                    selectedProject={selectedProject}
                                />
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/visits-plan"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <VisitsPlanPage
                                        user={user}
                                        selectedProject={selectedProject}
                                        projectId={selectedProjectId}
                                    />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/arrival"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <ContactPage />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/lab-tests"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <LabTestsPage
                                        projectId={selectedProjectId}
                                        title="בדיקות מעבדה"
                                    />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/completion-docs"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <CompletionDocumentsPage
                                        selectedProject={selectedProject}
                                        title="מסמכי תעודת גמר"
                                    />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/work-notes"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <RequireSelectedProject selectedProject={selectedProject}>
                                <RequireAllowedProjectStep
                                    selectedProject={selectedProject}
                                    requiredStep="execution"
                                >
                                    <WorkEmphasesPage user={user} />
                                </RequireAllowedProjectStep>
                            </RequireSelectedProject>
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/projects"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <ProjectSelectionPage
                                user={user}
                                onProjectSelected={onProjectSelected}
                            />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/about"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <AboutUsPage />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/contact"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <ContactCard />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/account"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <ProfilePage />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="/admin/users"
                    element={
                        <ProtectedByPrivacy user={user}>
                            <UserManagementPage user={user} />
                        </ProtectedByPrivacy>
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to={
                                privacyLocked
                                    ? "/privacy-policy"
                                    : selectedProject
                                        ? "/home"
                                        : "/select-project"
                            }
                            replace
                        />
                    }
                />
            </Routes>

            <FloatingContactButton />

            <BottomNav
                navigationDisabled={privacyLocked}
                accessibilityEnabled={accessibilityEnabled}
                onToggleAccessibility={onToggleAccessibility}
            />
        </div>
    );
}

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [user, setUser] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [userProjects, setUserProjects] = useState([]);
    const [currentStep, setCurrentStep] = useState("content_control");
    const [cookiesAccepted, setCookiesAccepted] = useState(false);
    const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);

    useEffect(() => {
        const loadInitialState = async () => {
            const savedCookiesAccepted = localStorage.getItem("cookiesAccepted");
            const savedAccessibility = localStorage.getItem("accessibilityEnabled");
            const savedLoginTime = Number(localStorage.getItem("loginTime"));
            const savedSelectedProject = getSavedSelectedProject();
            const savedUserProjects = (() => {
                try {
                    return JSON.parse(localStorage.getItem("userProjects")) || [];
                } catch {
                    return [];
                }
            })();

            setCookiesAccepted(savedCookiesAccepted === "true");
            setAccessibilityEnabled(savedAccessibility === "true");
            setSelectedProject(savedSelectedProject);
            setCurrentStep(getHighestAllowedStep(savedSelectedProject));
            setUserProjects(savedUserProjects);

            if (
                savedLoginTime &&
                Date.now() - savedLoginTime > SESSION_TIME
            ) {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("loginTime");
                localStorage.removeItem("user");
                localStorage.removeItem("selectedProject");
                localStorage.removeItem("selectedProjectId");
                localStorage.removeItem("selectedExponetProjectId");
                localStorage.removeItem("userProjects");

                setUser(null);
                setSelectedProject(null);
                setUserProjects([]);
                setIsLoggedIn(false);
                setCheckingAuth(false);
                return;
            }

            try {
                const currentUser = await getCurrentUser();

                setUser(currentUser);
                setIsLoggedIn(true);

                localStorage.setItem("user", JSON.stringify(currentUser));

                if (!localStorage.getItem("loginTime")) {
                    localStorage.setItem("loginTime", String(Date.now()));
                }
            } catch {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("loginTime");
                localStorage.removeItem("user");
                localStorage.removeItem("selectedProject");
                localStorage.removeItem("selectedProjectId");
                localStorage.removeItem("selectedExponetProjectId");
                localStorage.removeItem("userProjects");

                setUser(null);
                setSelectedProject(null);
                setUserProjects([]);
                setIsLoggedIn(false);
            } finally {
                setCheckingAuth(false);
            }
        };

        loadInitialState();
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle(
            "accessible-theme",
            accessibilityEnabled
        );

        localStorage.setItem(
            "accessibilityEnabled",
            accessibilityEnabled ? "true" : "false"
        );
    }, [accessibilityEnabled]);

    const toggleAccessibility = () => {
        setAccessibilityEnabled((prev) => !prev);
    };

    const handleLogin = (data) => {
        if (!data || !data.user) {
            setIsLoggedIn(false);
            setUser(null);
            setSelectedProject(null);
            return;
        }

        if (data.access) {
            localStorage.setItem("accessToken", data.access);
        }

        if (data.refresh) {
            localStorage.setItem("refreshToken", data.refresh);
        }

        localStorage.removeItem("selectedProject");
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("selectedExponetProjectId");
        localStorage.removeItem("userProjects");

        localStorage.setItem("loginTime", String(Date.now()));
        localStorage.setItem("user", JSON.stringify(data.user));

        setUser(data.user);
        setSelectedProject(null);
        setUserProjects([]);
        setIsLoggedIn(true);
    };

    const handleProjectSelected = (project, allProjects) => {
        if (!project) {
            return;
        }

        const projectId =
            project.id ||
            project.project_id ||
            project.monday_project_id ||
            project.mondayProjectId;

        if (!projectId) {
            return;
        }

        const exponetProjectId =
            project.exponet_id ||
            project.exponetID ||
            project.exponetId ||
            project.exponet_project_id;

        const normalizedProject = {
            ...project,
            id: String(projectId),
            project_id: String(projectId),
        };

        localStorage.setItem(
            "selectedProject",
            JSON.stringify(normalizedProject)
        );
        localStorage.setItem("selectedProjectId", String(projectId));

        if (exponetProjectId) {
            localStorage.setItem(
                "selectedExponetProjectId",
                String(exponetProjectId)
            );
        } else {
            localStorage.removeItem("selectedExponetProjectId");
        }

        setSelectedProject(normalizedProject);
        setCurrentStep(getHighestAllowedStep(normalizedProject));

        if (allProjects && allProjects.length) {
            setUserProjects(allProjects);
            localStorage.setItem("userProjects", JSON.stringify(allProjects));
        }
    };

    const handlePrivacyAccepted = () => {
        setUser((prevUser) => {
            if (!prevUser) {
                return prevUser;
            }

            const updatedUser = {
                ...prevUser,
                privacy_policy_accepted: true,
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));
            return updatedUser;
        });

        localStorage.setItem("loginTime", String(Date.now()));
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("loginTime");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedProject");
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("selectedExponetProjectId");
        localStorage.removeItem("userProjects");

        setIsLoggedIn(false);
        setUser(null);
        setSelectedProject(null);
        setUserProjects([]);
    };

    const acceptCookies = () => {
        localStorage.setItem("cookiesAccepted", "true");
        setCookiesAccepted(true);
    };

    if (checkingAuth) {
        return null;
    }

    return (
        <ThemeProvider theme={accessibilityEnabled ? accessibleTheme : theme}>
            <CssBaseline />

            <BrowserRouter>
                <ScrollToTop />

                <Routes>
                    <Route
                        path="/login"
                        element={
                            isLoggedIn ? (
                                <Navigate
                                    to={selectedProject ? "/home" : "/select-project"}
                                    replace
                                />
                            ) : (
                                <Login onLogin={handleLogin} />
                            )
                        }
                    />

                    <Route
                        path="/forgot-password"
                        element={<ForgotPasswordPage />}
                    />

                    <Route
                        path="/reset-password/:uid/:token"
                        element={
                            <ResetPasswordPage
                                onPasswordResetSuccess={handleLogout}
                            />
                        }
                    />

                    <Route
                        path="/*"
                        element={
                            !isLoggedIn ? (
                                <Navigate to="/login" replace />
                            ) : (
                                <div className="app-root-wrapper">
                                    <MainLayout
                                        user={user}
                                        onLogout={handleLogout}
                                        onPrivacyAccepted={handlePrivacyAccepted}
                                        currentStep={currentStep}
                                        setCurrentStep={setCurrentStep}
                                        accessibilityEnabled={accessibilityEnabled}
                                        onToggleAccessibility={toggleAccessibility}
                                        selectedProject={selectedProject}
                                        onProjectSelected={handleProjectSelected}
                                        userProjects={userProjects}
                                    />
                                </div>
                            )
                        }
                    />
                </Routes>

                {!cookiesAccepted && (
                    <CookieBanner onAccept={acceptCookies} />
                )}
            </BrowserRouter>
        </ThemeProvider>
    );
}
