import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
    const { pathname, search } = useLocation();

    useLayoutEffect(() => {
        const scrollToTop = () => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            document
                .querySelectorAll(
                    ".app-root-wrapper, .app-layout, main, [data-scroll-container]"
                )
                .forEach((element) => {
                    element.scrollTop = 0;
                    element.scrollLeft = 0;
                });
        };

        scrollToTop();
        const frameId = window.requestAnimationFrame(scrollToTop);

        return () => window.cancelAnimationFrame(frameId);
    }, [pathname, search]);

    return null;
}
