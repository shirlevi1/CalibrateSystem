
import { createTheme } from "@mui/material/styles";

const accessibleTheme = createTheme({
    direction: "rtl",

    palette: {
        primary: {
            main: "#003B5C",
            light: "#005F8F",
            dark: "#00263A",
            contrastText: "#FFFFFF",
        },

        background: {
            default: "#FFFFFF",
            paper: "#FFFFFF",
        },

        text: {
            primary: "#111111",
            secondary: "#333333",
        },

        divider: "#000000",

        error: {
            main: "#B00020",
            contrastText: "#FFFFFF",
        },

        success: {
            main: "#006B3F",
            contrastText: "#FFFFFF",
        },

        info: {
            main: "#003B5C",
            contrastText: "#FFFFFF",
        },
    },

    shape: {
        borderRadius: 8,
    },

    typography: {
        fontFamily: "Arial, system-ui, sans-serif",

        allVariants: {
            fontWeight: 500,
            lineHeight: 1.7,
        },

        h1: { fontSize: "36px", fontWeight: 700 },
        h2: { fontSize: "28px", fontWeight: 700 },
        h6: { fontSize: "28px", fontWeight: 700, color: "#111111" },

        body1: { fontSize: "20px" },
        body2: { fontSize: "18px" },
        caption: { fontSize: "16px", color: "#333333" },
        button: { fontSize: "18px", fontWeight: 700 },
    },

    custom: {
        navbarHeight: 88,
        pagePaddingTop: 88,
    },

    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "18px",
                    minHeight: "44px",

                    "&:focus-visible": {
                        outline: "3px solid #FFBF00",
                        outlineOffset: "3px",
                    },
                },

                containedPrimary: {
                    backgroundColor: "#003B5C",
                    color: "#FFFFFF",

                    "&:hover": {
                        backgroundColor: "#00263A",
                    },
                },

                outlinedPrimary: {
                    borderColor: "#000000",
                    color: "#111111",
                    borderWidth: "2px",

                    "&:hover": {
                        backgroundColor: "#EAF6FF",
                        borderColor: "#000000",
                    },
                },
            },
        },

        MuiTextField: {
            defaultProps: {
                variant: "outlined",
                size: "medium",
            },
        },

        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: "#FFFFFF",
                    fontSize: "18px",

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#003B5C",
                        borderWidth: "3px",
                    },
                },
            },
        },

        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    border: "2px solid #000000",
                    boxShadow: "none",
                    backgroundColor: "#FFFFFF",
                },
            },
        },
    },
});

export default accessibleTheme;