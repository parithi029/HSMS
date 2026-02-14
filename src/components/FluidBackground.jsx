import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const FluidBackground = () => {
    const canvasRef = useRef(null);
    const { theme, showFluid } = useTheme();
    const themeRef = useRef(theme);
    const showFluidRef = useRef(showFluid);

    // Keep refs in sync to avoid effect re-runs
    useEffect(() => {
        themeRef.current = theme;
        showFluidRef.current = showFluid;
    }, [theme, showFluid]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const gl = canvas.getContext('webgl', {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false
        });

        if (!gl) {
            console.error("WebGL not supported");
            return;
        }

        // --- Shader Source Code ---
        const baseVertexShader = `
            precision highp float;
            attribute vec2 aPosition;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform vec2 texelSize;

            void main () {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;

        const displayShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            void main () {
                vec4 c = texture2D(uTexture, vUv);
                gl_FragColor = vec4(c.rgb, c.a); 
            }
        `;

        const splatShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTarget;
            uniform float aspectRatio;
            uniform vec3 color;
            uniform vec2 point;
            uniform float radius;

            void main () {
                vec2 p = vUv - point.xy;
                p.x *= aspectRatio;
                float d = dot(p, p);
                vec3 splat = exp(-d / radius) * color;
                vec3 base = texture2D(uTarget, vUv).xyz;
                gl_FragColor = vec4(base + splat, 1.0);
            }
        `;

        const advectionShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uVelocity;
            uniform sampler2D uSource;
            uniform vec2 texelSize;
            uniform float dt;
            uniform float dissipation;

            void main () {
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                gl_FragColor = dissipation * texture2D(uSource, coord);
            }
        `;

        const divergenceShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uVelocity;

            void main () {
                float L = texture2D(uVelocity, vL).x;
                float R = texture2D(uVelocity, vR).x;
                float T = texture2D(uVelocity, vT).y;
                float B = texture2D(uVelocity, vB).y;
                float div = 0.5 * (R - L + T - B);
                gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
            }
        `;

        const pressureShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uDivergence;

            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float div = texture2D(uDivergence, vUv).x;
                float p = (L + R + B + T - div) * 0.25;
                gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
            }
        `;

        const gradSubShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uVelocity;

            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity -= vec2(R - L, T - B);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }
        `;

        const createShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Shader Compile Error:", gl.getShaderInfoLog(shader));
            }
            return shader;
        };

        const createProgram = (vertexSource, fragmentSource) => {
            const program = gl.createProgram();
            gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexSource));
            gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentSource));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error("Program Link Error:", gl.getProgramInfoLog(program));
            }
            return program;
        };

        const displayProgram = createProgram(baseVertexShader, displayShader);
        const splatProgram = createProgram(baseVertexShader, splatShader);
        const advectionProgram = createProgram(baseVertexShader, advectionShader);
        const divergenceProgram = createProgram(baseVertexShader, divergenceShader);
        const pressureProgram = createProgram(baseVertexShader, pressureShader);
        const gradSubProgram = createProgram(baseVertexShader, gradSubShader);

        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        const createFBO = (w, h) => {
            gl.activeTexture(gl.TEXTURE0);
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            return { texture, fbo, width: w, height: h };
        };

        const doubleFBO = (w, h) => {
            let fbo1 = createFBO(w, h);
            let fbo2 = createFBO(w, h);
            return {
                get read() { return fbo1; },
                get write() { return fbo2; },
                swap() { [fbo1, fbo2] = [fbo2, fbo1]; }
            };
        };

        const simRes = 128;
        let density = doubleFBO(simRes, simRes);
        let velocity = doubleFBO(simRes, simRes);
        let divergence = createFBO(simRes, simRes);
        let pressure = doubleFBO(simRes, simRes);

        const pointers = [];
        pointers.push({ id: -1, x: width / 2, y: height / 2, dx: 0, dy: 0, down: true, color: [0.4, 0.6, 1.0] });

        let hue = 0;
        const hsvToRgb = (h, s, v) => {
            let r, g, b;
            let i = Math.floor(h * 6);
            let f = h * 6 - i;
            let p = v * (1 - s);
            let q = v * (1 - f * s);
            let t = v * (1 - (1 - f) * s);
            switch (i % 6) {
                case 0: r = v, g = t, b = p; break;
                case 1: r = q, g = v, b = p; break;
                case 2: r = p, g = v, b = t; break;
                case 3: r = p, g = q, b = v; break;
                case 4: r = t, g = p, b = v; break;
                case 5: r = v, g = p, b = q; break;
            }
            return [r, g, b];
        };

        const addSplat = (x, y, dx, dy, color, radius) => {
            pointers.push({ id: 0, x, y, dx, dy, down: true, color, radius });
            setTimeout(() => { if (pointers.length > 1) pointers.pop(); }, 200);
        };

        const handleMouseMove = (e) => {
            if (!showFluidRef.current) return;
            pointers[0].dx = (e.clientX - pointers[0].x) * 20.0;
            pointers[0].dy = (e.clientY - pointers[0].y) * 20.0;
            pointers[0].x = e.clientX;
            pointers[0].y = e.clientY;
            pointers[0].down = true;
        };

        const handleClick = (e) => {
            if (!showFluidRef.current) return;
            const x = e.clientX;
            const y = e.clientY;
            for (let i = 0; i < 12; i++) {
                setTimeout(() => {
                    const angle = (i / 12) * Math.PI * 2 + Math.random();
                    const speed = 2500 + Math.random() * 3500;
                    const dx = Math.cos(angle) * speed;
                    const dy = Math.sin(angle) * speed;
                    const color = hsvToRgb((hue + Math.random() * 0.3) % 1, 0.8, 1.0);
                    const radius = 0.001 + Math.random() * 0.005;
                    addSplat(x, y, dx, dy, color, radius);
                }, i * 25);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleClick);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            gl.viewport(0, 0, width, height);
        };
        window.addEventListener('resize', handleResize);

        let animationFrameId;
        const render = (time) => {
            if (!showFluidRef.current) {
                // If hidden, clear and skip rendering but keep loop alive
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            hue += 0.002;
            if (hue > 1) hue = 0;
            const currentColor = themeRef.current === 'dark' ? hsvToRgb(hue, 0.8, 1.0) : hsvToRgb(hue, 0.5, 0.8);
            pointers[0].color = currentColor;

            // Slow, atmospheric "moving gradient" flow (matching reference image)
            const t = time * 0.0003;

            // --- OPACITY & INTENSITY CONTROLS ---
            // Adjust these values (0.0 to 1.0+) to control the "strength" or brightness of the effects
            const backgroundOpacity = 0.09; // controls the 4 drifting background glows
            const pointerOpacity = 1.0;    // controls the mouse follow effect

            // --- BLUR & RADIUS CONTROLS ---
            // Adjust these values to control the size/spread (blurriness). 
            // 1.0 is default, 2.0 is double size (more blur), 0.5 is half size (sharper).
            const backgroundBlur = 2.0;
            const pointerBlur = 0.1;

            // --- BASE RADIUS/SIZE CONTROLS ---
            // These control the base size before blur is applied.
            // 1.0 is default, increase for larger splats, decrease for smaller ones.
            const backgroundRadius = 1.0;
            const pointerRadius = 0.1;
            // ------------------------------------

            // 4-point system with deep teal and magenta tones
            const points = [
                // Top-left teal/cyan
                { x: 0.1 + 0.1 * Math.cos(t * 0.8), y: 0.2 + 0.1 * Math.sin(t * 1.1), color: [0.0, 0.4, 0.4], r: 0.025 },
                // Top-right deep blue
                { x: 0.8 + 0.1 * Math.sin(t * 0.7), y: 0.3 + 0.1 * Math.cos(t * 0.9), color: [0.0, 0.1, 0.3], r: 0.030 },
                // Bottom-right magenta/purple
                { x: 0.7 + 0.1 * Math.sin(t * 1.2), y: 0.8 + 0.1 * Math.cos(t * 1.0), color: [0.4, 0.0, 0.2], r: 0.035 },
                // Bottom-left deep blue/violet
                { x: 0.2 + 0.1 * Math.cos(t * 1.4), y: 0.7 + 0.1 * Math.sin(t * 0.8), color: [0.1, 0.0, 0.2], r: 0.028 }
            ];

            points.forEach(p => {
                // Apply background opacity multiplier
                const scaledColor = p.color.map(c => c * backgroundOpacity);
                // Apply background blur and radius multipliers to the radius
                const scaledRadius = p.r * backgroundBlur * backgroundRadius;
                addSplat(p.x * width, p.y * height, 50 * Math.cos(t), 50 * Math.sin(t), scaledColor, scaledRadius);
            });

            // Enhanced mouse interaction (Extra splats for "blur/glow" feel)
            if (pointers[0].moved) {
                const p = pointers[0];
                // Apply pointer opacity multiplier to the current mouse color
                const scaledPColor = p.color.map(c => c * pointerOpacity);

                addSplat(p.x, p.y, p.dx, p.dy, scaledPColor, 0.015 * pointerBlur * pointerRadius); // Large soft core
                addSplat(p.x, p.y, p.dx, p.dy, scaledPColor, 0.030 * pointerBlur * pointerRadius); // Even larger "blur" layer
                pointers[0].moved = false; // Reset after adding splats
            }

            // --- ALL RENDERING STEPS MUST BIND QUAD BUFFER ---
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);

            const bindAttribute = (program) => {
                const posLoc = gl.getAttribLocation(program, 'aPosition');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            };

            gl.viewport(0, 0, simRes, simRes);

            // 1. Splat
            pointers.forEach(p => {
                if (p.down) {
                    gl.useProgram(splatProgram);
                    bindAttribute(splatProgram);
                    gl.uniform2f(gl.getUniformLocation(splatProgram, 'point'), p.x / width, 1.0 - p.y / height);
                    gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), p.color[0], p.color[1], p.color[2]);
                    gl.uniform1f(gl.getUniformLocation(splatProgram, 'aspectRatio'), width / height);
                    gl.uniform1f(gl.getUniformLocation(splatProgram, 'radius'), p.radius || 0.006);
                    gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), 0);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, density.read.texture);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    density.swap();

                    gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), p.dx * 0.2, -p.dy * 0.2, 0.0);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    velocity.swap();
                    p.down = false;
                }
            });

            // 2. Advection
            gl.useProgram(advectionProgram);
            bindAttribute(advectionProgram);
            gl.uniform2f(gl.getUniformLocation(advectionProgram, 'texelSize'), 1.0 / simRes, 1.0 / simRes);
            gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dt'), 0.016);
            gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), 0.85);

            gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), 0);
            gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            velocity.swap();

            gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), 0.92);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
            gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), 1);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, density.read.texture);
            gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            density.swap();

            // 3. Divergence & Pressure
            gl.useProgram(divergenceProgram);
            bindAttribute(divergenceProgram);
            gl.uniform2f(gl.getUniformLocation(divergenceProgram, 'texelSize'), 1.0 / simRes, 1.0 / simRes);
            gl.uniform1i(gl.getUniformLocation(divergenceProgram, 'uVelocity'), 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fbo);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.useProgram(pressureProgram);
            bindAttribute(pressureProgram);
            gl.uniform2f(gl.getUniformLocation(pressureProgram, 'texelSize'), 1.0 / simRes, 1.0 / simRes);
            gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uDivergence'), 0);
            gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uPressure'), 1);
            for (let i = 0; i < 20; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, divergence.texture);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                pressure.swap();
            }

            // 4. Gradient Subtraction
            gl.useProgram(gradSubProgram);
            bindAttribute(gradSubProgram);
            gl.uniform2f(gl.getUniformLocation(gradSubProgram, 'texelSize'), 1.0 / simRes, 1.0 / simRes);
            gl.uniform1i(gl.getUniformLocation(gradSubProgram, 'uPressure'), 0);
            gl.uniform1i(gl.getUniformLocation(gradSubProgram, 'uVelocity'), 1);
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            velocity.swap();

            // 5. Final Print
            gl.viewport(0, 0, width, height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(displayProgram);
            bindAttribute(displayProgram);
            gl.uniform1i(gl.getUniformLocation(displayProgram, 'uTexture'), 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, density.read.texture);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleClick);
            window.removeEventListener('resize', handleResize);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 w-full h-full pointer-events-none fluid-canvas transition-opacity duration-1000`}
            style={{
                zIndex: -1,
                opacity: showFluid ? (theme === 'dark' ? 0.6 : 0.4) : 0,
                filter: 'blur(8px) saturate(1.4)'
            }}
        />
    );
};

export default FluidBackground;
