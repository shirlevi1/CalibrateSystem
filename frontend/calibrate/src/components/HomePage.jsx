import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import {
    FileText,
    Users,
    Bell,
    BookOpen,
    Activity,
    Calendar,
    FlaskConical,
    FileCheck,
    Lightbulb,
    CalendarDays,
} from "lucide-react";

import {
    Box,
    Typography,
    Paper,
} from "@mui/material";

import ProjectStepper from "./ProjectStepper";
import ChatbotWidget from "./ChatbotWidget";
import { getMaxAllowedStepIndex } from "./ProjectWorkflow.js";

import "./HomePage.css";

const HomePage = ({ currentStep, setCurrentStep, selectedProject }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const maxAllowedStepIndex = getMaxAllowedStepIndex(selectedProject);
    const activeStep = location.state?.workflowStep || currentStep;

    const handleStepClick = (step) => {
        setCurrentStep(step);
        navigate("/home", { replace: true, state: null });
    };

    const projectDisplayName =
        selectedProject?.title ||
        selectedProject?.name ||
        selectedProject?.project_name ||
        "";

    const today = new Date().toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const step1Cards = [
        {
            title: "מסמכי הפרויקט",
            icon: FileText,
            path: "/required-docs",
            color: theme.palette.primary.main,
        },
        {
            title: "צוות מלווה",
            icon: Users,
            path: "/team",
            color: theme.palette.primary.main,
        },
        {
            title: "מרכז התראות",
            icon: Bell,
            path: "/notifications",
            color: theme.palette.info.main,
        },
        {
            title: "מידע ומדריכים",
            icon: BookOpen,
            path: "/guide",
            color: theme.palette.primary.dark,
        },
        {
            title: "סטטוס פרויקט",
            icon: Activity,
            path: "/content-control",
            color: theme.palette.success.main,
        },
    ];

    const step3Cards = [
        {
            title: "תוכנית ביקורים",
            icon: Calendar,
            path: "/visits-plan",
            color: theme.palette.primary.main,
        },
        {
            title: "בדיקות מעבדה",
            icon: FlaskConical,
            path: "/lab-tests",
            color: theme.palette.info.main,
        },
        {
            title: "מסמכי תעודת גמר",
            icon: FileCheck,
            path: "/completion-docs",
            color: theme.palette.success.main,
        },
        {
            title: "מרכז התראות",
            icon: Bell,
            path: "/notifications",
            color: theme.palette.info.main,
        },
        {
            title: "מידע ומדריכים",
            icon: BookOpen,
            path: "/guide",
            color: theme.palette.primary.dark,
        },
        {
            title: "דגשים לעבודה",
            icon: Lightbulb,
            path: "/work-notes",
            color: theme.palette.primary.main,
        },
    ];

    const cards = activeStep === "execution" ? step3Cards : step1Cards;
    const hasFiveCards = cards.length === 5;

    return (
        <Box
            component="main"
            dir="rtl"
            sx={{
                maxWidth: 1200,
                margin: "0 auto",
                px: {
                    xs: 2,
                    sm: 3,
                },
                pb: 4,
                backgroundColor: "background.default",
                minHeight: "100vh",
                fontFamily: theme.typography.fontFamily,
            }}
        >
            <Box
                sx={{
                    mb: 2,
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: {
                        xs: 2.5,
                        sm: 3,
                    },
                    textAlign: "center",
                    boxShadow: "0px 6px 18px rgba(44, 51, 56, 0.06)",
                    transition: "0.2s ease",

                    "&:hover": {
                        borderColor: "primary.light",
                    },
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "40%",
                        height: "100%",
                        background:
                            "linear-gradient(90deg, transparent, rgba(74, 96, 118, 0.06))",
                        pointerEvents: "none",
                    }}
                />

                <Box
                    sx={{
                        position: "absolute",
                        top: -70,
                        left: -70,
                        width: 170,
                        height: 170,
                        borderRadius: "50%",
                        backgroundColor: "rgba(74, 96, 118, 0.08)",
                        pointerEvents: "none",
                    }}
                />

                <Typography
                    component="h1"
                    sx={{
                        fontSize: {
                            xs: 22,
                            sm: 28,
                        },
                        fontWeight: 700,
                        color: "text.primary",
                        mb: 0.75,
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    דשבורד הפרויקט הראשי שלי
                </Typography>

                {projectDisplayName && (
                    <Typography
                        component="p"
                        sx={{
                            fontSize: {
                                xs: 15,
                                sm: 17,
                            },
                            fontWeight: 600,
                            color: "primary.main",
                            mb: 1.5,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        {projectDisplayName}
                    </Typography>
                )}

                <Box
                    sx={{
                        position: "relative",
                        zIndex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 999,
                        backgroundColor: "background.default",
                        border: "1px solid",
                        borderColor: "divider",
                        color: "text.secondary",
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    <span>{today}</span>
                    <CalendarDays size={18} strokeWidth={1.8} />
                </Box>
            </Box>

            <Box
                className="home-chatbot-section"
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    mb: 3,
                }}
            >
                <ChatbotWidget
                    variant="inline"
                    selectedProject={selectedProject}
                />
            </Box>

            <Box
                sx={{
                    mb: 3,
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    boxShadow: "0px 4px 14px rgba(44, 51, 56, 0.04)",
                }}
            >
                <ProjectStepper
                    currentStep={activeStep}
                    maxAllowedStepIndex={maxAllowedStepIndex}
                    onStepClick={handleStepClick}
                />
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(2, 1fr)",
                        md: hasFiveCards ? "repeat(6, 1fr)" : "repeat(3, 1fr)",
                    },
                    gap: 2,
                    alignItems: "stretch",
                }}
            >
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    const centeredFiveCardPosition = hasFiveCards && index >= 3;

                    return (
                        <Paper
                            key={card.path}
                            component="button"
                            type="button"
                            onClick={() => navigate(card.path, {
                                state: { currentStep: activeStep },
                            })}
                            elevation={0}
                            sx={{
                                gridColumn: {
                                    xs:
                                        hasFiveCards && index === cards.length - 1
                                            ? "1 / -1"
                                            : "auto",
                                    md: centeredFiveCardPosition
                                        ? `${index === 3 ? 2 : 4} / span 2`
                                        : hasFiveCards
                                          ? "span 2"
                                          : "auto",
                                },
                                justifySelf: {
                                    xs:
                                        hasFiveCards && index === cards.length - 1
                                            ? "center"
                                            : "stretch",
                                    md: "stretch",
                                },
                                width: {
                                    xs:
                                        hasFiveCards && index === cards.length - 1
                                            ? "calc((100% - 16px) / 2)"
                                            : "100%",
                                    md: "100%",
                                },
                                minHeight: {
                                    xs: 118,
                                    sm: 132,
                                },
                                p: {
                                    xs: 1.5,
                                    sm: 2,
                                },
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                backgroundColor: "background.paper",
                                cursor: "pointer",
                                textAlign: "center",
                                fontFamily: "inherit",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "0.2s ease",

                                "&:hover": {
                                    borderColor: card.color,
                                    transform: "translateY(-2px)",
                                    boxShadow: "0px 8px 20px rgba(44, 51, 56, 0.08)",
                                },

                                "&:focus-visible": {
                                    outline: `2px solid ${card.color}`,
                                    outlineOffset: 2,
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 1.5,
                                    backgroundColor: `${card.color}15`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: card.color,
                                    mb: 1,
                                    transition: "0.2s ease",

                                    "button:hover &": {
                                        backgroundColor: `${card.color}25`,
                                        transform: "scale(1.03)",
                                    },
                                }}
                            >
                                <Icon size={21} strokeWidth={1.8} />
                            </Box>

                            <Typography
                                component="span"
                                sx={{
                                    fontSize: {
                                        xs: 13,
                                        sm: 14,
                                    },
                                    fontWeight: 600,
                                    color: "text.primary",
                                    lineHeight: 1.35,
                                }}
                            >
                                {card.title}
                            </Typography>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
};

export default HomePage;
