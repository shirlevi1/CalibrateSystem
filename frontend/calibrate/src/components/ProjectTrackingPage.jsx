import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Clock3, Download, Eye, Workflow } from "lucide-react";
import { getProjectTracking } from "../../api/api";
import LoadingSpinner from "./LoadingSpinner";
import "./ProjectTrackingPage.css";

const EMPTY_VALUE = "—";

const MONDAY_TRACKING_COLUMNS = {
    control_type: { id: "color_mm1grhfm", title: "סוג בקרה" },
    project_status: { id: "project_status", title: "שלב בפרוייקט" },
    exponet_status: { id: "color_mm2ewncv", title: "סטטוס אקספונט" },
    intake_process: { id: "color_mm2epwsy", title: "תהליך קליטה" },
    interim_report_number: { id: "text_mm1jky2w", title: "מספר דוח ביניים" },
    interim_target_date: { id: "date_mm2ec1y7", title: "תאריך יעד דו״ח ביניים" },
    final_target_date: { id: "date_mm2e1cha", title: "תאריך יעד דו״ח מסכם" },
    water_corporation_process: { id: "text_mm1jhkrv", title: "תאגיד מים" },
};

function getMondayColumnValue(column) {
    if (!column) return "";

    return (
        column.display_value ||
        column.label ||
        column.text ||
        ""
    );
}

function getMondayColumn(columnValues, columnConfig) {
    if (!Array.isArray(columnValues)) return null;

    let titleMatch = null;

    for (const column of columnValues) {
        if (column.id === columnConfig.id) {
            return column;
        }

        if (!titleMatch && (column.column?.title || "").trim() === columnConfig.title) {
            titleMatch = column;
        }
    }

    return titleMatch;
}

function normalizeTrackingProject(data) {
    if (!data?.column_values) return data;

    const normalizedFields = Object.entries(MONDAY_TRACKING_COLUMNS).reduce(
        (fields, [fieldName, columnConfig]) => {
            const column = getMondayColumn(data.column_values, columnConfig);
            fields[fieldName] = getMondayColumnValue(column);
            return fields;
        },
        {}
    );

    return {
        ...data,
        ...normalizedFields,
        project_type: data.project_type || normalizedFields.control_type,
        project_stage: data.project_stage || normalizedFields.project_status,
    };
}

function formatDate(dateString) {
    if (!dateString) return EMPTY_VALUE;

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function getPageConfig(activeStep) {
    if (activeStep === "content_control") {
        return {
            type: "content",
            title: "בקרת תכן",
            sectionLabel: "סטטוס בקרת תכן",
        };
    }

    if (activeStep === "approval") {
        return {
            type: "approval",
            title: "אישור תחילת עבודה",
            sectionLabel: "סטטוס אישור תחילת עבודה",
        };
    }

    if (
        activeStep === "execution_control" ||
        activeStep === "execution_status" ||
        activeStep === "execution"
    ) {
        return {
            type: "execution",
            title: "בקרת ביצוע",
            sectionLabel: "בקרת ביצוע",
        };
    }

    return {
        type: "content",
        title: "בקרת תכן",
        sectionLabel: "סטטוס בקרת תכן",
    };
}

function isStepAvailableForProject(pageType, projectType) {
    const normalizedProjectType = (projectType || "").trim();

    if (!normalizedProjectType) return true;

    if (pageType === "content" || pageType === "approval") {
        return ["תכן", "תכנון"].includes(normalizedProjectType);
    }

    if (pageType === "execution") {
        return normalizedProjectType === "אישור תחילת עבודה";
    }

    return true;
}

function buildMainProcess(project, pageType) {
    if (pageType !== "content" && pageType !== "approval") {
        return [];
    }

    const process = [
        {
            key: "interim_report",
            title: "דו״ח ביניים",
            date: project.interim_target_date || null,
            status: project.interim_report_number
                ? `מספר דוח ${project.interim_report_number}`
                : EMPTY_VALUE,
            meta: project.interim_report_number
                ? "נלקח מעמודת מספר דוח ביניים"
                : "",
            fileUrl: project.interim_report_url || "",
        },
        {
            key: "final_report",
            title: "דו״ח מסכם",
            date: project.final_target_date || null,
            status: project.final_report_number
                ? `מספר דוח ${project.final_report_number}`
                : EMPTY_VALUE,
            meta: project.final_report_number
                ? "נלקח מעמודת מספר דוח מסכם"
                : "",
            fileUrl: project.final_report_url || "",
        },
    ];

    if (pageType === "content") {
        process.push({
            key: "intake_process",
            title: "תהליך קליטה",
            date: project.intake_process_date || null,
            status: project.intake_process || EMPTY_VALUE,
            meta: "",
            fileUrl: "",
        });
    }

    return process;
}

function buildParallelProcesses(project, pageType) {
    if (pageType !== "content") {
        return [];
    }

    return [
        {
            key: "water_corporation",
            title: "תאגיד מים (תהליך מגביל)",
            status: project.water_corporation_process || EMPTY_VALUE,
        },
    ];
}

function StageActions({ fileUrl }) {
    const hasFile = Boolean(fileUrl);

    const handleView = () => {
        if (fileUrl) {
            window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
    };

    const handleDownload = () => {
        if (!fileUrl) {
            return;
        }

        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = "";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="tracking-stage-actions">
            <button
                type="button"
                className="file-action-btn view-btn"
                onClick={handleView}
                disabled={!hasFile}
            >
                <Eye size={15} />
                <span>צפייה במסמך</span>
            </button>

            <button
                type="button"
                className="file-action-btn download-btn"
                onClick={handleDownload}
                disabled={!hasFile}
            >
                <Download size={15} />
                <span>הורדה</span>
            </button>
        </div>
    );
}

export default function ProjectTrackingPage({ projectId, currentStep }) {
    const location = useLocation();
    const params = useParams();
    const activeStep = location.state?.currentStep || currentStep;
    const resolvedProjectId =
        projectId ||
        location.state?.projectId ||
        location.state?.project?.id ||
        params.projectId ||
        params.project_id ||
        params.id;

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState("");

    useEffect(() => {
        let mounted = true;

        const loadProject = async () => {
            if (!resolvedProjectId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setPageError("");

            try {
                const data = await getProjectTracking(resolvedProjectId);

                if (mounted) {
                    setProject(normalizeTrackingProject(data));
                }
            } catch (error) {
                if (mounted) {
                    setPageError(error.message || "שגיאה בטעינת נתוני הפרויקט");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadProject();

        return () => {
            mounted = false;
        };
    }, [resolvedProjectId]);

    const pageConfig = useMemo(
        () => getPageConfig(activeStep),
        [activeStep]
    );

    const projectType = (project?.control_type || project?.project_type || "").trim();

    const isAvailable = project
        ? isStepAvailableForProject(pageConfig.type, projectType)
        : true;

    const mainProcess = useMemo(
        () => (project && isAvailable ? buildMainProcess(project, pageConfig.type) : []),
        [project, pageConfig, isAvailable]
    );

    const parallelProcesses = useMemo(
        () => (project && isAvailable ? buildParallelProcesses(project, pageConfig.type) : []),
        [project, pageConfig, isAvailable]
    );

    if (!resolvedProjectId) {
        return (
            <div className="page-content">
                <div className="tracking-page">
                    <div className="tracking-shell-card">
                        <p className="tracking-empty">לא התקבל מספר פרויקט להצגה.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-content">
                <div className="tracking-page">
                    <div className="tracking-summary-card">
                        <div className="tracking-summary-text">
                            <h1>{pageConfig.title}</h1>
                            <p>טוען את נתוני הפרויקט והסטטוסים הרלוונטיים</p>
                        </div>

                        <div className="tracking-summary-icon">
                            <Workflow size={20} />
                        </div>
                    </div>

                    <div className="tracking-shell-card">
                        <LoadingSpinner text="טוען נתוני פרויקט..." />
                    </div>
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="page-content">
                <div className="tracking-page">
                    <div className="tracking-shell-card">
                        <p className="tracking-error">{pageError}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="tracking-page">
                <div className="tracking-summary-card">
                    <div className="tracking-summary-text">
                        <h1>{pageConfig.title}</h1>

                        <p>
                            הפרויקט: {project.name}
                            {project.project_type ? ` · סוג פרויקט: ${project.project_type}` : ""}
                        </p>
                    </div>

                    <div className="tracking-summary-icon">
                        <Workflow size={20} />
                    </div>
                </div>

                {pageConfig.type === "execution" ? (
                    <div className="tracking-shell-card">
                        <p className="tracking-empty">
                            בבקרת ביצוע אין סטטוס להצגה.
                        </p>
                    </div>
                ) : !isAvailable ? (
                    <div className="tracking-shell-card">
                        <p className="tracking-empty">
                            אין סטטוס זמין עבור שלב זה בפרויקט הנוכחי.
                        </p>
                    </div>
                ) : (
                    <div className="tracking-layout">
                        <div className="tracking-main-column">
                            <div className="tracking-process-card tracking-process-card-main">
                                <div className="tracking-section-label">
                                    {pageConfig.sectionLabel}
                                </div>

                                <div className="tracking-main-timeline">
                                    {mainProcess.map((step, index) => (
                                        <div className="tracking-main-step" key={step.key}>
                                            <div className="tracking-main-line-column">
                                                <span className="tracking-stage-dot" />

                                                {index < mainProcess.length - 1 && (
                                                    <span className="tracking-stage-line" />
                                                )}
                                            </div>

                                            <div className="tracking-main-step-content">
                                                <h2>{step.title}</h2>

                                                {step.date && (
                                                    <div className="tracking-stage-date">
                                                        <span>{formatDate(step.date)}</span>
                                                        <Clock3 size={14} />
                                                    </div>
                                                )}

                                                {step.meta ? (
                                                    <div className="tracking-stage-meta">
                                                        {step.meta}
                                                    </div>
                                                ) : null}

                                                <div className="tracking-stage-status">
                                                    {step.status}
                                                </div>

                                                {step.fileUrl ? <StageActions fileUrl={step.fileUrl} /> : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="tracking-parallel-column">
                            <div className="tracking-process-card tracking-parallel-card">
                                <div className="tracking-section-label">תהליכים מקבילים</div>

                                {parallelProcesses.length > 0 ? (
                                    <div className="tracking-parallel-list">
                                        {parallelProcesses.map((process) => (
                                            <div className="tracking-parallel-item" key={process.key}>
                                                <div className="tracking-parallel-marker">
                                                    <span className="tracking-stage-dot" />
                                                </div>

                                                <div className="tracking-parallel-content">
                                                    <h2>{process.title}</h2>
                                                    <p>{process.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="tracking-empty-block">
                                        אין תהליכים מקבילים זמינים כרגע.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
