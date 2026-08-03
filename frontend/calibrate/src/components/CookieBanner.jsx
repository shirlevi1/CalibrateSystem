import { useEffect, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";

export default function CookieBanner({ onAccept }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem("cookiesAccepted");

        if (!accepted) {
            setVisible(true);
        } else {
            onAccept();
        }
    }, [onAccept]);

    const acceptCookies = () => {
        localStorage.setItem("cookiesAccepted", "true");
        setVisible(false);
        onAccept();
    };

    if (!visible) return null;

    return (
        <Box
            sx={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                padding: 2,
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    p: 4,
                    width: 520,
                    maxWidth: "95%",
                    textAlign: "center",
                    borderRadius: 3,
                }}
            >
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                    🍪 שימוש בקוקיז באתר
                </Typography>

                <Typography
                    variant="body1"
                    sx={{
                        mb: 3,
                        color: "text.secondary",
                        lineHeight: 1.8,
                    }}
                >
                    האתר עושה שימוש בקוקיז לצורך תפעול תקין של השירותים, אבטחת המידע,
                    ניתוח ביצועים ושיפור חוויית המשתמש
                    <br />
                    <br />
                    המשך שימוש באתר מהווה הסכמה לשימוש בקוקיז בהתאם למדיניות הפרטיות
                </Typography>

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    onClick={acceptCookies}
                    sx={{
                        py: 1.2,
                        fontSize: "15px",
                        fontWeight: 500,
                        borderRadius: 2,
                    }}
                >
                    אני מאשר שימוש בקוקיז
                </Button>
            </Paper>
        </Box>
    );
}