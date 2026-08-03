import React from "react";
import "./LoadingSpinner.css";

export default function LoadingSpinner({
                                           text = "טוען נתונים...",
                                           fullPage = false,
                                           compact = false,
                                       }) {
    return (
        <div
            className={[
                "loading-spinner-wrapper",
                fullPage ? "full-page" : "",
                compact ? "compact" : "",
            ].join(" ")}
            dir="rtl"
        >
            <div className="loading-spinner" />
            {text && <span className="loading-spinner-text">{text}</span>}
        </div>
    );
}