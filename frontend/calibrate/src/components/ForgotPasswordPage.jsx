import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../../api/api.js";
import "./ForgotPasswordPage.css";

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setErrorMessage("");
        setLoading(true);

        try {
            await requestPasswordReset(email);

            setMessage("אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.");
        } catch (error) {
            setErrorMessage("אירעה שגיאה בשליחת קישור האיפוס.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-page" dir="rtl">
            <div className="forgot-password-card">
                <h2>איפוס סיסמה</h2>

                <p>
                    הזיני את כתובת המייל שמוגדרת במערכת, ונשלח אלייך קישור לאיפוס הסיסמה.
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        dir="ltr"
                        style={{ textAlign: "left" }}
                        required
                    />

                    <button type="submit" disabled={loading}>
                        {loading ? "שולח..." : "שליחת קישור לאיפוס"}
                    </button>
                </form>

                {message && <p className="success-message">{message}</p>}
                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <button
                    type="button"
                    className="back-to-login-button"
                    onClick={() => navigate("/login")}
                >
                    חזרה להתחברות
                </button>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;