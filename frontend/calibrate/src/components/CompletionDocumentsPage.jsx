import React, { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useTheme } from "@mui/material/styles";
import { Download, Eye, FileText, X } from "lucide-react";
import {
    getCompletionDocumentFileBlob,
    getProjectCompletionDocuments,
} from "../../api/api.js";
import LoadingSpinner from "./LoadingSpinner";
import "./CompletionDocumentsPage.css";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

const statusClassMap = {
    "בטיפול": "in-progress",
    "חסר": "missing",
    "ממתין לבדיקה": "waiting",
    "הושלם": "done",
};

const CompletionDocumentsPage = ({ selectedProject }) => {
    const theme = useTheme();
    const pdfContainerRef = useRef(null);

    const [activeFilter, setActiveFilter] = useState("all");
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [fileLoadingId, setFileLoadingId] = useState(null);
    const [downloadingAll, setDownloadingAll] = useState(false);

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
        info: theme.palette.info.main,
        radius: theme.shape.borderRadius,
        font: theme.typography.fontFamily,
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

    const projectId =
        selectedProject?.id ||
        selectedProject?.project_id ||
        selectedProject?.monday_project_id ||
        selectedProject?.mondayProjectId ||
        localStorage.getItem("selectedProjectId");

    const selectedProjectName =
        selectedProject?.title ||
        selectedProject?.name ||
        selectedProject?.project_name ||
        "";

    const hasFiles = documents.some((documentItem) => documentItem.fileId);

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

                const data = await getProjectCompletionDocuments(projectId);
                setDocuments(data?.documents || []);
            } catch {
                setDocuments([]);
                setError("לא ניתן לטעון את מסמכי תעודת הגמר");
            } finally {
                setLoading(false);
            }
        };

        loadDocuments();
    }, [projectId]);

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
        if (activeFilter === "all") {
            return documents;
        }

        if (activeFilter === "missing") {
            return documents.filter((documentItem) => documentItem.status === "חסר");
        }

        if (activeFilter === "active") {
            return documents.filter(
                (documentItem) =>
                    documentItem.status === "בטיפול" ||
                    documentItem.status === "ממתין לבדיקה"
            );
        }

        if (activeFilter === "done") {
            return documents.filter((documentItem) => documentItem.status === "הושלם");
        }

        return documents;
    }, [activeFilter, documents]);

    const requiredCount = documents.length;

    const missingCount = documents.filter(
        (documentItem) => documentItem.status === "חסר"
    ).length;

    const doneCount = documents.filter(
        (documentItem) => documentItem.status === "הושלם"
    ).length;

    const getStatusStyle = (status) => {
        if (status === "חסר") {
            return {
                color: colors.error,
                backgroundColor: colors.paper,
                border: `1px solid ${colors.error}`,
            };
        }

        if (status === "הושלם") {
            return {
                color: colors.success,
                backgroundColor: colors.paper,
                border: `1px solid ${colors.success}`,
            };
        }

        if (status === "ממתין לבדיקה") {
            return {
                color: colors.info,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.divider}`,
            };
        }

        return {
            color: colors.primaryDark,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.primaryLight}`,
        };
    };

    const isPdfFile = (fileName) => {
        return fileName?.toLowerCase().endsWith(".pdf");
    };

    const downloadBlobAsFile = (blob, fileName) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = fileName || "completion-document.pdf";
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

    const handleViewFile = async (documentItem) => {
        if (!documentItem.fileId) {
            setError("לא נמצא קובץ לצפייה");
            return;
        }

        try {
            setFileLoadingId(documentItem.id);
            setError("");

            const blob = await getCompletionDocumentFileBlob(
                documentItem.fileId,
                documentItem.fileName,
                "inline"
            );

            if (!blob || blob.size === 0) {
                throw new Error("Empty file");
            }

            const objectUrl = URL.createObjectURL(blob);

            if (viewerUrl) {
                URL.revokeObjectURL(viewerUrl);
            }

            if (isPdfFile(documentItem.fileName)) {
                setViewerUrl(objectUrl);
                setViewerFileName(documentItem.fileName || documentItem.title);
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

    const handleDownloadFile = async (documentItem) => {
        if (!documentItem.fileId) {
            setError("לא נמצא קובץ להורדה");
            return;
        }

        try {
            setFileLoadingId(documentItem.id);
            setError("");

            const blob = await getCompletionDocumentFileBlob(
                documentItem.fileId,
                documentItem.fileName,
                "attachment"
            );

            if (!blob || blob.size === 0) {
                throw new Error("Empty file");
            }

            downloadBlobAsFile(
                blob,
                documentItem.fileName || `${documentItem.title}.pdf`
            );
        } catch {
            setError("לא ניתן להוריד את הקובץ");
        } finally {
            setFileLoadingId(null);
        }
    };

    const handleDownloadFullList = async () => {
        if (!hasFiles) {
            setError("אין קבצים להורדה");
            return;
        }

        try {
            setDownloadingAll(true);
            setError("");

            for (const documentItem of documents) {
                if (!documentItem.fileId) {
                    continue;
                }

                const blob = await getCompletionDocumentFileBlob(
                    documentItem.fileId,
                    documentItem.fileName,
                    "attachment"
                );

                if (!blob || blob.size === 0) {
                    continue;
                }

                downloadBlobAsFile(
                    blob,
                    documentItem.fileName || `${documentItem.title}.pdf`
                );

                await waitBetweenDownloads();
            }
        } catch {
            setError("לא ניתן להוריד את כל הקבצים");
        } finally {
            setDownloadingAll(false);
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

    const handleDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleDocumentLoadError = () => {
        setError("נכשל בטעינת קובץ ה־PDF");
    };

    return (
        <main className="completion-documents-page" dir="rtl" style={styles.page}>
            <section className="completion-documents-container">
                <section className="completion-summary-card" style={styles.paperCard}>
                    <div className="completion-summary-icon" style={styles.iconBox} aria-hidden="true">
                        <FileText size={30} strokeWidth={1.8} />
                    </div>

                    <div className="completion-summary-content">
                        <h1 style={styles.title}>רשימת מסמכים לתעודת גמר</h1>

                        <p style={styles.secondaryText}>
                            מסמכים ואישורים נדרשים לקבלת תעודת גמר
                            <span className="completion-count" style={styles.primaryText}> ({requiredCount})</span>
                        </p>

                        {selectedProjectName && (
                            <p className="completion-project-name" style={styles.secondaryText}>
                                פרויקט נבחר: {selectedProjectName}
                            </p>
                        )}

                        <button
                            type="button"
                            className="completion-main-download-button"
                            style={styles.primaryButton}
                            onClick={handleDownloadFullList}
                            disabled={loading || downloadingAll || !hasFiles}
                        >
                            <Download size={16} />
                            <span>
                                {downloadingAll
                                    ? "מוריד מסמכים..."
                                    : "הורדת רשימת מסמכים מלאה"}
                            </span>
                        </button>
                    </div>
                </section>

                <section className="completion-status-strip" aria-label="סטטוס מסמכים">
                    <div className="completion-status-item" style={styles.paperCard}>
                        <span className="status-number" style={styles.primaryText}>{requiredCount}</span>
                        <span className="status-label" style={styles.secondaryText}>סה״כ מסמכים</span>
                    </div>

                    <div className="completion-status-item" style={styles.paperCard}>
                        <span className="status-number" style={styles.primaryText}>{missingCount}</span>
                        <span className="status-label" style={styles.secondaryText}>חסרים</span>
                    </div>

                    <div className="completion-status-item" style={styles.paperCard}>
                        <span className="status-number" style={styles.primaryText}>{doneCount}</span>
                        <span className="status-label" style={styles.secondaryText}>הושלמו</span>
                    </div>
                </section>

                <section className="completion-filters" aria-label="סינון מסמכים">
                    {[
                        { key: "all", label: "הכל" },
                        { key: "active", label: "בטיפול" },
                        { key: "missing", label: "חסרים" },
                        { key: "done", label: "הושלמו" },
                    ].map((filter) => (
                        <button
                            type="button"
                            key={filter.key}
                            style={activeFilter === filter.key ? styles.activeFilter : styles.filter}
                            onClick={() => setActiveFilter(filter.key)}
                        >
                            {filter.label}
                        </button>
                    ))}
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
                ) : filteredDocuments.length === 0 ? (
                    <section
                        className="completion-empty-state"
                        style={{
                            ...styles.paperCard,
                            color: colors.textSecondary,
                        }}
                    >
                        לא נמצאו מסמכים להצגה.
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
                                    <div className="document-icon-box" style={styles.iconBox} aria-hidden="true">
                                        <FileText size={19} />
                                    </div>

                                    <div className="document-title-area">
                                        <h2 style={styles.title}>
                                            {documentItem.title || "מסמך ללא שם"}
                                        </h2>

                                        <div className="document-meta">
                                            <span style={styles.secondaryText}>
                                                תאריך: {documentItem.date || "לא קיים"}
                                            </span>
                                            <span style={styles.secondaryText}>
                                                סוג: {documentItem.type || "לא הוגדר"}
                                            </span>
                                        </div>
                                    </div>

                                    <span
                                        className={`document-status ${statusClassMap[documentItem.status] || ""}`}
                                        style={getStatusStyle(documentItem.status)}
                                    >
                                        {documentItem.status || "לא ידוע"}
                                    </span>
                                </div>

                                <p className="document-description" style={styles.secondaryText}>
                                    {documentItem.description}
                                </p>

                                {documentItem.fileId ? (
                                    <div className="completion-file-row" style={styles.fileRow}>
                                        <div className="completion-file-info" style={{ color: colors.primary }}>
                                            <FileText size={16} />

                                            <div>
                                                <strong style={styles.title}>
                                                    קובץ מצורף לצפייה והורדה
                                                </strong>
                                                <span style={styles.secondaryText}>
                                                    מקור נתונים זמני: Backend mock
                                                </span>
                                            </div>
                                        </div>

                                        <div className="completion-file-actions">
                                            <button
                                                type="button"
                                                className="file-action-btn view-btn"
                                                style={styles.secondaryButton}
                                                onClick={() => handleViewFile(documentItem)}
                                                disabled={
                                                    fileLoadingId === documentItem.id ||
                                                    downloadingAll
                                                }
                                            >
                                                <Eye size={15} />
                                                <span>
                                                    {fileLoadingId === documentItem.id
                                                        ? "טוען..."
                                                        : "צפייה"}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                className="file-action-btn download-btn"
                                                style={styles.primaryButton}
                                                onClick={() => handleDownloadFile(documentItem)}
                                                disabled={
                                                    fileLoadingId === documentItem.id ||
                                                    downloadingAll
                                                }
                                            >
                                                <Download size={15} />
                                                <span>הורדה</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="completion-no-file"
                                        style={{
                                            ...styles.lightBox,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        אין קובץ מצורף למסמך זה
                                    </div>
                                )}
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
                                            נכשל בטעינת קובץ ה־PDF
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
};

export default CompletionDocumentsPage;