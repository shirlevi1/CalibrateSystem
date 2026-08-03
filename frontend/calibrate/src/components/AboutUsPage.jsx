import React from "react";
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Clock,
    Navigation,
    ClipboardCheck,
    HardHat,
    Users
} from "lucide-react";

import "./AboutUsPage.css";

export default function AboutUsPage() {
    const activityItems = [
        {
            title: "ניהול פרויקטים",
            text: "ליווי ובקרה לאורך שלבי הפרויקט.",
            icon: ClipboardCheck,
            image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e"
        },
        {
            title: "בקרה הנדסית",
            text: "בדיקות מקצועיות בהתאם לתקנים ולדרישות.",
            icon: HardHat,
            image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd"
        },
        {
            title: "ליווי יזמים",
            text: "שירות מקצועי, ברור ושקוף ליזמים.",
            icon: Users,
            image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab"
        }
    ];

    return (
        <main dir="rtl" className="about-page">
            <section className="about-container">

                <section className="about-hero">
                    <div className="about-hero-content">
                        <div className="about-label">
                            <Building2 size={18} />
                            <span>מאנגה - בקרת איכות בבנייה</span>
                        </div>

                        <h1>איך למצוא אותנו</h1>

                        <p>
                            כאן תוכלו למצוא מידע על החברה, תחומי הפעילות ודרכי יצירת קשר.
                            אנו מלווים יזמים ופרויקטים בתהליכי בקרה מקצועיים, ברורים ושקופים.
                        </p>
                    </div>

                    <div className="contact-card">
                        <h2>פרטי התקשרות</h2>

                        <div className="contact-list">
                            <div className="contact-row">
                                <span className="contact-icon">
                                    <MapPin size={18} />
                                </span>
                                <div>
                                    <strong>כתובת</strong>
                                    <span>בית בלורי, החרושת 18 (קומה 1) רמת השרון
                                    </span>
                                </div>
                            </div>

                            <div className="contact-row">
                                <span className="contact-icon">
                                    <Phone size={18} />
                                </span>
                                <div>
                                    <strong>טלפון</strong>
                                    <span>072-3975045
                                        </span>
                                </div>
                            </div>

                            <div className="contact-row">
                                <span className="contact-icon">
                                    <Mail size={18} />
                                </span>
                                <div>
                                    <strong>אימייל</strong>
                                    <span>office@calibrate-bakara.co.il</span>
                                </div>
                            </div>

                            <div className="contact-row">
                                <span className="contact-icon">
                                    <Clock size={18} />
                                </span>
                                <div>
                                    <strong>שעות פעילות</strong>
                                    <span>ראשון-חמישי, 09:00-17:00</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                <section className="info-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">אודות החברה</span>
                            <h2>קצת עלינו</h2>
                        </div>

                        <span className="meta-text">עודכן לאחרונה: אפריל 2026</span>
                    </div>

                    <div className="about-text">
                        <p>
                            אנו מתמחים במתן שירותי בקרה מתקדמים לענף הבנייה,
                            תוך שימוש בטכנולוגיות חדשניות וצוות מומחים מהשורה הראשונה.
                            המטרה שלנו היא להעניק ליזמים שקט נפשי וביטחון מלא לאורך כל שלבי הפרויקט.
                        </p>

                        <p>
                            החברה הוקמה מתוך צורך אמיתי בשטח לפתרונות בקרה יעילים,
                            שקופים ומקצועיים, שמאפשרים לנהל תהליכים בצורה מסודרת וברורה יותר.
                        </p>
                    </div>
                </section>

                <section className="activity-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">תחומי פעילות</span>
                            <h2>פעילות החברה</h2>
                        </div>

                        <p>תחומי השירות המרכזיים שאנו מספקים ללקוחות וליזמים.</p>
                    </div>

                    <div className="activity-grid">
                        {activityItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <article className="activity-item" key={item.title}>
                                    <div className="activity-image-wrapper">
                                        <img src={item.image} alt={item.title} />
                                    </div>

                                    <div className="activity-content">
                                        <div className="activity-icon">
                                            <Icon size={20} />
                                        </div>

                                        <div>
                                            <h3>{item.title}</h3>
                                            <p>{item.text}</p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </section>
        </main>
    );
}
