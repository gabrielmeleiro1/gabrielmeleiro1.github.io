/* Homepage background: light through water, drawn as a halftone.

   The first screen is the sea surface. Each dot in the grid is sized by how
   much light reaches it: slow haze, slanted shafts, and caustic lines near
   the top. Scrolling takes you down. The field drifts up slower than the
   page, the light fades and the water darkens, and past the middle of the
   page a shark or two swims through in the same dots.

   Dots are cleared from behind every block of text, so the copy keeps its
   contrast at any depth. Colours come from the --water-* tokens in
   style.css. Visitors who ask for reduced motion get a still frame that
   only changes with scroll depth. */
(function () {
    "use strict";

    var TAU = Math.PI * 2;
    var FPS = 30;
    var MAX_DOTS = 11000;
    var TONES = 4;                 // colour steps from dim to bright
    var OVER_TEXT = 0.5;           // light kept in the reading column below the hero
    var HERO_TEXT = ".site-nav > *, .hero-name span, .hero .text-links a, .scroll-cue";
    var BODY_TEXT = ".feature-head > *, .feature-media figcaption, .feature-actions > *, .section-head, " +
        ".ledger-num, .ledger-main > *, .ledger-arrow, .prose p, .stack-item > *, .site-footer > *";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var canvas = document.createElement("canvas");
    canvas.className = "water";
    canvas.setAttribute("aria-hidden", "true");
    var ctx = canvas.getContext("2d");
    var sharkCanvas = document.createElement("canvas");
    var sharkCtx = sharkCanvas.getContext("2d", { willReadFrequently: true });

    var width = 0, height = 0, lastWidth = 0;
    var grid = { s: 10, cols: 0, rows: 0 };
    var scale = 320;               // px per noise cell; smaller on phones
    var column = { left: 0, right: 0 };
    var page = null, heroText = [], bodyText = [];
    var palette = null, toneColors = [];
    var sharks = [];
    var running = false, last = 0, clock = 14, pending = false;

    /* ---- Small maths helpers --------------------------------------------- */

    function clamp(v, a, b) {
        return v < a ? a : v > b ? b : v;
    }

    function smoothstep(a, b, v) {
        var t = clamp((v - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function mixRGB(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }

    function rgb(c) {
        return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")";
    }

    function hash(x, y) {
        var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    // Smooth value noise in 0..1.
    function noise(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        var a = hash(xi, yi), b = hash(xi + 1, yi);
        var c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    // Bright ridges where three warped sine waves cancel out.
    function caustic(x, y, t) {
        var a = Math.sin(x + Math.sin(y * 0.8 + t) * 1.3 + t * 0.7);
        var b = Math.sin(y * 1.1 + Math.sin(x * 0.7 - t * 0.9) * 1.4 - t * 0.5);
        var c = Math.sin((x + y) * 0.6 + Math.sin(x * 0.4 - y * 0.5 + t) + t * 0.3);
        var k = 1 - Math.abs((a + b + c) / 3);
        k *= k;
        return k * k;
    }

    /* ---- Page measurements ------------------------------------------------ */

    function readPalette() {
        var css = getComputedStyle(document.documentElement);
        function token(name) {
            var hex = css.getPropertyValue(name).trim().replace("#", "");
            var n = parseInt(hex, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        palette = {
            surface: token("--water-surface"),
            deep: token("--water-deep"),
            dim: token("--water-dim"),
            bright: token("--water-bright"),
            shark: token("--water-shark")
        };
        toneColors = [];
        for (var k = 0; k < TONES; k++) toneColors.push(rgb(mixRGB(palette.dim, palette.bright, k / (TONES - 1))));
    }

    function measureColumn() {
        var rect = page.getBoundingClientRect();
        var css = getComputedStyle(page);
        column.left = rect.left + parseFloat(css.paddingLeft);
        column.right = rect.right - parseFloat(css.paddingRight);
    }

    // 0 inside the reading column, 1 in the side margins.
    function margin(x) {
        return clamp(Math.max(column.left - x, x - column.right) / 72, 0, 1);
    }

    // Padded boxes around visible text, each with the width of its soft edge.
    function textBoxes(els, pad, feather) {
        var out = [];
        els.forEach(function (el) {
            var list = el.getClientRects();
            for (var i = 0; i < list.length; i++) {
                var r = list[i];
                if (r.bottom < -feather || r.top > height + feather) continue;
                out.push({ l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad, f: feather });
            }
        });
        return out;
    }

    // 0 on top of the text, rising to 1 across each box's soft edge.
    function clearAt(boxes, x, y) {
        var m = 1;
        for (var i = 0; i < boxes.length; i++) {
            var B = boxes[i];
            var dx = Math.max(B.l - x, 0, x - B.r);
            var dy = Math.max(B.t - y, 0, y - B.b);
            if (dx > B.f || dy > B.f) continue;
            var f = smoothstep(0, B.f, Math.sqrt(dx * dx + dy * dy));
            if (f < m) m = f;
        }
        return m;
    }

    /* ---- Sharks ------------------------------------------------------------
       Silhouette in a unit box facing right, length 1, height 0.5.
       Grey value encodes shading: dark back, pale belly. */

    function drawShark(g, tailAngle) {
        var shade = g.createLinearGradient(0, 0.12, 0, 0.4);
        shade.addColorStop(0, "rgb(20,20,20)");
        shade.addColorStop(0.45, "rgb(90,90,90)");
        shade.addColorStop(0.7, "rgb(200,200,200)");
        shade.addColorStop(1, "rgb(245,245,245)");
        g.fillStyle = shade;

        // Body
        g.beginPath();
        g.moveTo(1.0, 0.27);
        g.bezierCurveTo(0.93, 0.17, 0.74, 0.14, 0.56, 0.15);
        g.bezierCurveTo(0.38, 0.16, 0.22, 0.22, 0.12, 0.255);
        g.lineTo(0.12, 0.29);
        g.bezierCurveTo(0.25, 0.32, 0.45, 0.385, 0.66, 0.37);
        g.bezierCurveTo(0.83, 0.36, 0.94, 0.33, 1.0, 0.29);
        g.closePath();
        g.fill();

        // Dorsal fins
        g.fillStyle = "rgb(35,35,35)";
        g.beginPath();
        g.moveTo(0.62, 0.155);
        g.quadraticCurveTo(0.55, 0.07, 0.49, 0.015);
        g.lineTo(0.465, 0.03);
        g.quadraticCurveTo(0.475, 0.1, 0.45, 0.165);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(0.27, 0.205);
        g.lineTo(0.235, 0.165);
        g.lineTo(0.22, 0.215);
        g.closePath();
        g.fill();

        // Pectoral fin
        g.fillStyle = "rgb(90,90,90)";
        g.beginPath();
        g.moveTo(0.68, 0.35);
        g.quadraticCurveTo(0.6, 0.42, 0.53, 0.49);
        g.lineTo(0.55, 0.47);
        g.quadraticCurveTo(0.58, 0.4, 0.58, 0.365);
        g.closePath();
        g.fill();

        // Tail, sweeping around its root
        g.save();
        g.translate(0.13, 0.272);
        g.rotate(tailAngle);
        g.fillStyle = "rgb(55,55,55)";
        g.beginPath();
        g.moveTo(0.06, -0.035);
        g.quadraticCurveTo(-0.04, -0.1, -0.12, -0.23);
        g.lineTo(-0.05, -0.2);
        g.quadraticCurveTo(-0.01, -0.1, 0.06, 0.0);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(0.06, -0.005);
        g.quadraticCurveTo(-0.01, 0.07, -0.09, 0.15);
        g.lineTo(-0.035, 0.15);
        g.quadraticCurveTo(0.0, 0.08, 0.06, 0.035);
        g.closePath();
        g.fill();
        g.restore();
    }

    function makeShark(len, anywhere) {
        var dir = Math.random() < 0.5 ? 1 : -1;
        return {
            len: len,
            dir: dir,
            x: anywhere ? -len * 0.3 + Math.random() * (width - len * 0.4) : dir > 0 ? -len - 60 : width + 60,
            y: height * 0.08 + Math.random() * Math.max(0, height * 0.77 - len * 0.5),
            speed: 14 + Math.random() * 8,
            phase: Math.random() * TAU
        };
    }

    function populate() {
        var len = clamp(width * 0.32, 220, 480);
        sharks = [makeShark(len, true)];
        if (width > 760) sharks.push(makeShark(len * 0.6, true));
    }

    function swim(dt) {
        sharks.forEach(function (s, i) {
            s.x += s.dir * s.speed * dt;
            s.y += Math.sin(clock * 0.4 + s.phase) * 5 * dt;
            var gone = s.dir > 0 ? s.x > width + 80 : s.x + s.len < -80;
            if (gone) sharks[i] = makeShark(s.len, false);
        });
    }

    // Draw the sharks one pixel per dot and read the coverage back.
    function sampleSharks() {
        var g = sharkCtx;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, grid.cols, grid.rows);
        sharks.forEach(function (s) {
            var k = s.len / grid.s;
            g.setTransform(1, 0, 0, 1, s.x / grid.s, s.y / grid.s);
            if (s.dir < 0) {
                g.translate(k, 0);
                g.scale(-1, 1);
            }
            g.scale(k, k);
            drawShark(g, Math.sin(clock * 2.2 + s.phase) * 0.22);
        });
        return g.getImageData(0, 0, grid.cols, grid.rows).data;
    }

    /* ---- Drawing ----------------------------------------------------------- */

    function draw() {
        var scrollY = window.scrollY;
        var span = Math.max(1, document.documentElement.scrollHeight - height);
        var depth = clamp(scrollY / span, 0, 1);          // 0 at the surface, 1 at the footer
        var past = smoothstep(0.1, 0.9, scrollY / height); // how far past the first screen
        var light = Math.pow(1 - depth, 1.4);
        var sharkness = 0.7 * smoothstep(0.3, 0.7, depth);
        var t = clock;

        // Water, darker with depth and towards the bottom of the screen.
        var fill = ctx.createLinearGradient(0, 0, 0, height);
        fill.addColorStop(0, rgb(mixRGB(palette.surface, palette.deep, smoothstep(0, 0.75, depth))));
        fill.addColorStop(1, rgb(mixRGB(palette.surface, palette.deep, smoothstep(0, 0.75, depth + 0.3))));
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, width, height);

        var boxes = textBoxes(bodyText, 6, 28);
        if (scrollY < height) boxes = boxes.concat(textBoxes(heroText, 6, 90));
        var sharkData = sharkness > 0.01 ? sampleSharks() : null;

        var s = grid.s, rmax = s * 0.56, drift = scrollY * 0.35;
        var tones = [];
        for (var k = 0; k < TONES; k++) tones.push(new Path2D());
        var sharkPath = new Path2D();

        for (var r = 0; r < grid.rows; r++) {
            var y = r * s + s * 0.5;
            var near = boxes.filter(function (B) {
                return y > B.t - B.f && y < B.b + B.f;
            });
            var wy = y + drift;              // depth of this row in the water
            var yv = wy / height;
            var surface = Math.exp(-yv * 1.5);
            var shimmer = Math.exp(-yv * 2.6);
            var shafts = Math.exp(-yv * 0.8);
            var offset = r & 1 ? s * 0.5 : 0;

            for (var c = 0; c < grid.cols; c++) {
                var x = c * s + offset;
                var nx = x / scale, ny = wy / scale;
                var haze = smoothstep(0.28, 0.82,
                    noise(nx + t * 0.05, ny - t * 0.03) * 0.65 +
                    noise(nx * 2.3 - t * 0.04, ny * 2.3 + t * 0.05) * 0.35);
                var ray = 0.5 + 0.5 * Math.sin((x * 0.8 + wy * 0.5) / 150 + noise(x / 500 + t * 0.03, 0.5) * 5);
                ray *= ray * ray;
                ray *= ray;

                var L = haze * (0.08 + 0.62 * surface) + ray * 0.3 * shafts;
                if (shimmer > 0.03) L += caustic(x / 70, wy / 70, t * 0.5) * 0.45 * shimmer * (0.4 + 0.6 * haze);
                // Contrast, so the water has calm dark areas between the light.
                L = smoothstep(0.07, 0.8, L) * light + 0.04 * haze;

                var inColumn = past * (1 - margin(x));
                var clear = near.length ? clearAt(near, x, y) : 1;
                L = clamp(L * (1 - (1 - OVER_TEXT) * inColumn) * clear, 0, 1);
                var rad = rmax * Math.sqrt(L);

                if (sharkData) {
                    var i = (r * grid.cols + c) * 4;
                    var a = sharkData[i + 3] / 255;
                    if (a > 0.1) {
                        var shade = 1 - sharkData[i] / 255;
                        var sr = rmax * 0.85 * Math.sqrt(a * (0.35 + 0.65 * shade)) *
                            sharkness * (1 - 0.6 * inColumn) * clear;
                        if (sr > rad) {
                            if (sr > 0.4) dot(sharkPath, x, y, sr);
                            continue;
                        }
                    }
                }

                if (rad < 0.4) continue;
                dot(tones[Math.min(TONES - 1, (L * TONES * 1.15) | 0)], x, y, rad);
            }
        }

        for (var j = 0; j < TONES; j++) {
            ctx.fillStyle = toneColors[j];
            ctx.fill(tones[j]);
        }
        ctx.fillStyle = rgb(palette.shark);
        ctx.fill(sharkPath);
    }

    function dot(path, x, y, r) {
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, TAU);
    }

    /* ---- Loop -------------------------------------------------------------- */

    function live() {
        return !document.hidden && !reduceMotion.matches;
    }

    function frame(ms) {
        if (!live()) {
            running = false;
            return;
        }
        requestAnimationFrame(frame);
        if (ms - last < 1000 / FPS - 2) return;
        var dt = Math.min(ms - last, 100) / 1000;
        last = ms;
        clock += dt;
        swim(dt);
        draw();
    }

    function start() {
        if (running || !live()) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
    }

    // One still frame, for when the loop is paused (reduced motion) or the
    // page changed under it.
    function redraw() {
        if (running || pending) return;
        pending = true;
        requestAnimationFrame(function () {
            pending = false;
            draw();
        });
    }

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var base = width < 600 ? 8 : 10;
        grid.s = (width / base) * (height / base) > MAX_DOTS ? Math.sqrt((width * height) / MAX_DOTS) : base;
        grid.cols = Math.ceil(width / grid.s) + 1;
        grid.rows = Math.ceil(height / grid.s) + 1;
        sharkCanvas.width = grid.cols;
        sharkCanvas.height = grid.rows;
        scale = clamp(width * 0.25, 150, 320);

        measureColumn();
        // Mobile toolbars change the height while scrolling; keep the sharks.
        if (width !== lastWidth) populate();
        lastWidth = width;
        redraw();
    }

    function init() {
        page = document.querySelector(".page");
        if (!page) return;
        heroText = [].slice.call(document.querySelectorAll(HERO_TEXT));
        bodyText = [].slice.call(document.querySelectorAll(BODY_TEXT));
        document.body.prepend(canvas);
        readPalette();
        resize();
        start();

        window.addEventListener("resize", resize);
        window.addEventListener("scroll", redraw, { passive: true });
        document.addEventListener("visibilitychange", start);
        reduceMotion.addEventListener("change", function () {
            start();
            redraw();
        });
        new MutationObserver(function () {
            readPalette();
            redraw();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        // Text boxes move once the display font arrives.
        if (document.fonts) document.fonts.ready.then(redraw);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
