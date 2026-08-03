import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import {
    acceptPrivacyPolicy,
    getCurrentUser,
    getPrivacyPolicy,
} from "../../api/api.js";
import LoadingSpinner from "./LoadingSpinner";
import "./PrivacyPolicyPage.css";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

const PrivacyPolicyPage = ({ onAccepted }) => {
    const navigate = useNavigate();
    const pdfContainerRef = useRef(null);
    const renderedPagesRef = useRef(new Set());

    const [pdfUrl, setPdfUrl] = useState("");
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(320);

    const [showAcceptButton, setShowAcceptButton] = useState(true);
    const [hasReachedBottom, setHasReachedBottom] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [savingAcceptance, setSavingAcceptance] = useState(false);
    const [error, setError] = useState("");

    const checkIfReachedBottom = useCallback(() => {
        const container = pdfContainerRef.current;

        if (!container) {
            return;
        }

        const scrollPosition = container.scrollTop + container.clientHeight;
        const contentHeight = container.scrollHeight;

        if (scrollPosition >= contentHeight - 80) {
            setHasReachedBottom(true);
        }
    }, []);

    useEffect(() => {
        let objectUrl = "";

        const loadData = async () => {
            try {
                setInitialLoading(true);
                setError("");

                const user = await getCurrentUser();
                setShowAcceptButton(!user?.privacy_policy_accepted);

                const blob = await getPrivacyPolicy();

                if (!blob || blob.size === 0) {
                    throw new Error("Privacy policy file is empty");
                }

                objectUrl = URL.createObjectURL(blob);
                setPdfUrl(objectUrl);
            } catch {
                setError("לא ניתן לטעון את מדיניות הפרטיות");
            } finally {
                setInitialLoading(false);
            }
        };

        loadData();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, []);

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
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (renderedPagesRef.current.size === numPages) {
                checkIfReachedBottom();
            }
        };

        const container = pdfContainerRef.current;

        container?.addEventListener("scroll", handleScroll);

        return () => {
            container?.removeEventListener("scroll", handleScroll);
        };
    }, [pdfUrl, numPages, checkIfReachedBottom]);

    const handleDocumentLoadSuccess = ({ numPages }) => {
        renderedPagesRef.current.clear();
        setHasReachedBottom(false);
        setNumPages(numPages);
    };

    const handlePageRenderSuccess = (pageNumber) => {
        renderedPagesRef.current.add(pageNumber);

        if (renderedPagesRef.current.size === numPages) {
            checkIfReachedBottom();
        }
    };

    const handleDocumentLoadError = () => {
        setError("נכשל בקריאת קובץ מדיניות הפרטיות");
    };

    const handleAccept = async () => {
        try {
            setSavingAcceptance(true);
            setError("");

            await acceptPrivacyPolicy();

            if (onAccepted) {
                onAccepted();
            }

            setShowAcceptButton(false);
            navigate("/home", { replace: true });
        } catch {
            setError("לא ניתן היה לשמור את אישור מדיניות הפרטיות");
        } finally {
            setSavingAcceptance(false);
        }
    };

    return (
        <div className="privacy-page" dir="rtl">
            <div className="privacy-card">
                <div className="privacy-header">
                    <h1>מדיניות פרטיות</h1>
                    <p>
                        בבקשה קרא/י את קובץ מדיניות הפרטיות עד סופו ולאחר מכן לחץ/י על אישור.
                    </p>
                </div>

                {error && <p className="privacy-error">{error}</p>}

                <div className="privacy-pdf-wrapper" ref={pdfContainerRef}>
                    {initialLoading ? (
                        <LoadingSpinner text="טוען מדיניות פרטיות..." />
                    ) : pdfUrl ? (
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={handleDocumentLoadSuccess}
                            onLoadError={handleDocumentLoadError}
                            loading={
                                <LoadingSpinner
                                    text="טוען קובץ מדיניות פרטיות..."
                                    compact
                                />
                            }
                            error={
                                <p className="privacy-error">
                                    נכשל בטעינת קובץ מדיניות הפרטיות
                                </p>
                            }
                        >
                            {Array.from(new Array(numPages || 0), (_, index) => (
                                <div
                                    className="privacy-pdf-page"
                                    key={`page_${index + 1}`}
                                >
                                    <Page
                                        pageNumber={index + 1}
                                        width={containerWidth}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        onRenderSuccess={() =>
                                            handlePageRenderSuccess(index + 1)
                                        }
                                    />
                                </div>
                            ))}
                        </Document>
                    ) : (
                        !error && (
                            <LoadingSpinner text="טוען מדיניות פרטיות..." />
                        )
                    )}
                </div>

                {showAcceptButton && (
                    <div className="privacy-actions">
                        <button
                            className="privacy-accept-btn"
                            onClick={handleAccept}
                            disabled={
                                savingAcceptance ||
                                !pdfUrl ||
                                !hasReachedBottom ||
                                initialLoading
                            }
                            type="button"
                        >
                            {savingAcceptance
                                ? "שומר אישור..."
                                : "הנני מאשר/ת כי קראתי והבנתי את מדיניות הפרטיות וכי אני מסכים/ה לתנאיה"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
