import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    UserRound,
    X,
    HelpCircle,
    Mail,
    Sparkles,
    Send,
    CheckCircle,
    Headset,
    LoaderCircle,
    Plus,
    RotateCcw,
    Save,
    Trash2
} from "lucide-react";
import "./ChatbotWidget.css";
import {
    getChatbotQuestions,
    sendAdminMessage,
    updateChatbotQuestions
} from "../../api/api.js";

const fallbackQuickQuestions = [
    {
        id: "missing-docs",
        question: "איפה רואים מסמכים חסרים?",
        answer: "את המסמכים החסרים ניתן לראות דרך הכרטיס 'מסמכים חסרים' בדף הבית. שם יוצגו מסמכים שעדיין דורשים טיפול או השלמה."
    },
    {
        id: "required-docs",
        question: "איפה רואים מסמכים נדרשים?",
        answer: "את כל המסמכים הנדרשים לפרויקט ניתן לראות דרך הכרטיס 'מסמכים נדרשים'. המסך מציג את כלל הטפסים והמסמכים הרלוונטיים לפרויקט."
    },
    {
        id: "download-doc",
        question: "איך מורידים מסמך?",
        answer: "במסך המסמכים, ליד כל קובץ מופיע כפתור הורדה. לחיצה עליו תוריד את הקובץ למחשב."
    },
    {
        id: "inspectors",
        question: "איפה רואים את צוות המלווה?",
        answer: "את צוות המלווה ניתן לראות דרך הכרטיס 'צוות מלווה'. שם יוצגו אנשי המקצוע או הגורמים המלווים של הפרויקט."
    },
    {
        id: "change-project",
        question: "איך בוחרים פרויקט אחר?",
        answer: "ניתן לבחור פרויקט אחר דרך מסך בחירת הפרויקטים או דרך תפריט המערכת, בהתאם להרשאות המשתמש."
    }
];

const inquirySubjects = [
    "מסמכים חסרים",
    "מסמכים נדרשים",
    "צוות מלווה",
    "בחירת פרויקט",
    "בעיה טכנית במערכת",
    "תיאום פגישה",
    "שאלה לגבי התהליך",
    "בקשה כללית",
    "אחר"
];

const inquiryTypes = [
    "מסמכים חסרים",
    "מסמכים נדרשים",
    "סטטוס פרויקט",
    "צוות מלווה",
    "בחירת פרויקט",
    "התחברות או הרשאות",
    "בעיה טכנית",
    "שאלה לגבי התהליך",
    "בקשה לתיאום פגישה",
    "בקשה לחזרה טלפונית",
    "בקשה כללית",
    "אחר"
];

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
}

function InlineChoiceField({
    id,
    value,
    options,
    onChange,
    disabled,
    openChoiceField,
    setOpenChoiceField,
    scrollToForm,
}) {
    const isChoiceOpen = openChoiceField === id;

    return (
        <div className="chatbot-choice-field">
            <button
                type="button"
                className="chatbot-choice-trigger"
                onClick={() => {
                    if (disabled) {
                        return;
                    }

                    setOpenChoiceField(isChoiceOpen ? null : id);
                    scrollToForm();
                }}
                disabled={disabled}
            >
                <span>{value}</span>

                <span
                    className={
                        isChoiceOpen
                            ? "chatbot-choice-arrow open"
                            : "chatbot-choice-arrow"
                    }
                >
                    ▾
                </span>
            </button>

            {isChoiceOpen && (
                <div className="chatbot-choice-list">
                    {options.map((option) => (
                        <button
                            type="button"
                            key={option}
                            className={
                                option === value
                                    ? "chatbot-choice-option selected"
                                    : "chatbot-choice-option"
                            }
                            onClick={() => {
                                onChange(option);
                                setOpenChoiceField(null);
                                scrollToForm();
                            }}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ChatbotWidget({ selectedProject = null, variant = "floating" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [conversation, setConversation] = useState([
        {
            sender: "bot",
            text: "שלום, אני מר בקר 👋\nאפשר לבחור שאלה נפוצה ולקבל מענה מידי. אם לא נמצא מענה מתאים, אפשר לשלוח פנייה מסודרת לצוות הניהול."
        }
    ]);

    const [showContactForm, setShowContactForm] = useState(false);
    const [isConfirmingSend, setIsConfirmingSend] = useState(false);
    const [isSendingToAdmin, setIsSendingToAdmin] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    const [inquirySubject, setInquirySubject] = useState(inquirySubjects[0]);
    const [inquiryType, setInquiryType] = useState(inquiryTypes[0]);
    const [inquiryGoal, setInquiryGoal] = useState("");
    const [inquiryDetails, setInquiryDetails] = useState("");
    const [adminMessage, setAdminMessage] = useState("");

    const [openChoiceField, setOpenChoiceField] = useState(null);

    const messagesEndRef = useRef(null);
    const contactFormRef = useRef(null);

    const isInline = variant === "inline";
    const isAdmin = getStoredUser()?.role === "admin";

    const [quickQuestions, setQuickQuestions] = useState(fallbackQuickQuestions);
    const [draftQuestions, setDraftQuestions] = useState(fallbackQuickQuestions);
    const [isEditingQuestions, setIsEditingQuestions] = useState(false);
    const [openDraftQuestionId, setOpenDraftQuestionId] = useState(null);
    const [questionsLoading, setQuestionsLoading] = useState(true);
    const [questionsSaving, setQuestionsSaving] = useState(false);
    const [questionsMessage, setQuestionsMessage] = useState("");

    const hasQuestionChanges = useMemo(
        () => JSON.stringify(quickQuestions) !== JSON.stringify(draftQuestions),
        [quickQuestions, draftQuestions]
    );

    const loadQuickQuestions = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setQuestionsLoading(true);
            setQuestionsMessage("");
        }

        try {
            const data = await getChatbotQuestions();
            const loadedQuestions = Array.isArray(data) && data.length
                ? data
                : fallbackQuickQuestions;

            setQuickQuestions(loadedQuestions);
            setDraftQuestions(loadedQuestions);
            setOpenDraftQuestionId((currentId) => currentId || loadedQuestions[0]?.id || null);
            setQuestionsMessage("");
        } catch {
            if (!silent) {
                setQuickQuestions(fallbackQuickQuestions);
                setDraftQuestions(fallbackQuickQuestions);
                setQuestionsMessage("לא ניתן לטעון את שאלות הצ'אט מהשרת. מוצגות שאלות ברירת מחדל.");
            }
        } finally {
            if (!silent) {
                setQuestionsLoading(false);
            }
        }
    }, []);

    const scrollToBottom = () => {
        window.setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end"
            });
        }, 90);
    };

    const scrollToForm = () => {
        window.setTimeout(() => {
            contactFormRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 120);
    };

    const closeChoiceFields = () => {
        setOpenChoiceField(null);
    };

    useEffect(() => {
        loadQuickQuestions();
    }, [loadQuickQuestions]);

    useEffect(() => {
        if (isAdmin || isEditingQuestions) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            loadQuickQuestions({ silent: true });
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAdmin, isEditingQuestions, loadQuickQuestions]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [conversation, showContactForm, isConfirmingSend, statusMessage, isOpen]);

    const openChat = () => {
        setIsOpen(true);
        scrollToBottom();
    };

    const closeChat = () => {
        setIsOpen(false);
        closeChoiceFields();
    };

    const getProjectId = () => {
        return (
            selectedProject?.id ||
            selectedProject?.project_id ||
            selectedProject?.projectId ||
            null
        );
    };

    const getProjectLabel = () => {
        return (
            selectedProject?.name ||
            selectedProject?.project_name ||
            selectedProject?.id ||
            selectedProject?.project_id ||
            "לא צוין"
        );
    };

    const updateDraftQuestion = (id, field, value) => {
        setQuestionsMessage("");

        setDraftQuestions((currentQuestions) =>
            currentQuestions.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const addDraftQuestion = () => {
        setQuestionsMessage("");
        const newQuestionId = `new-${Date.now()}`;

        setDraftQuestions((currentQuestions) => [
            ...currentQuestions,
            {
                id: newQuestionId,
                question: "",
                answer: "",
            },
        ]);
        setOpenDraftQuestionId(newQuestionId);
    };

    const deleteDraftQuestion = (id) => {
        setQuestionsMessage("");
        setDraftQuestions((currentQuestions) =>
            currentQuestions.filter((item) => item.id !== id)
        );
        setOpenDraftQuestionId(null);
    };

    const cancelQuestionEditing = () => {
        setDraftQuestions(quickQuestions);
        setOpenDraftQuestionId(quickQuestions[0]?.id || null);
        setIsEditingQuestions(false);
        setQuestionsMessage("");
    };

    const saveQuickQuestions = async () => {
        const hasEmptyQuestion = draftQuestions.some(
            (item) => !item.question.trim() || !item.answer.trim()
        );

        if (hasEmptyQuestion) {
            setQuestionsMessage("יש למלא שאלה ותשובה לכל פריט לפני שמירה.");
            return;
        }

        setQuestionsSaving(true);
        setQuestionsMessage("");

        try {
            const savedQuestions = await updateChatbotQuestions(
                draftQuestions.map(({ id, question, answer }) => ({
                    id: typeof id === "number" ? id : null,
                    question,
                    answer,
                }))
            );

            const loadedQuestions = Array.isArray(savedQuestions) && savedQuestions.length
                ? savedQuestions
                : fallbackQuickQuestions;

            setQuickQuestions(loadedQuestions);
            setDraftQuestions(loadedQuestions);
            setOpenDraftQuestionId(loadedQuestions[0]?.id || null);
            setIsEditingQuestions(false);
            setQuestionsMessage("שאלות הצ'אט נשמרו בהצלחה.");
        } catch {
            setQuestionsMessage("שמירת שאלות הצ'אט נכשלה. בדקי הרשאות וחיבור לשרת.");
        } finally {
            setQuestionsSaving(false);
        }
    };

    const handleSelectQuestion = (item) => {
        setShowContactForm(false);
        setIsConfirmingSend(false);
        setStatusMessage("");
        closeChoiceFields();

        setConversation((prev) => [
            ...prev,
            {
                sender: "user",
                text: item.question
            },
            {
                sender: "bot",
                text: item.answer
            }
        ]);

        scrollToBottom();
    };

    const handleOpenContactForm = () => {
        setShowContactForm(true);
        setIsConfirmingSend(false);
        setStatusMessage("");
        closeChoiceFields();

        setConversation((prev) => [
            ...prev,
            {
                sender: "user",
                text: "לא מצאתי תשובה מתאימה"
            },
            {
                sender: "bot",
                text: "אין בעיה. יש למלא את פרטי הפנייה בצורה מסודרת, ולאחר מכן יוצג אישור סופי לפני השליחה לצוות הניהול."
            }
        ]);

        scrollToForm();
    };

    const handleConfirmMessage = () => {
        closeChoiceFields();

        if (!inquiryGoal.trim() || !inquiryDetails.trim()) {
            setStatusMessage("כדי לשלוח פנייה לצוות הניהול, יש למלא את מטרת הפנייה ואת פרטי הפנייה.");
            scrollToForm();
            return;
        }

        setIsConfirmingSend(true);
        setStatusMessage("");
        scrollToForm();
    };

    const handleEditMessage = () => {
        setIsConfirmingSend(false);
        setStatusMessage("");
        closeChoiceFields();
        scrollToForm();
    };

    const resetContactForm = () => {
        setAdminMessage("");
        setInquirySubject(inquirySubjects[0]);
        setInquiryType(inquiryTypes[0]);
        setInquiryGoal("");
        setInquiryDetails("");
        closeChoiceFields();
    };

    const handleCancelMessage = () => {
        setShowContactForm(false);
        setIsConfirmingSend(false);
        resetContactForm();
        setStatusMessage("");
        scrollToBottom();
    };

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const formatEmailText = (value) => {
        return escapeHtml(value || "לא נמסר")
            .replace(/\r\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/\n/g, "<br />");
    };

    const buildPlainChatSummary = () => {
        return [
            `נושא הפנייה: ${inquirySubject}`,
            `סוג הפנייה: ${inquiryType}`,
            `פרויקט: ${getProjectLabel()}`,
            `מזהה פרויקט: ${getProjectId() || "לא צוין"}`,
            "",
            "מטרת הפנייה:",
            inquiryGoal.trim(),
            "",
            "פרטי הפנייה:",
            inquiryDetails.trim(),
            "",
            adminMessage.trim() ? "מידע נוסף:" : "",
            adminMessage.trim()
        ].filter(Boolean).join("\n");
    };

    const buildFormattedMessage = () => {
        const safeSubject = escapeHtml(inquirySubject);
        const safeType = escapeHtml(inquiryType);
        const safeProjectLabel = escapeHtml(getProjectLabel());
        const safeProjectId = escapeHtml(getProjectId() || "לא צוין");
        const safeGoal = formatEmailText(inquiryGoal.trim());
        const safeDetails = formatEmailText(inquiryDetails.trim());
        const safeAdditionalInfo = formatEmailText(adminMessage.trim() || "לא נמסר מידע נוסף");

        return `
<!doctype html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8" />
</head>
<body dir="rtl" style="direction: rtl; text-align: right; margin: 0; padding: 0; background-color: #f6f8fa; font-family: Arial, sans-serif; color: #1f2937;">
    <div dir="rtl" style="direction: rtl; text-align: right; max-width: 640px; margin: 0 auto; padding: 12px;">
        <div dir="rtl" style="direction: rtl; text-align: right; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
            <div dir="rtl" style="direction: rtl; text-align: right; padding: 12px 16px; background-color: #2f4f68; color: #ffffff;">
                <h2 dir="rtl" style="direction: rtl; text-align: right; margin: 0; font-size: 18px; font-weight: 700;">פנייה חדשה מצ׳אט התמיכה</h2>
                <p dir="rtl" style="direction: rtl; text-align: right; margin: 3px 0 0; font-size: 13px; line-height: 1.35;">התקבלה פנייה חדשה דרך מר בקר במערכת Calibrate</p>
            </div>

            <div dir="rtl" style="direction: rtl; text-align: right; padding: 12px 16px;">
                <table dir="rtl" style="direction: rtl; text-align: right; width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 10px;">
                    <tr>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; font-weight: 700; width: 115px; color: #374151;">נושא:</td>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; color: #111827;">${safeSubject}</td>
                    </tr>
                    <tr>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; font-weight: 700; color: #374151;">סוג:</td>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; color: #111827;">${safeType}</td>
                    </tr>
                    <tr>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; font-weight: 700; color: #374151;">פרויקט:</td>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; color: #111827;">${safeProjectLabel}</td>
                    </tr>
                    <tr>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; font-weight: 700; color: #374151;">מזהה:</td>
                        <td dir="rtl" style="direction: rtl; text-align: right; padding: 3px 0; color: #111827;">${safeProjectId}</td>
                    </tr>
                </table>

                <div dir="rtl" style="direction: rtl; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                    <div dir="rtl" style="direction: rtl; text-align: right; margin-bottom: 8px;">
                        <div dir="rtl" style="direction: rtl; text-align: right; font-size: 14px; font-weight: 700; color: #2f4f68; margin-bottom: 2px;">מטרת הפנייה</div>
                        <div dir="rtl" style="direction: rtl; text-align: right; font-size: 14px; line-height: 1.45; color: #111827;">${safeGoal}</div>
                    </div>

                    <div dir="rtl" style="direction: rtl; text-align: right; margin-bottom: 8px;">
                        <div dir="rtl" style="direction: rtl; text-align: right; font-size: 14px; font-weight: 700; color: #2f4f68; margin-bottom: 2px;">פרטי הפנייה</div>
                        <div dir="rtl" style="direction: rtl; text-align: right; font-size: 14px; line-height: 1.45; color: #111827;">${safeDetails}</div>
                    </div>

                    <div dir="rtl" style="direction: rtl; text-align: right;">
                        <div dir="rtl" style="direction: rtl; text-align: right; font-size: 14px; font-weight: 700; color: #2f4f68; margin-bottom: 2px;">מידע נוסף</div>
                        <div dir="rtl" style="direction: rtl; text-align: right; font-size: 14px; line-height: 1.45; color: #111827;">${safeAdditionalInfo}</div>
                    </div>
                </div>
            </div>

            <div dir="rtl" style="direction: rtl; text-align: right; padding: 8px 16px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                נשלח מתוך צ׳אט התמיכה במערכת Calibrate
            </div>
        </div>
    </div>
</body>
</html>
`.trim();
    };

    const handleSendToAdmin = async () => {
        closeChoiceFields();

        if (!inquiryGoal.trim() || !inquiryDetails.trim()) {
            setStatusMessage("כדי לשלוח פנייה לצוות הניהול, יש למלא את מטרת הפנייה ואת פרטי הפנייה.");
            setIsConfirmingSend(false);
            scrollToForm();
            return;
        }

        setIsSendingToAdmin(true);
        setStatusMessage("");

        const formattedMessage = buildFormattedMessage();
        const chatSummary = buildPlainChatSummary();

        try {
            await sendAdminMessage(formattedMessage, getProjectId());

            setConversation((prev) => [
                ...prev,
                {
                    sender: "user",
                    text: chatSummary
                },
                {
                    sender: "bot",
                    text: "הפנייה נשלחה בהצלחה לצוות הניהול. הפרטים הועברו בצורה מסודרת ויטופלו בהקדם."
                }
            ]);

            resetContactForm();
            setShowContactForm(false);
            setIsConfirmingSend(false);
            scrollToBottom();
        } catch (error) {
            const errorMessage =
                error?.data?.detail ||
                error?.data?.error ||
                error?.message ||
                "לא ניתן לשלוח את הפנייה כרגע. כדאי לנסות שוב מאוחר יותר.";

            setStatusMessage(errorMessage);
            scrollToForm();
        } finally {
            setIsSendingToAdmin(false);
        }
    };

    const buildConfirmPreview = () => {
        return [
            "מטרת הפנייה:",
            inquiryGoal,
            "",
            "פרטי הפנייה:",
            inquiryDetails,
            "",
            adminMessage.trim() ? "מידע נוסף:" : "",
            adminMessage
        ].filter(Boolean).join("\n");
    };

    return (
        <div
            className={`chatbot-widget ${
                isInline ? "chatbot-widget-inline" : "chatbot-widget-floating"
            }`}
            dir="rtl"
        >
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-title">
                            <div className="chatbot-avatar">
                                <Headset size={21} />
                            </div>

                            <div>
                                <h3>מר בקר</h3>
                                <span>עוזר התמיכה בפרויקט</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="chatbot-close-btn"
                            onClick={closeChat}
                            aria-label="סגירת מר בקר"
                        >
                            <X size={17} />
                        </button>
                    </div>

                    <div className="chatbot-intro">
                        <Sparkles size={16} />
                        <span>
                            אפשר לבחור שאלה נפוצה או לשלוח פנייה מסודרת לצוות הניהול.
                        </span>
                    </div>

                    <div
                        className={
                            isEditingQuestions
                                ? "chatbot-layout editing-questions"
                                : "chatbot-layout"
                        }
                    >
                        <aside
                            className={
                                isEditingQuestions
                                    ? "chatbot-faq-panel editing"
                                    : "chatbot-faq-panel"
                            }
                        >
                            <div className="chatbot-section-title">
                                <HelpCircle size={16} />
                                <span>שאלות נפוצות</span>
                            </div>

                            {isAdmin && !isEditingQuestions && (
                                <div className="chatbot-admin-toolbar">
                                    <div>
                                        <strong>תצוגה מקדימה</strong>
                                        <span>השאלות מוצגות כפי שהמשתמשים רואים אותן.</span>
                                    </div>

                                    <button
                                        type="button"
                                        className="chatbot-admin-action"
                                        onClick={() => {
                                            setOpenDraftQuestionId(draftQuestions[0]?.id || null);
                                            setIsEditingQuestions(true);
                                        }}
                                        disabled={questionsLoading || isSendingToAdmin}
                                    >
                                        עריכה
                                    </button>
                                </div>
                            )}

                            {isAdmin && isEditingQuestions && (
                                <div className="chatbot-admin-toolbar chatbot-admin-toolbar-edit">
                                    <div>
                                        <strong>מצב עריכה למנהל</strong>
                                        <span>אפשר לעדכן שאלות קיימות או להוסיף שאלה חדשה.</span>
                                    </div>

                                    <div className="chatbot-admin-actions">
                                        <button
                                            type="button"
                                            className="chatbot-admin-action secondary"
                                            onClick={addDraftQuestion}
                                            disabled={questionsSaving}
                                        >
                                            <Plus size={14} />
                                            הוספה
                                        </button>

                                        <button
                                            type="button"
                                            className="chatbot-admin-action secondary"
                                            onClick={cancelQuestionEditing}
                                            disabled={questionsSaving}
                                        >
                                            <RotateCcw size={14} />
                                            ביטול
                                        </button>

                                        <button
                                            type="button"
                                            className="chatbot-admin-action"
                                            onClick={saveQuickQuestions}
                                            disabled={!hasQuestionChanges || questionsSaving}
                                        >
                                            {questionsSaving ? (
                                                <LoaderCircle size={14} className="spin-icon" />
                                            ) : (
                                                <Save size={14} />
                                            )}
                                            שמירה
                                        </button>
                                    </div>
                                </div>
                            )}

                            {questionsLoading && (
                                <div className="chatbot-admin-message">
                                    <LoaderCircle size={14} className="spin-icon" />
                                    טוען שאלות...
                                </div>
                            )}

                            {questionsMessage && (
                                <div className="chatbot-admin-message">
                                    {questionsMessage}
                                </div>
                            )}

                            {isAdmin && isEditingQuestions ? (
                                <div className="chatbot-question-editor-list">
                                    {draftQuestions.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={
                                                openDraftQuestionId === item.id
                                                    ? "chatbot-question-editor-card open"
                                                    : "chatbot-question-editor-card"
                                            }
                                        >
                                            <button
                                                type="button"
                                                className="chatbot-question-editor-header"
                                                onClick={() => setOpenDraftQuestionId(item.id)}
                                                disabled={questionsSaving}
                                            >
                                                <span>שאלה {index + 1}</span>
                                                <strong>
                                                    {item.question.trim() || "שאלה חדשה"}
                                                </strong>
                                            </button>

                                            {openDraftQuestionId === item.id && (
                                                <div className="chatbot-question-editor-fields">
                                                    <label>
                                                        שאלה
                                                        <input
                                                            value={item.question}
                                                            onChange={(event) =>
                                                                updateDraftQuestion(
                                                                    item.id,
                                                                    "question",
                                                                    event.target.value
                                                                )
                                                            }
                                                            disabled={questionsSaving}
                                                        />
                                                    </label>

                                                    <label>
                                                        תשובה
                                                        <textarea
                                                            value={item.answer}
                                                            rows="3"
                                                            onChange={(event) =>
                                                                updateDraftQuestion(
                                                                    item.id,
                                                                    "answer",
                                                                    event.target.value
                                                                )
                                                            }
                                                            disabled={questionsSaving}
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        className="chatbot-admin-action secondary"
                                                        onClick={() => deleteDraftQuestion(item.id)}
                                                        disabled={questionsSaving}
                                                    >
                                                        <Trash2 size={14} />
                                                        מחיקה
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="chatbot-question-list">
                                    {quickQuestions.map((item) => (
                                        <button
                                            type="button"
                                            key={item.id}
                                            className="chatbot-question-card"
                                            onClick={() => handleSelectQuestion(item)}
                                            disabled={isSendingToAdmin || questionsLoading}
                                        >
                                            {item.question}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                className="chatbot-secondary-btn"
                                onClick={handleOpenContactForm}
                                disabled={isSendingToAdmin}
                            >
                                <Mail size={16} />
                                <span>שליחת פנייה לצוות הניהול</span>
                            </button>
                        </aside>

                        <main className="chatbot-chat-panel">
                            <div className="chatbot-messages">
                                {conversation.map((item, index) => (
                                    <div
                                        key={`${item.sender}-${index}`}
                                        className={`chatbot-message-row ${
                                            item.sender === "bot"
                                                ? "bot-message-row"
                                                : "user-message-row"
                                        }`}
                                    >
                                        <div className="chatbot-message-icon">
                                            {item.sender === "bot" ? (
                                                <Headset size={15} />
                                            ) : (
                                                <UserRound size={15} />
                                            )}
                                        </div>

                                        <div
                                            className={`chatbot-message ${
                                                item.sender === "bot"
                                                    ? "bot-message"
                                                    : "user-message"
                                            }`}
                                        >
                                            {item.text}
                                        </div>
                                    </div>
                                ))}

                                {showContactForm && !isConfirmingSend && (
                                    <div
                                        ref={contactFormRef}
                                        className="chatbot-contact-form"
                                    >
                                        <div className="chatbot-form-header">
                                            <Mail size={17} />
                                            <div>
                                                <strong>שליחת פנייה לצוות הניהול</strong>
                                                <span>
                                                    יש למלא את הפרטים המרכזיים כדי לאפשר טיפול מדויק ומהיר בפנייה.
                                                </span>
                                            </div>
                                        </div>

                                        <label className="chatbot-field-label">
                                            נושא הפנייה
                                        </label>

                                        <InlineChoiceField
                                            id="subject"
                                            value={inquirySubject}
                                            options={inquirySubjects}
                                            onChange={setInquirySubject}
                                            disabled={isSendingToAdmin}
                                            openChoiceField={openChoiceField}
                                            setOpenChoiceField={setOpenChoiceField}
                                            scrollToForm={scrollToForm}
                                        />

                                        <label className="chatbot-field-label">
                                            סוג הפנייה
                                        </label>

                                        <InlineChoiceField
                                            id="type"
                                            value={inquiryType}
                                            options={inquiryTypes}
                                            onChange={setInquiryType}
                                            disabled={isSendingToAdmin}
                                            openChoiceField={openChoiceField}
                                            setOpenChoiceField={setOpenChoiceField}
                                            scrollToForm={scrollToForm}
                                        />

                                        <label className="chatbot-field-label">
                                            מה מטרת הפנייה?
                                        </label>

                                        <textarea
                                            value={inquiryGoal}
                                            onChange={(event) => setInquiryGoal(event.target.value)}
                                            placeholder="לדוגמה: תיאום פגישה, בירור סטטוס, קבלת עזרה בנושא מסוים או שאלה לגבי התהליך."
                                            className="chatbot-textarea"
                                            disabled={isSendingToAdmin}
                                        />

                                        <label className="chatbot-field-label">
                                            פרטי הפנייה
                                        </label>

                                        <textarea
                                            value={inquiryDetails}
                                            onChange={(event) => setInquiryDetails(event.target.value)}
                                            placeholder="כאן כדאי לכתוב את הפרטים החשובים לטיפול בפנייה."
                                            className="chatbot-textarea"
                                            disabled={isSendingToAdmin}
                                        />

                                        <label className="chatbot-field-label">
                                            מידע נוסף, אם יש
                                        </label>

                                        <textarea
                                            value={adminMessage}
                                            onChange={(event) => setAdminMessage(event.target.value)}
                                            placeholder="לדוגמה: שעות נוחות לחזרה, מספר טלפון, הודעת שגיאה או הערה נוספת."
                                            className="chatbot-textarea"
                                            disabled={isSendingToAdmin}
                                        />

                                        <div className="chatbot-form-actions">
                                            <button
                                                type="button"
                                                className="chatbot-outline-btn"
                                                onClick={handleCancelMessage}
                                                disabled={isSendingToAdmin}
                                            >
                                                ביטול
                                            </button>

                                            <button
                                                type="button"
                                                className="chatbot-primary-btn"
                                                onClick={handleConfirmMessage}
                                                disabled={isSendingToAdmin}
                                            >
                                                המשך לאישור
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {showContactForm && isConfirmingSend && (
                                    <div
                                        ref={contactFormRef}
                                        className="chatbot-confirm-box"
                                    >
                                        <div className="chatbot-form-header">
                                            <CheckCircle size={17} />
                                            <div>
                                                <strong>אישור לפני שליחה</strong>
                                                <span>
                                                    אלו הפרטים שיישלחו לצוות הניהול. ניתן לשלוח או לחזור לעריכה.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="chatbot-confirm-details">
                                            <div>
                                                <span>נושא הפנייה</span>
                                                <strong>{inquirySubject}</strong>
                                            </div>

                                            <div>
                                                <span>סוג הפנייה</span>
                                                <strong>{inquiryType}</strong>
                                            </div>

                                            <div>
                                                <span>פרויקט</span>
                                                <strong>{getProjectLabel()}</strong>
                                            </div>

                                            <div>
                                                <span>מזהה פרויקט</span>
                                                <strong>{getProjectId() || "לא צוין"}</strong>
                                            </div>
                                        </div>

                                        <div className="chatbot-message-preview">
                                            {buildConfirmPreview()}
                                        </div>

                                        <div className="chatbot-form-actions">
                                            <button
                                                type="button"
                                                className="chatbot-outline-btn"
                                                onClick={handleEditMessage}
                                                disabled={isSendingToAdmin}
                                            >
                                                חזרה לעריכה
                                            </button>

                                            <button
                                                type="button"
                                                className="chatbot-primary-btn"
                                                onClick={handleSendToAdmin}
                                                disabled={isSendingToAdmin}
                                            >
                                                <Send size={15} />
                                                <span>{isSendingToAdmin ? "שולח..." : "אישור ושליחה"}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {statusMessage && (
                                    <div className="chatbot-status-message">
                                        {statusMessage}
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </main>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    type="button"
                    className={
                        isInline
                            ? "chatbot-inline-trigger"
                            : "chatbot-floating-btn"
                    }
                    onClick={openChat}
                    aria-label="פתיחת מר בקר"
                >
                    <span
                        className={
                            isInline
                                ? "chatbot-inline-avatar"
                                : "chatbot-floating-icon"
                        }
                    >
                        <Headset size={isInline ? 38 : 22} />
                    </span>

                    {isInline ? (
                        <span className="chatbot-inline-label">
                            מר בקר
                        </span>
                    ) : (
                        <span className="chatbot-floating-text">
                            <strong>מר בקר</strong>
                            <small>סיוע בפרויקט</small>
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}

export default ChatbotWidget;
