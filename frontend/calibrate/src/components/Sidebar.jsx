import React from "react";
import { useNavigate } from "react-router-dom";
import "./Navigation.css";
import {
    Home,
    Users,
    Folder,
    MapPin,
    User,
    Info,
    LogOut,
    X,
} from "lucide-react";

const Sidebar = ({ user, onLogout, isOpen, toggleSidebar, navigationDisabled = false }) => {
    const navigate = useNavigate();

    const handleNavigate = (path) => {
        if (navigationDisabled && path !== "/privacy-policy") {
            return;
        }

        navigate(path);
        toggleSidebar(false);
    };

    const roleText =
        user?.role === "entrepreneur"
            ? "יזם"
            : user?.role === "admin"
                ? "מנהל מערכת"
                : "";

    const menuItems = [
        { label: "דף הבית", icon: Home, path: "/home" },
        { label: "ניהול משתמשים", icon: Users, path: "/admin/users", roles: ["admin"] },
        { label: "רשימת פרויקטים", icon: Folder, path: "/projects" },
        { label: "איך מגיעים אלינו", icon: MapPin, path: "/arrival" },
        { label: "פרטי חשבון", icon: User, path: "/account" },
        { label: "אודותינו", icon: Info, path: "/about" },
    ];

    return (
        <>
            <div className={`sidebar ${isOpen ? "open" : ""}`}>
                <button
                    type="button"
                    className="close-btn"
                    onClick={() => toggleSidebar(false)}
                    aria-label="סגור תפריט"
                >
                    <X size={22} />
                </button>

                <div className="sidebar-user">
                    <div className="user-text">
                        <span className="user-role">{roleText}</span>
                        <span className="user-role-sub">{user?.name || ""}</span>
                    </div>
                </div>

                <ul className="sidebar-menu">
                    {menuItems
                        .filter((item) => !item.roles || item.roles.includes(user?.role))
                        .map((item, index) => {
                            const Icon = item.icon;

                            return (
                                <li
                                    key={index}
                                    onClick={() => handleNavigate(item.path)}
                                    className={navigationDisabled ? "nav-disabled" : ""}
                                >
                                    <Icon size={18} /> {item.label}
                                </li>
                            );
                        })}

                    <li className="logout-item" onClick={onLogout}>
                        <LogOut size={18} /> התנתק
                    </li>
                </ul>

                <div className="sidebar-footer">
                    <button
                        type="button"
                        className="privacy-footer-link"
                        onClick={() => handleNavigate("/privacy-policy")}
                    >
                        מדיניות פרטיות
                    </button>
                </div>
            </div>

            {isOpen && !navigationDisabled && (
                <div
                    className="overlay"
                    onClick={() => toggleSidebar(false)}
                />
            )}
        </>
    );
};

export default Sidebar;