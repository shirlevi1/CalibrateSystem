import React, { useState } from "react";
import { Mail, Phone, Clock, Headphones, Copy } from "lucide-react";
import { useTheme } from "@mui/material/styles";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { CONTACT_INFO } from "./ContactInfo.js";
import "./ContactCard.css";

const ContactCard = () => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    const handleEmailClick = () => {
        const email = CONTACT_INFO.EMAIL;
        const subject = CONTACT_INFO.EMAIL_DEFAULT_SUBJECT || "פנייה דרך האתר";
        const body = CONTACT_INFO.EMAIL_DEFAULT_BODY || "שלום,\n";

        if (!email) {
            alert("לא נמצאה כתובת אימייל");
            return;
        }

        const gmailUrl =
            "https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1" +
            `&to=${encodeURIComponent(email)}` +
            `&su=${encodeURIComponent(subject)}` +
            `&body=${encodeURIComponent(body)}`;

        const mailtoUrl =
            `mailto:${email}` +
            `?subject=${encodeURIComponent(subject)}` +
            `&body=${encodeURIComponent(body)}`;

        const openedWindow = window.open(gmailUrl, "_blank");

        if (!openedWindow) {
            window.location.href = mailtoUrl;
        }
    };

    const fallbackCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.right = "-9999px";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        let copied = false;

        try {
            copied = document.execCommand("copy");
        } catch (error) {
            copied = false;
        }

        document.body.removeChild(textArea);

        return copied;
    };

    const handleCopyPhone = async () => {
        const phoneNumber = CONTACT_INFO.PHONE;

        if (!phoneNumber) {
            alert("לא נמצא מספר טלפון להעתקה");
            return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(phoneNumber);
            } else {
                const copied = fallbackCopyText(phoneNumber);

                if (!copied) {
                    throw new Error("Fallback copy failed");
                }
            }

            setOpen(true);
        } catch (error) {
            console.error("Copy phone failed:", error);
            alert(`לא ניתן היה להעתיק אוטומטית. המספר הוא: ${phoneNumber}`);
        }
    };

    return (
        <main
            className="contact-card-page"
            dir="rtl"
            style={{ backgroundColor: theme.palette.background.default }}
        >
            <section
                className="contact-card"
                style={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <div className="contact-top-icon">
                    <Headphones size={26} strokeWidth={1.6} />
                </div>

                <div className="contact-header-content">
                    <span className="contact-label">יצירת קשר</span>

                    <h1 className="contact-title">אנחנו כאן בשבילך</h1>

                    <p className="contact-subtitle">
                        צוות המכון זמין לכל שאלה בימים א׳-ה׳
                        <br />
                        בין השעות 08:00-17:00
                    </p>
                </div>

                <div className="contact-hours">
                    <Clock size={16} strokeWidth={1.6} />
                    <span>מענה בימים א׳-ה׳ · 08:00-17:00</span>
                </div>

                <div className="contact-actions">
                    <button
                        className="contact-button email-button"
                        onClick={handleEmailClick}
                        type="button"
                    >
                        <Mail size={18} strokeWidth={1.5} />
                        <span>שלח אימייל</span>
                    </button>

                    <button
                        className="contact-button phone-button"
                        onClick={handleCopyPhone}
                        type="button"
                    >
                        <Copy size={18} strokeWidth={1.5} />
                        <span>העתק מספר טלפון</span>
                    </button>
                </div>

                <div className="contact-footer">
                    <div className="footer-item">
                        <Mail size={13} strokeWidth={1.6} />
                        <span>{CONTACT_INFO.EMAIL}</span>
                    </div>

                    <span className="footer-separator">|</span>

                    <div className="footer-item">
                        <Phone size={13} strokeWidth={1.6} />
                        <span>{CONTACT_INFO.PHONE}</span>
                    </div>
                </div>
            </section>

            <Snackbar
                open={open}
                autoHideDuration={2500}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                sx={{ mt: 2 }}
            >
                <MuiAlert
                    severity="success"
                    variant="filled"
                    onClose={() => setOpen(false)}
                    sx={{
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        fontWeight: 300,
                        borderRadius: "6px",
                        fontFamily: "Discovery, system-ui, sans-serif",
                    }}
                >
                    המספר הועתק
                </MuiAlert>
            </Snackbar>
        </main>
    );
};

export default ContactCard;