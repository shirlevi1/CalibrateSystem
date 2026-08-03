import React from "react";
import "./ContactPage.css";
import {
    MapPin,
    Phone,
    Mail,
    Train,
    Clock,
    Car,
    Copy,
    Navigation,
} from "lucide-react";
import { CONTACT_INFO } from "./ContactInfo.js";

export default function ContactPage() {
    const {
        ADDRESS,
        PHONE,
        EMAIL,
        WORKING_HOURS,
        PARKING_INFO,
        TRAIN_STATION,
    } = CONTACT_INFO;

    const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
        ADDRESS
    )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("המספר הועתק!");
        } catch {
            alert("לא ניתן היה להעתיק את המספר");
        }
    };

    const contactCards = [
        {
            label: "כתובת",
            value: ADDRESS,
            icon: <MapPin size={18} strokeWidth={1.6} />,
            action: (
                <a
                    href={`https://www.waze.com/ul?q=${encodeURIComponent(
                        ADDRESS
                    )}&navigate=yes`}
                    target="_blank"
                    rel="noreferrer"
                    className="compact-action-btn primary-action"
                >
                    <Navigation size={13} />
                    ניווט Waze
                </a>
            ),
        },
        {
            label: "טלפון משרד",
            value: PHONE,
            icon: <Phone size={18} strokeWidth={1.6} />,
            action: (
                <button
                    onClick={() => copyToClipboard(PHONE)}
                    className="compact-action-btn"
                    type="button"
                >
                    <Copy size={13} />
                    העתק מספר
                </button>
            ),
        },
        {
            label: "דואר אלקטרוני",
            value: EMAIL,
            icon: <Mail size={18} strokeWidth={1.6} />,
            isEmail: true,
        },
        {
            label: "הגעה ברכבת",
            value: TRAIN_STATION,
            icon: <Train size={18} strokeWidth={1.6} />,
        },
        {
            label: "שעות פעילות",
            value: WORKING_HOURS,
            icon: <Clock size={18} strokeWidth={1.6} />,
        },
        {
            label: "חניה זמינה",
            value: PARKING_INFO,
            icon: <Car size={18} strokeWidth={1.6} />,
        },
    ];

    return (
        <main dir="rtl" className="contact-page">
            <section className="contact-layout">
                <section className="contact-map-card">
                    <iframe
                        title="מפת הגעה"
                        src={mapUrl}
                        className="map-iframe"
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </section>

                <section className="contact-content-card">
                    <header className="info-header">
                        <div className="header-icon">
                            <MapPin size={22} strokeWidth={1.6} />
                        </div>

                        <div>
                            <span className="section-label">איך למצוא אותנו</span>
                            <h1 className="main-title">משרדי המכון</h1>
                            <p className="sub-title">
                                מגדל עזריאלי שרונה, תל אביב. נגישות מלאה לרכב
                                ובתחבורה ציבורית.
                            </p>
                        </div>
                    </header>

                    <div className="cards-list">
                        {contactCards.map((card, index) => (
                            <article className="info-card-item" key={index}>
                                <div className="card-icon-box">
                                    {card.icon}
                                </div>

                                <div className="card-text">
                                    <span className="card-label">{card.label}</span>

                                    {card.isEmail ? (
                                        <a
                                            href={`mailto:${EMAIL}`}
                                            className="card-value email-link"
                                        >
                                            {card.value}
                                        </a>
                                    ) : (
                                        <p className="card-value">{card.value}</p>
                                    )}

                                    {card.action && (
                                        <div className="button-group">
                                            {card.action}
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </section>
        </main>
    );
}