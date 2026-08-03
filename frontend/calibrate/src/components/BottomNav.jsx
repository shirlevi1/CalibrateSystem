import { useNavigate } from "react-router-dom";
import { Home, Accessibility } from "lucide-react";
import "./BottomNav.css";

export default function BottomNav({
                                      navigationDisabled = false,
                                      accessibilityEnabled = false,
                                      onToggleAccessibility,
                                  }) {
    const navigate = useNavigate();

    const handleHomeClick = () => {
        if (navigationDisabled) {
            return;
        }

        navigate("/home");
    };

    const handleAccessibilityClick = () => {
        if (navigationDisabled) {
            return;
        }

        if (onToggleAccessibility) {
            onToggleAccessibility();
        }
    };

    return (
        <div className="bottom-nav">
            <button
                type="button"
                className={`nav-item nav-button bottom-nav-home ${
                    navigationDisabled ? "nav-item-disabled" : ""
                }`}
                onClick={handleHomeClick}
                disabled={navigationDisabled}
                aria-label="מעבר לדף הבית"
            >
                <Home size={24} />
                <span>Home</span>
            </button>

            <button
                type="button"
                className={`nav-item nav-button accessibility-nav-item ${
                    accessibilityEnabled ? "accessibility-active" : ""
                } ${navigationDisabled ? "nav-item-disabled" : ""}`}
                onClick={handleAccessibilityClick}
                disabled={navigationDisabled}
                aria-pressed={accessibilityEnabled}
                aria-label={
                    accessibilityEnabled
                        ? "כיבוי מצב נגישות"
                        : "הפעלת מצב נגישות"
                }
            >
                <Accessibility size={24} />
                <span>{accessibilityEnabled ? "נגיש פעיל" : "נגישות"}</span>
            </button>
        </div>
    );
}