import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Download, Eye, FileText, X } from "lucide-react";
import {
    getExponetFileBlob,
    getExponetTemplateFileBlob,
    getExponetZipEntries,
    getExponetZipEntryBlob,
    getProjectRequiredDocuments,
} from "../../api/api.js";
import LoadingSpinner from "./LoadingSpinner";
import "./CompletionDocumentsPage.css";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

const FILTERS = [
    { key: "required", label: "נדרשים" },
    { key: "completed", label: "הושלמו" },
    { key: "missing", label: "חסרים" },
];

const STATUS_LABELS = {
    required: "נדרש",
    completed: "הושלם",
    missing: "חסר",
};

const statusClassMap = {
    required: "in-progress",
    completed: "done",
    missing: "missing",
};

const completedStatuses = new Set([
    "Approved",
    "ApprovedWithComments",
    "מאושר",
    "אושר",
    "הושלם",
]);

const irrelevantStatuses = new Set([
    "NotRelevant",
    "Not Relevant",
    "Irrelevant",
    "לא רלוונטי",
]);

function getDocumentStatusKey(item) {
    const reviewStatus = String(item.reviewStatusName || "").trim();

    if (completedStatuses.has(reviewStatus)) {
        return "completed";
    }

    if (!irrelevantStatuses.has(reviewStatus)) {
        return "missing";
    }

    return "required";
}

function isZipFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const extension = String(file?.fileExtension || file?.file_extension || "").toLowerCase();

    return name.endsWith(".zip") || extension === "zip";
}

function normalizeDocument(item) {
    const statusKey = getDocumentStatusKey(item);
    const files = item.files || [];

    return {
        id: item.id || `${item.text}-${item.indexRow}`,
        title: item.text || "מסמך ללא שם",
        statusKey,
        status: STATUS_LABELS[statusKey],
        reviewStatusName: item.reviewStatusName || "",
        date: item.updatedAt || item.createdAt || "",
        type: item.subjectName || (item.isFolder ? "תיקייה" : "מסמך"),
        description: "מסמך פרויקט",
        templateFileId: item.templateFileId || null,
        templateFileUrl: item.templateFileUrl || null,
        templateFileName: item.templateFileName || item.text || "template-file",
        fileCount: item.fileCount ?? files.length,
        files: files.map((file) => ({
            ...file,
            isZip: isZipFile(file),
            extractedFiles: [],
        })),
    };
}

function normalizeStep(value) {
    if (value === "approval" || value === "work_start_approval") {
        return "approval";
    }

    return "content_control";
}

function ProjectRequiredDocuments({
                                      projectId,
                                      selectedProject,
                                      initialFilter = "required",
                                      currentStep = "content_control",
                                  }) {
    const theme = useTheme();
    const location = useLocation();
    const pdfContainerRef = useRef(null);

    const [activeFilter, setActiveFilter] = useState(initialFilter);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [zipLoading, setZipLoading] = useState(false);

    const [fileLoadingId, setFileLoadingId] = useState(null);
    const [downloadingList, setDownloadingList] = useState(false);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFileName, setViewerFileName] = useState("");
    const [viewerUrl, setViewerUrl] = useState("");
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(320);

    const colors = {
        primary: theme.palette.primary.main,
        primaryLight: theme.palette.primary.light,
        primaryDark: theme.palette.primary.dark,
        primaryContrast: theme.palette.primary.contrastText,
        bg: theme.palette.background.default,
        paper: theme.palette.background.paper,
        textPrimary: theme.palette.text.primary,
        textSecondary: theme.palette.text.secondary,
        divider: theme.palette.divider,
        error: theme.palette.error.main,
        success: theme.palette.success.main,
        font: theme.typography.fontFamily,
        radius: theme.shape.borderRadius,
    };

    const styles = {
        page: {
            backgroundColor: colors.bg,
            color: colors.textPrimary,
            fontFamily: colors.font,
        },
        paperCard: {
            backgroundColor: colors.paper,
            border: `1px solid ${colors.divider}`,
            borderRadius: colors.radius,
        },
        lightBox: {
            backgroundColor: colors.bg,
            border: `1px solid ${colors.divider}`,
            borderRadius: colors.radius,
        },
        iconBox: {
            backgroundColor: colors.bg,
            border: `1px solid ${colors.divider}`,
            borderRadius: colors.radius,
            color: colors.primary,
        },
        title: {
            color: colors.textPrimary,
        },
        secondaryText: {
            color: colors.textSecondary,
        },
        primaryText: {
            color: colors.primary,
        },
        primaryButton: {
            backgroundColor: colors.primary,
            border: `1px solid ${colors.primary}`,
            borderRadius: colors.radius,
            color: colors.primaryContrast,
        },
        secondaryButton: {
            backgroundColor: colors.paper,
            border: `1px solid ${colors.divider}`,
            borderRadius: colors.radius,
            color: colors.textPrimary,
        },
        activeFilter: {
            backgroundColor: colors.primary,
            border: `1px solid ${colors.primary}`,
            color: colors.primaryContrast,
            borderRadius: colors.radius,
        },
        filter: {
            backgroundColor: colors.paper,
            border: `1px solid ${colors.divider}`,
            color: colors.textPrimary,
            borderRadius: colors.radius,
        },
        fileRow: {
            backgroundColor: colors.bg,
            border: `1px solid ${colors.divider}`,
            borderRadius: colors.radius,
        },
        overlay: {
            backgroundColor: "rgba(44, 51, 56, 0.55)",
        },
        viewerBody: {
            backgroundColor: colors.bg,
        },
        viewerPage: {
            backgroundColor: colors.paper,
            border: `1px solid ${colors.divider}`,
            borderRadius: colors.radius,
        },
    };

    const selectedProjectName =
        selectedProject?.title ||
        selectedProject?.name ||
        selectedProject?.project_name ||
        "";
    const activeStep = normalizeStep(location.state?.currentStep || currentStep);
    const documentStage = activeStep === "approval" ? "taas" : null;

    useEffect(() => {
        if (initialFilter === "all") {
            setActiveFilter("required");
            return;
        }

        setActiveFilter(initialFilter || "required");
    }, [initialFilter]);

    useEffect(() => {
        const loadDocuments = async () => {
            if (!projectId) {
                setDocuments([]);
                setError("לא נבחר פרויקט");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await getProjectRequiredDocuments(projectId, {
                    stage: documentStage,
                });
                const normalizedDocuments = (data.items || []).map(normalizeDocument);

                setDocuments(normalizedDocuments);

                const zipFiles = normalizedDocuments.flatMap((documentItem) =>
                    documentItem.files
                        .filter((file) => file.isZip)
                        .map((file) => ({
                            documentId: documentItem.id,
                            file,
                        }))
                );

                if (zipFiles.length > 0) {
                    setZipLoading(true);

                    const zipResults = await Promise.all(
                        zipFiles.map(async ({ documentId, file }) => {
                            try {
                                const zipData = await getExponetZipEntries(file.id);

                                return {
                                    documentId,
                                    fileId: file.id,
                                    entries: zipData.entries || [],
                                };
                            } catch {
                                return {
                                    documentId,
                                    fileId: file.id,
                                    entries: [],
                                };
                            }
                        })
                    );

                    setDocuments((currentDocuments) =>
                        currentDocuments.map((documentItem) => ({
                            ...documentItem,
                            files: documentItem.files.map((file) => {
                                const zipResult = zipResults.find(
                                    (result) =>
                                        result.documentId === documentItem.id &&
                                        result.fileId === file.id
                                );

                                if (!zipResult) {
                                    return file;
                                }

                                return {
                                    ...file,
                                    extractedFiles: zipResult.entries,
                                };
                            }),
                        }))
                    );

                    setZipLoading(false);
                }
            } catch {
                setDocuments([]);
                setError("לא ניתן לטעון את מסמכי הפרויקט");
            } finally {
                setLoading(false);
                setZipLoading(false);
            }
        };

        loadDocuments();
    }, [documentStage, projectId]);

    useEffect(() => {
        const updateWidth = () => {
            if (!pdfContainerRef.current) {
                return;
            }

            const width = pdfContainerRef.current.offsetWidth;
            setContainerWidth(Math.max(280, Math.min(width - 16, 900)));
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);

        return () => {
            window.removeEventListener("resize", updateWidth);
        };
    }, [viewerOpen]);

    useEffect(() => {
        return () => {
            if (viewerUrl) {
                URL.revokeObjectURL(viewerUrl);
            }
        };
    }, [viewerUrl]);

    const filteredDocuments = useMemo(() => {
        if (activeFilter === "required") {
            return documents;
        }

        return documents.filter(
            (documentItem) => documentItem.statusKey === activeFilter
        );
    }, [activeFilter, documents]);

    const documentCounts = useMemo(() => {
        return {
            required: documents.length,
            completed: documents.filter(
                (documentItem) => documentItem.statusKey === "completed"
            ).length,
            missing: documents.filter(
                (documentItem) => documentItem.statusKey === "missing"
            ).length,
        };
    }, [documents]);

    const activeFilterLabel =
        FILTERS.find((filter) => filter.key === activeFilter)?.label || "נדרשים";

    const getStatusStyle = (statusKey) => {
        if (statusKey === "missing") {
            return {
                color: colors.error,
                backgroundColor: colors.paper,
                border: `1px solid ${colors.error}`,
            };
        }

        if (statusKey === "completed") {
            return {
                color: colors.success,
                backgroundColor: colors.paper,
                border: `1px solid ${colors.success}`,
            };
        }

        return {
            color: colors.primaryDark,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.primaryLight}`,
        };
    };

    const hasTemplateFile = useCallback((documentItem) => {
        return documentItem.templateFileUrl !== null && Boolean(documentItem.templateFileUrl);
    }, []);

    const getFilesForDownloadFromDocument = useCallback((documentItem) => {
        if (documentItem.statusKey === "missing") {
            if (!hasTemplateFile(documentItem)) {
                return [];
            }

            return [
                {
                    type: "template",
                    id: `template:${documentItem.id}`,
                    documentItem,
                },
            ];
        }

        return (documentItem.files || []).flatMap((file) => {
            if (file.isZip) {
                return (file.extractedFiles || []).map((entry) => ({
                    type: "zipEntry",
                    id: `${file.id}:${entry.name}`,
                    fileId: file.id,
                    name: entry.name,
                }));
            }

            return [
                {
                    type: "file",
                    id: file.id,
                    file,
                },
            ];
        });
    }, [hasTemplateFile]);

    const downloadableFilteredItems = useMemo(() => {
        return filteredDocuments.flatMap(getFilesForDownloadFromDocument);
    }, [filteredDocuments, getFilesForDownloadFromDocument]);

    const hasDownloadableFilteredItems = downloadableFilteredItems.length > 0;

    const formatDate = (value) => {
        if (!value) return "לא קיים";

        return new Date(value).toLocaleString("he-IL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const isPdfFile = (fileName) => {
        return fileName?.toLowerCase().endsWith(".pdf");
    };

    const downloadBlobAsFile = (blob, fileName) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = fileName || "project-document.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(objectUrl);
    };

    const waitBetweenDownloads = () => {
        return new Promise((resolve) => {
            setTimeout(resolve, 350);
        });
    };

    const handleViewFile = async (file) => {
        try {
            setFileLoadingId(file.id);
            setError("");

            const blob = await getExponetFileBlob(file.id, file.name, "inline");

            if (!blob || blob.size === 0) {
                throw new Error("Empty file");
            }

            const objectUrl = URL.createObjectURL(blob);

            if (viewerUrl) {
                URL.revokeObjectURL(viewerUrl);
            }

            if (isPdfFile(file.name)) {
                setViewerUrl(objectUrl);
                setViewerFileName(file.name);
                setViewerOpen(true);
                setNumPages(null);
            } else {
                window.open(objectUrl, "_blank", "noopener,noreferrer");
            }
        } catch {
            setError("לא ניתן להציג את הקובץ");
        } finally {
            setFileLoadingId(null);
        }
    };

    const handleDownloadFile = async (file) => {
        try {
            setFileLoadingId(file.id);
            setError("");

            const blob = await getExponetFileBlob(file.id, file.name, "attachment");

            if (!blob || blob.size === 0) {
                throw new Error("Empty file");
            }

            downloadBlobAsFile(blob, file.name || `file-${file.id}`);
        } catch {
            setError("לא ניתן להוריד את הקובץ");
        } finally {
            setFileLoadingId(null);
        }
    };

    const handleDownloadZipEntry = async (fileId, entryName) => {
        const loadingId = `${fileId}:${entryName}`;

        try {
            setFileLoadingId(loadingId);
            setError("");

            const blob = await getExponetZipEntryBlob(fileId, entryName);

            if (!blob || blob.size === 0) {
                throw new Error("Empty file");
            }

            downloadBlobAsFile(blob, entryName.split("/").pop() || entryName);
        } catch {
            setError("לא ניתן להוריד את הקובץ מתוך ה-ZIP");
        } finally {
            setFileLoadingId(null);
        }
    };

    const handleDownloadTemplate = async (documentItem) => {
        if (!hasTemplateFile(documentItem)) {
            return;
        }

        const loadingId = `template:${documentItem.id}`;

        try {
            setFileLoadingId(loadingId);
            setError("");

            const fileName = documentItem.templateFileName || documentItem.title;
            const blob = await getExponetTemplateFileBlob({
                fileId: documentItem.templateFileId,
                fileUrl: documentItem.templateFileUrl,
                fileName,
            });

            if (!blob || blob.size === 0) {
                throw new Error("Empty file");
            }

            downloadBlobAsFile(blob, fileName);
        } catch {
            setError("לא ניתן להוריד את קובץ התבנית");
        } finally {
            setFileLoadingId(null);
        }
    };

    const handleDownloadItem = async (downloadItem) => {
        if (downloadItem.type === "template") {
            await handleDownloadTemplate(downloadItem.documentItem);
            return;
        }

        if (downloadItem.type === "zipEntry") {
            await handleDownloadZipEntry(downloadItem.fileId, downloadItem.name);
            return;
        }

        await handleDownloadFile(downloadItem.file);
    };

    const handleDownloadFilteredList = async () => {
        if (!hasDownloadableFilteredItems) {
            return;
        }

        try {
            setDownloadingList(true);
            setError("");

            for (const downloadItem of downloadableFilteredItems) {
                await handleDownloadItem(downloadItem);
                await waitBetweenDownloads();
            }
        } catch {
            setError("לא ניתן להוריד את הרשימה לפי הסינון הנבחר");
        } finally {
            setDownloadingList(false);
            setFileLoadingId(null);
        }
    };

    const closeViewer = () => {
        setViewerOpen(false);
        setViewerFileName("");
        setNumPages(null);

        if (viewerUrl) {
            URL.revokeObjectURL(viewerUrl);
            setViewerUrl("");
        }
    };

    const handleDocumentLoadSuccess = ({ numPages: loadedPages }) => {
        setNumPages(loadedPages);
    };

    const handleDocumentLoadError = () => {
        setError("נכשל בטעינת קובץ ה-PDF");
    };

    return (
        <main className="completion-documents-page" dir="rtl" style={styles.page}>
            <section className="completion-documents-container">
                <section className="completion-summary-card" style={styles.paperCard}>
                    <div
                        className="completion-summary-icon"
                        style={styles.iconBox}
                        aria-hidden="true"
                    >
                        <FileText size={30} strokeWidth={1.8} />
                    </div>

                    <div className="completion-summary-content">
                        <h1 style={styles.title}>מסמכי הפרויקט</h1>

                        <p style={styles.secondaryText}>
                            ניהול וסינון מסמכים לפי סטטוס בפרויקט
                            <span className="completion-count" style={styles.primaryText}>
                                {" "}
                                ({documentCounts.required})
                            </span>
                        </p>

                        {selectedProjectName && (
                            <p
                                className="completion-project-name"
                                style={styles.secondaryText}
                            >
                                פרויקט נבחר: {selectedProjectName}
                            </p>
                        )}
                    </div>
                </section>

                <section className="completion-status-strip" aria-label="סטטוס מסמכים">
                    <div className="completion-status-item" style={styles.paperCard}>
                        <span className="status-number" style={styles.primaryText}>
                            {documentCounts.required}
                        </span>
                        <span className="status-label" style={styles.secondaryText}>
                            נדרשים
                        </span>
                    </div>

                    <div className="completion-status-item" style={styles.paperCard}>
                        <span className="status-number" style={styles.primaryText}>
                            {documentCounts.completed}
                        </span>
                        <span className="status-label" style={styles.secondaryText}>
                            הושלמו
                        </span>
                    </div>

                    <div className="completion-status-item" style={styles.paperCard}>
                        <span className="status-number" style={styles.primaryText}>
                            {documentCounts.missing}
                        </span>
                        <span className="status-label" style={styles.secondaryText}>
                            חסרים
                        </span>
                    </div>
                </section>

                <section
                    className="completion-filter-toolbar"
                    aria-label="סינון והורדת מסמכים"
                >
                    <div className="completion-filters" aria-label="סינון מסמכים">
                        {FILTERS.map((filter) => (
                            <button
                                type="button"
                                key={filter.key}
                                style={
                                    activeFilter === filter.key
                                        ? styles.activeFilter
                                        : styles.filter
                                }
                                onClick={() => setActiveFilter(filter.key)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="completion-main-download-button"
                        style={styles.primaryButton}
                        onClick={handleDownloadFilteredList}
                        disabled={loading || downloadingList || !hasDownloadableFilteredItems}
                    >
                        <Download size={16} />
                        <span>
                            {downloadingList
                                ? "מוריד מסמכים..."
                                : `הורדת רשימת ${activeFilterLabel}`}
                        </span>
                    </button>
                </section>

                {error && (
                    <section
                        className="completion-empty-state error"
                        style={{
                            ...styles.paperCard,
                            color: colors.error,
                        }}
                    >
                        {error}
                    </section>
                )}

                {loading ? (
                    <section className="completion-empty-state" style={styles.paperCard}>
                        <LoadingSpinner text="טוען מסמכים..." />
                    </section>
                ) : documents.length === 0 ? (
                    <section
                        className="completion-empty-state"
                        style={{
                            ...styles.paperCard,
                            color: colors.textSecondary,
                        }}
                    >
                        לא נמצאו מסמכים
                    </section>
                ) : filteredDocuments.length === 0 ? (
                    <section
                        className="completion-empty-state"
                        style={{
                            ...styles.paperCard,
                            color: colors.textSecondary,
                        }}
                    >
                        לא נמצאו מסמכים בסטטוס זה
                    </section>
                ) : (
                    <section className="completion-documents-list">
                        {filteredDocuments.map((documentItem) => (
                            <article
                                className="completion-document-card"
                                style={styles.paperCard}
                                key={documentItem.id}
                            >
                                <div className="document-card-header">
                                    <div
                                        className="document-icon-box"
                                        style={styles.iconBox}
                                        aria-hidden="true"
                                    >
                                        <FileText size={19} />
                                    </div>

                                    <div className="document-title-area">
                                        <h2 style={styles.title}>{documentItem.title}</h2>

                                        <div className="document-meta">
                                            <span style={styles.secondaryText}>
                                                תאריך: {formatDate(documentItem.date)}
                                            </span>
                                            <span style={styles.secondaryText}>
                                                סוג: {documentItem.type || "לא הוגדר"}
                                            </span>
                                            <span style={styles.secondaryText}>
                                                {documentItem.fileCount || 0} קבצים
                                            </span>
                                        </div>
                                    </div>

                                    <span
                                        className={`document-status ${
                                            statusClassMap[documentItem.statusKey] || ""
                                        }`}
                                        style={getStatusStyle(documentItem.statusKey)}
                                    >
                                        {documentItem.status}
                                    </span>
                                </div>

                                {documentItem.reviewStatusName ? (
                                    <p
                                        className="document-description"
                                        style={styles.secondaryText}
                                    >
                                        סטטוס מקור: {documentItem.reviewStatusName}
                                    </p>
                                ) : null}

                                {documentItem.statusKey !== "missing" &&
                                    documentItem.files.flatMap((file) => {
                                        if (file.isZip) {
                                            return (file.extractedFiles || []).map((entry) => (
                                                <div
                                                    className="completion-file-row"
                                                    style={styles.fileRow}
                                                    key={`${file.id}:${entry.name}`}
                                                >
                                                    <div
                                                        className="completion-file-info"
                                                        style={{ color: colors.primary }}
                                                    >
                                                        <FileText size={16} />

                                                        <div>
                                                            <strong style={styles.title}>
                                                                {entry.name.split("/").pop() ||
                                                                    entry.name}
                                                            </strong>
                                                            <span style={styles.secondaryText}>
                                                                קובץ שחולץ מתוך ZIP
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="completion-file-actions">
                                                        <button
                                                            type="button"
                                                            className="file-action-btn download-btn"
                                                            style={styles.primaryButton}
                                                            onClick={() =>
                                                                handleDownloadZipEntry(
                                                                    file.id,
                                                                    entry.name
                                                                )
                                                            }
                                                            disabled={
                                                                fileLoadingId ===
                                                                `${file.id}:${entry.name}` ||
                                                                downloadingList
                                                            }
                                                        >
                                                            <Download size={15} />
                                                            <span>הורדה</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ));
                                        }

                                        return [
                                            <div
                                                className="completion-file-row"
                                                style={styles.fileRow}
                                                key={file.id}
                                            >
                                                <div
                                                    className="completion-file-info"
                                                    style={{ color: colors.primary }}
                                                >
                                                    <FileText size={16} />

                                                    <div>
                                                        <strong style={styles.title}>
                                                            {file.name || `קובץ ${file.id}`}
                                                        </strong>
                                                        <span style={styles.secondaryText}>
                                                            הועלה על ידי{" "}
                                                            {file.uploadedBy || "לא ידוע"} ·{" "}
                                                            {formatDate(file.uploadedAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="completion-file-actions">
                                                    <button
                                                        type="button"
                                                        className="file-action-btn view-btn"
                                                        style={styles.secondaryButton}
                                                        onClick={() => handleViewFile(file)}
                                                        disabled={
                                                            fileLoadingId === file.id ||
                                                            downloadingList
                                                        }
                                                    >
                                                        <Eye size={15} />
                                                        <span>
                                                            {fileLoadingId === file.id
                                                                ? "טוען..."
                                                                : "צפייה"}
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="file-action-btn download-btn"
                                                        style={styles.primaryButton}
                                                        onClick={() => handleDownloadFile(file)}
                                                        disabled={
                                                            fileLoadingId === file.id ||
                                                            downloadingList
                                                        }
                                                    >
                                                        <Download size={15} />
                                                        <span>הורדה</span>
                                                    </button>
                                                </div>
                                            </div>,
                                        ];
                                    })}

                                {zipLoading &&
                                documentItem.statusKey !== "missing" &&
                                documentItem.files.some((file) => file.isZip) ? (
                                    <div
                                        className="completion-no-file"
                                        style={{
                                            ...styles.lightBox,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        טוען קבצים מתוך ZIP...
                                    </div>
                                ) : null}

                                {documentItem.statusKey === "missing" && hasTemplateFile(documentItem) ? (
                                    <div className="completion-file-row" style={styles.fileRow}>
                                        <div
                                            className="completion-file-info"
                                            style={{ color: colors.primary }}
                                        >
                                            <FileText size={16} />

                                            <div>
                                                <strong style={styles.title}>
                                                    קובץ תבנית להשלמת המסמך
                                                </strong>
                                                <span style={styles.secondaryText}>
                                                    זמין למסמכים חסרים בלבד
                                                </span>
                                            </div>
                                        </div>

                                        <div className="completion-file-actions">
                                            <button
                                                type="button"
                                                className="file-action-btn download-btn"
                                                style={styles.primaryButton}
                                                onClick={() => handleDownloadTemplate(documentItem)}
                                                disabled={
                                                    fileLoadingId ===
                                                    `template:${documentItem.id}` ||
                                                    downloadingList
                                                }
                                            >
                                                <Download size={15} />
                                                <span>
                                                    {fileLoadingId ===
                                                    `template:${documentItem.id}`
                                                        ? "מוריד..."
                                                        : "הורדת תבנית"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                {documentItem.statusKey === "missing" && !hasTemplateFile(documentItem) ? (
                                    <div
                                        className="completion-no-file"
                                        style={{
                                            ...styles.lightBox,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        אין תבנית זמינה להורדה למסמך זה
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </section>
                )}
            </section>

            {viewerOpen && (
                <div
                    className="pdf-viewer-overlay"
                    style={styles.overlay}
                    onClick={closeViewer}
                >
                    <div
                        className="pdf-viewer-modal"
                        style={styles.paperCard}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="pdf-viewer-header" style={styles.paperCard}>
                            <button
                                type="button"
                                className="pdf-viewer-close"
                                style={styles.secondaryButton}
                                onClick={closeViewer}
                                aria-label="סגירת צפייה"
                            >
                                <X size={18} />
                            </button>

                            <h3 style={styles.title}>{viewerFileName}</h3>
                        </div>

                        <div
                            className="pdf-viewer-body"
                            style={styles.viewerBody}
                            ref={pdfContainerRef}
                        >
                            {viewerUrl ? (
                                <Document
                                    file={viewerUrl}
                                    onLoadSuccess={handleDocumentLoadSuccess}
                                    onLoadError={handleDocumentLoadError}
                                    loading={<LoadingSpinner text="טוען קובץ..." compact />}
                                    error={
                                        <p
                                            className="completion-viewer-error"
                                            style={{ color: colors.error }}
                                        >
                                            נכשל בטעינת קובץ ה-PDF
                                        </p>
                                    }
                                >
                                    {Array.from(new Array(numPages || 0), (_, index) => (
                                        <div
                                            className="pdf-viewer-page"
                                            style={styles.viewerPage}
                                            key={`page_${index + 1}`}
                                        >
                                            <Page
                                                pageNumber={index + 1}
                                                width={containerWidth}
                                                renderAnnotationLayer={false}
                                                renderTextLayer={false}
                                            />
                                        </div>
                                    ))}
                                </Document>
                            ) : (
                                <LoadingSpinner text="טוען קובץ..." />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default ProjectRequiredDocuments;
