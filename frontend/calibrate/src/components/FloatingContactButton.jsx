import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import "./FloatingContactButton.css";

const FloatingContactButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    if (location.pathname === "/contact") {
        return null;
    }

    return (
        <button
            className="floating-contact-button"
            onClick={() => navigate("/contact")}
        >
            <Mail size={20} strokeWidth={1.5} />
        </button>
    );
};

export default FloatingContactButton;