import React from "react";
import { ShieldAlert, RefreshCcw, ArrowRight, Home } from "lucide-react";
import "./ErrorStateCard.css";

const ERROR_CONTENT = {
    generic: {
        title: "שגיאת שירות פנימית",
        message:
            "אירעה תקלה בעיבוד הבקשה. אין צורך בפעולה נוספת מצדך כרגע. ניתן לנסות שוב מאוחר יותר.",
        primaryLabel: "רענן את הדף",
        secondaryLabel: "סגור",
    },

    actionable: {
        title: "לא ניתן להשלים את הפעולה",
        message:
            "נראה שחסר מידע או שקיימת בעיית תקשורת זמנית. מומלץ לרענן את הדף, לבדוק את הנתונים שהוזנו ולנסות שוב.",
        primaryLabel: "נסה שוב",
        secondaryLabel: "חזרה",
    },

    notFound: {
        title: "העמוד לא נמצא",
        message:
            "ייתכן שהקישור שגוי, שהעמוד הוסר, או שאינו זמין עוד.",
        primaryLabel: "חזרה לדף הבית",
        secondaryLabel: "חזרה אחורה",
    },

    forbidden: {
        title: "אין גישה לתוכן",
        message:
            "ייתכן שאין לך הרשאה לצפות בפריט זה או שהגישה אליו הוגבלה.",
        primaryLabel: "חזרה למסך הקודם",
        secondaryLabel: "סגור",
    },
};

const ErrorStateCard = ({
                            variant = "generic",
                            onPrimaryAction,
                            onSecondaryAction,
                        }) => {
    const content = ERROR_CONTENT[variant] || ERROR_CONTENT.generic;

    return (
        <div className="error-state-wrapper" dir="rtl">
            <div className="error-state-card" role="alert">
                <div className="error-state-header">
                    <div className="error-state-icon-box">
                        <ShieldAlert size={28} strokeWidth={1.5} />
                    </div>

                    <h1 className="error-state-title">{content.title}</h1>

                    <p className="error-state-message">
                        {content.message}
                    </p>
                </div>

                <div className="error-state-actions">
                    <button
                        type="button"
                        className="error-state-button error-state-button-primary"
                        onClick={onPrimaryAction}
                    >
                        {variant === "notFound" ? (
                            <Home size={16} strokeWidth={1.5} />
                        ) : (
                            <RefreshCcw size={16} strokeWidth={1.5} />
                        )}
                        <span>{content.primaryLabel}</span>
                    </button>

                    <button
                        type="button"
                        className="error-state-button error-state-button-secondary"
                        onClick={onSecondaryAction}
                    >
                        <ArrowRight size={16} strokeWidth={1.5} />
                        <span>{content.secondaryLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorStateCard;