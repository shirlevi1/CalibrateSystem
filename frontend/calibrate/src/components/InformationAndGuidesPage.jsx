import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    BookOpen,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    FileText,
    HelpCircle,
    Info,
    LoaderCircle,
    PlayCircle,
    Plus,
    RotateCcw,
    Save,
    ShieldCheck,
    Trash2,
    Video,
    X,
} from "lucide-react";

import {
    getInformationGuideContent,
    updateInformationGuideContent,
} from "../../api/api.js";
import "./InformationAndGuidesPage.css";

const iconMap = {
    clipboard: ClipboardList,
    shield: ShieldCheck,
    info: Info,
};

const fallbackContent = {
    pageTitle: "מידע ומדריכים - בקרת תכן",
    pageDescription: "כל המידע החשוב לשלב התכנון, מרוכז במקום אחד בצורה ברורה ונגישה.",
    heroNoteTitle: "מה חשוב להבין בשלב התכנון?",
    heroNoteText: "בקרת התכן נועדה לוודא שהתכנון של הפרויקט עומד בדרישות המקצועיות לפני שמתחילים את העבודה בפועל.",
    summaryCards: [
        {
            icon: "clipboard",
            title: "מטרת השלב",
            text: "לבחון את התכנון לפני תחילת העבודה.",
        },
        {
            icon: "shield",
            title: "מה בודקים?",
            text: "תקנים, דרישות הנדסיות, מסמכים והתאמה להיתר.",
        },
        {
            icon: "info",
            title: "למה זה חשוב?",
            text: "כדי לצמצם טעויות, עיכובים ותיקונים בשלבים מאוחרים.",
        },
    ],
    guides: [],
    videos: [],
};

const fallbackContentByStep = {
    content_control: fallbackContent,
    work_start_approval: {
        ...fallbackContent,
        pageTitle: "מידע ומדריכים - אישור תחילת עבודה",
    },
};

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
}

function normalizeStep(activeStep) {
    if (
        activeStep === "execution_control" ||
        activeStep === "execution" ||
        activeStep === "execution-control"
    ) {
        return "execution_control";
    }

    if (activeStep === "approval" || activeStep === "work_start_approval") {
        return "work_start_approval";
    }

    return "content_control";
}

function createGuide() {
    return {
        title: "מדריך חדש",
        text: "",
        secondText: "",
        highlight: "",
    };
}

function createVideo() {
    return {
        title: "סרטון חדש",
        description: "לחצי לצפייה בסרטון ההדרכה.",
        src: "",
        thumbnail: "",
    };
}

const InformationAndGuidesPage = ({ currentStep, user }) => {
    const location = useLocation();
    const activeUser = user || getStoredUser();
    const isAdmin = activeUser?.role === "admin";
    const step = normalizeStep(location.state?.currentStep || currentStep);
    const stepFallbackContent = fallbackContentByStep[step] || fallbackContent;

    const [openIndex, setOpenIndex] = useState(0);
    const [activeVideo, setActiveVideo] = useState(null);
    const [content, setContent] = useState(fallbackContent);
    const [draftContent, setDraftContent] = useState(fallbackContent);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const hasChanges = useMemo(
        () => JSON.stringify(content) !== JSON.stringify(draftContent),
        [content, draftContent]
    );

    const loadContent = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError("");
        }

        try {
            const response = await getInformationGuideContent(step);
            const nextContent = response?.content_data || stepFallbackContent;

            setContent(nextContent);
            setDraftContent(nextContent);
            setOpenIndex((currentIndex) =>
                nextContent.guides?.[currentIndex] ? currentIndex : 0
            );

            if (silent) {
                setError("");
            }
        } catch {
            if (!silent) {
                setContent(stepFallbackContent);
                setDraftContent(stepFallbackContent);
                setError("לא ניתן לטעון את המידע והמדריכים מהשרת.");
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [step, stepFallbackContent]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    useEffect(() => {
        if (isAdmin && isEditing) {
            return undefined;
        }

        if (isAdmin) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            loadContent({ silent: true });
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [isAdmin, isEditing, loadContent]);

    const updateField = (field, value) => {
        setSuccessMessage("");
        setDraftContent((current) => ({ ...current, [field]: value }));
    };

    const updateArrayItem = (arrayName, index, field, value) => {
        setSuccessMessage("");
        setDraftContent((current) => ({
            ...current,
            [arrayName]: current[arrayName].map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
            ),
        }));
    };

    const addArrayItem = (arrayName, item) => {
        setSuccessMessage("");
        setDraftContent((current) => ({
            ...current,
            [arrayName]: [...current[arrayName], item],
        }));
    };

    const deleteArrayItem = (arrayName, index) => {
        setSuccessMessage("");
        setDraftContent((current) => ({
            ...current,
            [arrayName]: current[arrayName].filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const resetDraft = () => {
        setDraftContent(content);
        setIsEditing(false);
        setError("");
        setSuccessMessage("");
    };

    const saveChanges = async () => {
        setSaving(true);
        setError("");
        setSuccessMessage("");

        try {
            const response = await updateInformationGuideContent(step, draftContent);
            const savedContent = response?.content_data || draftContent;

            setContent(savedContent);
            setDraftContent(savedContent);
            setIsEditing(false);
            setSuccessMessage("המידע והמדריכים נשמרו בהצלחה.");
        } catch {
            setError("שמירת המידע והמדריכים נכשלה. בדקי הרשאות וחיבור לשרת.");
        } finally {
            setSaving(false);
        }
    };

    const toggleItem = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <main className="information-page" dir="rtl">
            <section className="information-container">
                {isAdmin && !isEditing && (
                    <section className="guides-admin-toolbar view-toolbar" aria-label="תצוגה מקדימה">
                        <div>
                            <strong>תצוגה מקדימה</strong>
                            <span>התוכן מוצג כפי שהיזמים רואים אותו.</span>
                        </div>

                        <button
                            type="button"
                            className="guide-primary-action"
                            onClick={() => setIsEditing(true)}
                        >
                            עריכה
                        </button>
                    </section>
                )}

                {isAdmin && isEditing && (
                    <section className="guides-admin-toolbar" aria-label="ניהול מידע ומדריכים">
                        <div>
                            <strong>מצב עריכה למנהל</strong>
                            <span>שינויים שתשמרי כאן יוצגו למשתמשי יזם.</span>
                        </div>

                        <div className="guides-admin-actions">
                            <button
                                type="button"
                                className="guide-secondary-action"
                                onClick={resetDraft}
                                disabled={saving}
                            >
                                <RotateCcw size={16} />
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="guide-primary-action"
                                onClick={saveChanges}
                                disabled={!hasChanges || saving}
                            >
                                {saving ? (
                                    <LoaderCircle size={16} className="guide-spin-icon" />
                                ) : (
                                    <Save size={16} />
                                )}
                                שמירה
                            </button>
                        </div>
                    </section>
                )}

                {loading && (
                    <div className="guides-status">
                        <LoaderCircle size={16} className="guide-spin-icon" />
                        טוען מידע ומדריכים...
                    </div>
                )}

                {error && <div className="guides-status error">{error}</div>}
                {successMessage && (
                    <div className="guides-status success">{successMessage}</div>
                )}

                <section className="information-hero">
                    <div className="hero-main">
                        <div className="hero-label">
                            <BookOpen size={18} />
                            <span>מרכז מידע מקצועי</span>
                        </div>

                        {isAdmin && isEditing ? (
                            <div className="admin-edit-stack">
                                <label>
                                    כותרת עמוד
                                    <input
                                        value={draftContent.pageTitle}
                                        onChange={(event) =>
                                            updateField("pageTitle", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    תיאור עמוד
                                    <textarea
                                        rows="3"
                                        value={draftContent.pageDescription}
                                        onChange={(event) =>
                                            updateField("pageDescription", event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        ) : (
                            <>
                                <h1>{draftContent.pageTitle}</h1>
                                <p>{draftContent.pageDescription}</p>
                            </>
                        )}

                        <div className="hero-actions-row">
                            <div className="hero-mini-item">
                                <FileText size={18} />
                                <span>מדריכים קצרים וברורים</span>
                            </div>

                            <div className="hero-mini-item">
                                <Video size={18} />
                                <span>סרטוני הדרכה</span>
                            </div>
                        </div>
                    </div>

                    <aside className="hero-note-card">
                        <div className="hero-note-icon">
                            <HelpCircle size={34} />
                        </div>

                        {isAdmin && isEditing ? (
                            <div className="admin-edit-stack">
                                <label>
                                    כותרת הערה
                                    <input
                                        value={draftContent.heroNoteTitle}
                                        onChange={(event) =>
                                            updateField("heroNoteTitle", event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    תוכן הערה
                                    <textarea
                                        rows="4"
                                        value={draftContent.heroNoteText}
                                        onChange={(event) =>
                                            updateField("heroNoteText", event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        ) : (
                            <>
                                <h2>{draftContent.heroNoteTitle}</h2>
                                <p>{draftContent.heroNoteText}</p>
                            </>
                        )}
                    </aside>
                </section>

                <section className="summary-grid" aria-label="תקציר מידע">
                    {draftContent.summaryCards.map((card, index) => {
                        const Icon = iconMap[card.icon] || Info;

                        return (
                            <article className="summary-card" key={`${card.title}-${index}`}>
                                <div className="summary-icon">
                                    <Icon size={22} />
                                </div>

                                <div className="summary-content">
                                    {isAdmin && isEditing ? (
                                        <div className="admin-edit-stack compact">
                                            <label>
                                                אייקון
                                                <select
                                                    value={card.icon}
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "summaryCards",
                                                            index,
                                                            "icon",
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="clipboard">רשימה</option>
                                                    <option value="shield">בטיחות</option>
                                                    <option value="info">מידע</option>
                                                </select>
                                            </label>

                                            <label>
                                                כותרת
                                                <input
                                                    value={card.title}
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "summaryCards",
                                                            index,
                                                            "title",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label>
                                                טקסט
                                                <textarea
                                                    rows="3"
                                                    value={card.text}
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "summaryCards",
                                                            index,
                                                            "text",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <>
                                            <h2>{card.title}</h2>
                                            <p>{card.text}</p>
                                        </>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className="content-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">מדריכים</span>
                            <h2>מדריכים והסברים</h2>
                        </div>

                        <p>לחצי על נושא כדי לפתוח הסבר קצר וממוקד.</p>
                    </div>

                    <div className="accordion-list">
                        {draftContent.guides.map((item, index) => {
                            const isOpen = openIndex === index;

                            return (
                                <article
                                    key={`${item.title}-${index}`}
                                    className={`accordion-card ${isOpen ? "open" : ""}`}
                                >
                                    <button
                                        type="button"
                                        className="accordion-button"
                                        onClick={() => toggleItem(index)}
                                    >
                                        <span className="accordion-title">{item.title}</span>

                                        <span className="accordion-icon">
                                            {isOpen ? (
                                                <ChevronUp size={21} />
                                            ) : (
                                                <ChevronDown size={21} />
                                            )}
                                        </span>
                                    </button>

                                    {isOpen && (
                                        <div className="accordion-content">
                                            {isAdmin && isEditing ? (
                                                <div className="admin-edit-stack">
                                                    <label>
                                                        כותרת מדריך
                                                        <input
                                                            value={item.title}
                                                            onChange={(event) =>
                                                                updateArrayItem(
                                                                    "guides",
                                                                    index,
                                                                    "title",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <label>
                                                        טקסט ראשי
                                                        <textarea
                                                            rows="4"
                                                            value={item.text}
                                                            onChange={(event) =>
                                                                updateArrayItem(
                                                                    "guides",
                                                                    index,
                                                                    "text",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <label>
                                                        טקסט נוסף
                                                        <textarea
                                                            rows="3"
                                                            value={item.secondText || ""}
                                                            onChange={(event) =>
                                                                updateArrayItem(
                                                                    "guides",
                                                                    index,
                                                                    "secondText",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <label>
                                                        הדגשה
                                                        <textarea
                                                            rows="3"
                                                            value={item.highlight}
                                                            onChange={(event) =>
                                                                updateArrayItem(
                                                                    "guides",
                                                                    index,
                                                                    "highlight",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        className="guide-danger-action"
                                                        onClick={() => deleteArrayItem("guides", index)}
                                                    >
                                                        <Trash2 size={15} />
                                                        מחיקת מדריך
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p>{item.text}</p>

                                                    {item.secondText && <p>{item.secondText}</p>}

                                                    <div className="accordion-highlight">
                                                        {item.highlight}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>

                    {isAdmin && isEditing && (
                        <button
                            type="button"
                            className="guide-add-action"
                            onClick={() => addArrayItem("guides", createGuide())}
                        >
                            <Plus size={16} />
                            הוספת מדריך
                        </button>
                    )}
                </section>

                <section className="content-section videos-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">סרטונים</span>
                            <h2>סרטוני הדרכה</h2>
                        </div>

                        <p>סרטונים קצרים להבנה מהירה של התהליך.</p>
                    </div>

                    <div className="videos-grid">
                        {draftContent.videos.map((video, index) => (
                            <article className="video-card" key={`${video.title}-${index}`}>
                                <button
                                    type="button"
                                    className="video-preview"
                                    onClick={() => !(isAdmin && isEditing) && setActiveVideo(video)}
                                    aria-label={`ניגון ${video.title}`}
                                >
                                    {video.thumbnail && (
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="video-thumbnail"
                                            onError={(event) => {
                                                event.currentTarget.style.display = "none";
                                            }}
                                        />
                                    )}

                                    <span className="video-placeholder">
                                        <Video size={30} />
                                    </span>

                                    {!(isAdmin && isEditing) && (
                                        <span className="play-button">
                                            <PlayCircle size={34} />
                                        </span>
                                    )}
                                </button>

                                <div className="video-card-content">
                                    {isAdmin && isEditing ? (
                                        <div className="admin-edit-stack">
                                            <label>
                                                כותרת סרטון
                                                <input
                                                    value={video.title}
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "videos",
                                                            index,
                                                            "title",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label>
                                                תיאור סרטון
                                                <textarea
                                                    rows="3"
                                                    value={video.description || ""}
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "videos",
                                                            index,
                                                            "description",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label>
                                                כתובת סרטון
                                                <input
                                                    value={video.src}
                                                    placeholder="/videos/example.mp4 או https://..."
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "videos",
                                                            index,
                                                            "src",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label>
                                                כתובת תמונת תצוגה
                                                <input
                                                    value={video.thumbnail || ""}
                                                    placeholder="/images/example.jpg"
                                                    onChange={(event) =>
                                                        updateArrayItem(
                                                            "videos",
                                                            index,
                                                            "thumbnail",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <div className="video-admin-row">
                                                <button
                                                    type="button"
                                                    className="guide-secondary-action"
                                                    onClick={() => setActiveVideo(video)}
                                                    disabled={!video.src}
                                                >
                                                    <PlayCircle size={15} />
                                                    תצוגה
                                                </button>

                                                <button
                                                    type="button"
                                                    className="guide-danger-action"
                                                    onClick={() => deleteArrayItem("videos", index)}
                                                >
                                                    <Trash2 size={15} />
                                                    מחיקה
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h3>{video.title}</h3>
                                            <p>{video.description || "לחצי לצפייה בסרטון ההדרכה."}</p>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>

                    {isAdmin && isEditing && (
                        <button
                            type="button"
                            className="guide-add-action"
                            onClick={() => addArrayItem("videos", createVideo())}
                        >
                            <Plus size={16} />
                            הוספת סרטון
                        </button>
                    )}
                </section>
            </section>

            {activeVideo && (
                <div className="video-modal" onClick={() => setActiveVideo(null)}>
                    <div
                        className="video-modal-content"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="close-video-button"
                            onClick={() => setActiveVideo(null)}
                            aria-label="סגירת סרטון"
                        >
                            <X size={22} />
                        </button>

                        <video
                            src={activeVideo.src}
                            controls
                            autoPlay
                            className="active-video"
                        />
                    </div>
                </div>
            )}
        </main>
    );
};

export default InformationAndGuidesPage;
