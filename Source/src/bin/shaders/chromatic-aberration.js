/**
 * Chromatic Aberration Shader
 * Tạo hiệu ứng lệch màu RGB theo tốc độ game
 */
const ChromaticAberrationShader = {
    uniforms: {
        tDiffuse: { value: null },
        aberration: { value: 0.0 },
        vignetteStrength: { value: 0.3 }
    },

    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float aberration;
        uniform float vignetteStrength;
        varying vec2 vUv;

        void main() {
            // Chromatic aberration từ center outward
            vec2 center = vec2(0.5);
            vec2 dir = normalize(vUv - center);
            float dist = distance(vUv, center);

            float shift = aberration * dist;

            vec4 colorR = texture2D(tDiffuse, vUv + dir * shift * 0.02);
            vec4 colorG = texture2D(tDiffuse, vUv);
            vec4 colorB = texture2D(tDiffuse, vUv - dir * shift * 0.02);

            vec4 finalColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);

            // Vignette effect khi aberration cao
            float vignette = 1.0 - (dist * vignetteStrength);
            finalColor.rgb *= vignette;

            gl_FragColor = finalColor;
        }
    `
};

export default ChromaticAberrationShader;