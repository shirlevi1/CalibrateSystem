import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, IconButton } from "@mui/material";
import logo from "../assets/logo.png";
import { Check, Menu, ChevronDown } from "lucide-react";
import "./Header.css";

const Header = ({
                    toggleSidebar,
                    navigationDisabled = false,
                    selectedProject = null,
                    userProjects = [],
                    onProjectSelected = null,
                }) => {
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const containerRef = useRef(null);

    const projectName =
        selectedProject?.title ||
        selectedProject?.name ||
        selectedProject?.project_name ||
        "";

    const projectAddress =
        selectedProject?.address ||
        selectedProject?.project_address ||
        "";

    const projectDisplayName = [projectName, projectAddress]
        .filter(Boolean)
        .join(" - ");
    const projectTriggerLabel = projectName || "בחר פרויקט";

    const hasMultipleProjects = userProjects.length > 1;

    const getProjectId = (project) =>
        project?.id ||
        project?.project_id ||
        project?.monday_project_id ||
        project?.mondayProjectId;

    const getProjectName = (project) =>
        project?.title ||
        project?.name ||
        project?.project_name ||
        "פרויקט ללא שם";

    const getProjectAddress = (project) =>
        project?.address ||
        project?.project_address ||
        "";

    const selectedProjectId = String(getProjectId(selectedProject) || "");

    useEffect(() => {
        if (!dropdownOpen) {
            return;
        }

        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [dropdownOpen]);

    const handleProjectSwitch = (project) => {
        const projectId = getProjectId(project);

        if (!projectId) {
            return;
        }

        setDropdownOpen(false);

        if (onProjectSelected) {
            const normalizedProject = {
                ...project,
                id: String(projectId),
                project_id: String(projectId),
            };

            localStorage.setItem(
                "selectedProject",
                JSON.stringify(normalizedProject)
            );
            localStorage.setItem(
                "selectedProjectId",
                String(projectId)
            );

            const exponetId =
                project.exponet_id ||
                project.exponetID ||
                project.exponetId ||
                project.exponet_project_id;

            if (exponetId) {
                localStorage.setItem(
                    "selectedExponetProjectId",
                    String(exponetId)
                );
            } else {
                localStorage.removeItem("selectedExponetProjectId");
            }

            onProjectSelected(normalizedProject, userProjects);
            navigate("/home");
        }
    };

    return (
        <AppBar
            position="fixed"
            elevation={1}
            className="header"
        >
            <Toolbar className="header-toolbar">
                <Box
                    component="img"
                    src={logo}
                    alt="logo"
                    className="header-logo"
                />

                {hasMultipleProjects ? (
                    <div className="project-selector" ref={containerRef}>
                        <button
                            type="button"
                            className="project-selector-trigger"
                            onClick={() => setDropdownOpen((prev) => !prev)}
                            aria-haspopup="listbox"
                            aria-expanded={dropdownOpen}
                            title={projectTriggerLabel}
                        >
                            <span className="project-selector-label">
                                {projectTriggerLabel}
                            </span>
                            <ChevronDown
                                size={16}
                                className={`project-selector-chevron ${dropdownOpen ? "open" : ""}`}
                            />
                        </button>

                        {dropdownOpen && (
                            <div className="project-dropdown" role="listbox">
                                {userProjects.map((project) => {
                                    const projectId = getProjectId(project);
                                    const isSelected =
                                        String(projectId || "") === selectedProjectId;

                                    return (
                                        <button
                                            key={projectId || getProjectName(project)}
                                            type="button"
                                            className={`project-dropdown-item ${isSelected ? "active" : ""}`}
                                            onClick={() => handleProjectSwitch(project)}
                                            role="option"
                                            aria-selected={isSelected}
                                        >
                                            <div className="project-dropdown-item-content">
                                                <span className="project-dropdown-name">
                                                    {getProjectName(project)}
                                                </span>
                                                {getProjectAddress(project) && (
                                                    <span className="project-dropdown-address">
                                                        {getProjectAddress(project)}
                                                    </span>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <span className="project-dropdown-check">
                                                    <Check size={16} />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <Typography
                        component="h1"
                        className="header-title"
                        title={projectDisplayName}
                    >
                        {projectDisplayName}
                    </Typography>
                )}

                <IconButton
                    onClick={toggleSidebar}
                    disabled={navigationDisabled}
                    className="header-menu-button"
                    aria-label="פתיחת תפריט"
                >
                    <Menu />
                </IconButton>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
