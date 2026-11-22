/* Loaded blocking in <head> so the theme is applied before first paint. */
(function () {
    var STORAGE_KEY = "gm-theme";
    var root = document.documentElement;

    function preferred() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved === "light" || saved === "dark") return saved;
        } catch (e) {
            /* private mode / storage disabled — fall through to the OS setting */
        }
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    function apply(theme) {
        root.setAttribute("data-theme", theme);
        var button = document.querySelector("[data-theme-toggle]");
        if (!button) return;
        var next = theme === "dark" ? "light" : "dark";
        button.setAttribute("aria-label", "Switch to " + next + " theme");
    }

    apply(preferred());

    document.addEventListener("DOMContentLoaded", function () {
        var button = document.querySelector("[data-theme-toggle]");
        if (!button) return;

        apply(root.getAttribute("data-theme"));

        button.addEventListener("click", function () {
            var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
            apply(next);
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch (e) {
                /* not persisting is fine — the toggle still works for this page */
            }
        });
    });
})();
