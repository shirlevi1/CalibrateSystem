import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { confirmPasswordReset } from "../../api/api.js";
import "./ResetPasswordPage.css";

const EyeOpenIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M2 12C3.5 9 7 5 12 5C17 5 20.5 9 22 12C20.5 15 17 19 12 19C7 19 3.5 15 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeClosedIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M3 3L21 21" />
        <path d="M10.7 5.1C11.1 5 11.5 5 12 5C17 5 20.5 9 22 12C21.4 13.2 20.5 14.5 19.4 15.5" />
        <path d="M16.1 16.1C14.9 16.7 13.5 17 12 17C7 17 3.5 13 2 12C2.7 10.5 4 8.8 5.7 7.6" />
        <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
    </svg>
);

const ResetPasswordPage = ({ onPasswordResetSuccess }) => {
    const navigate = useNavigate();
    const { uid, token } = useParams();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const getResetPasswordErrorMessage = (error) => {
        const serverError = error?.data?.error;
        const passwordErrors = error?.data?.password_errors;

        if (Array.isArray(passwordErrors) && passwordErrors.length > 0) {
            return passwordErrors.join(" ");
        }

        if (Array.isArray(serverError) && serverError.length > 0) {
            return serverError.join(" ");
        }

        if (typeof serverError === "string" && serverError.trim()) {
            return serverError;
        }

        if (typeof error?.message === "string" && error.message.trim()) {
            return error.message;
        }

        return "אירעה שגיאה בעדכון הסיסמה.";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setErrorMessage("");

        if (!uid || !token) {
            setErrorMessage("קישור האיפוס אינו תקין או חסר.");
            return;
        }

        if (!newPassword || !confirmPassword) {
            setErrorMessage("יש למלא את כל השדות.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage("הסיסמאות אינן תואמות.");
            return;
        }

        setLoading(true);

        try {
            await confirmPasswordReset({
                uid,
                token,
                newPassword,
                confirmPassword,
            });

            setMessage("הסיסמה עודכנה בהצלחה. ניתן להתחבר עם הסיסמה החדשה.");

            setTimeout(() => {
                onPasswordResetSuccess?.();
                navigate("/login");
            }, 1800);
        } catch (error) {
            setErrorMessage(getResetPasswordErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-password-page" dir="rtl">
            <div className="reset-password-card">
                <h2>בחירת סיסמה חדשה</h2>

                <p>
                    הזיני סיסמה חדשה ואשרי אותה כדי להשלים את איפוס הסיסמה.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="reset-password-input-wrapper">
                        <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="סיסמה חדשה"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />

                        <button
                            type="button"
                            className="reset-password-eye"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            aria-label={showNewPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                        >
                            {showNewPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                        </button>
                    </div>

                    <div className="reset-password-input-wrapper">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="אימות סיסמה"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <button
                            type="button"
                            className="reset-password-eye"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            aria-label={showConfirmPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                        >
                            {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="reset-password-submit-button"
                        disabled={loading}
                    >
                        {loading ? "מעדכן..." : "עדכון סיסמה"}
                    </button>
                </form>

                {message && <p className="success-message">{message}</p>}
                {errorMessage && <p className="error-message">{errorMessage}</p>}
            </div>
        </div>
    );
};

export default ResetPasswordPage;