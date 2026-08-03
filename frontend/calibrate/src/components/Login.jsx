import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "./Login.css";
import { loginUser } from "../../api/api.js";

const Login = ({ onLogin }) => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setLoading(true);

        try {
            const data = await loginUser(email, password);

            if (data?.password_change_required) {
                navigate(`/reset-password/${data.uid}/${data.token}`, {
                    replace: true,
                });
                return;
            }

            onLogin(data);
        } catch (error) {
            setErrorMessage("אימייל או סיסמה שגויים");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" dir="rtl">
            <div className="login-box">
                <img src={logo} alt="Logo" className="login-logo" />

                <h2 className="login-title">התחברות למערכת</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        dir="ltr"
                        style={{ textAlign: "left" }}
                    />

                    <div className="login-password-field">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            dir="ltr"
                            style={{ textAlign: "left" }}
                        />

                        <button
                            type="button"
                            className="login-password-eye"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <svg
                                    viewBox="0 0 24 24"
                                    width="17"
                                    height="17"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 3L21 21" />
                                    <path d="M10.7 5.1C11.1 5 11.5 5 12 5C17 5 20.5 9 22 12C21.4 13.2 20.5 14.5 19.4 15.5" />
                                    <path d="M16.1 16.1C14.9 16.7 13.5 17 12 17C7 17 3.5 13 2 12C2.7 10.5 4 8.8 5.7 7.6" />
                                    <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
                                </svg>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    width="17"
                                    height="17"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M2 12C3.5 9 7 5 12 5C17 5 20.5 9 22 12C20.5 15 17 19 12 19C7 19 3.5 15 2 12Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <button
                        type="button"
                        className="forgot-password-link"
                        onClick={() => navigate("/forgot-password")}
                    >
                        שכחתי סיסמה
                    </button>

                    <button
                        type="submit"
                        className="login-submit-button"
                        disabled={loading}
                    >
                        {loading ? "מתחבר..." : "התחבר"}
                    </button>

                    {errorMessage && (
                        <p className="error-message">{errorMessage}</p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Login;