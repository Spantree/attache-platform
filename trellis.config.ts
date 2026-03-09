/**
 * Trellis project configuration
 * Edit this file to customize your project's brand identity.
 * Changes here will be reflected across docs, slides, and landing page.
 */
export default {
  components: {
    docs: true,
    slides: false,
    landing: false,
  },
  infra: {
    docker: false,
    cloudflare: true,
  },
  brand: "Attaché",
  projectName: "attache-site",
  title: "Attache Site",
  tagline: "Built with Trellis",
  colors: {
    primary: "#2C3A41",
    accent: "#6366f1",
    accentDark: "#3e41ee",
    bgStart: "#E5E5E5",
    bgEnd: "#D2E2EA",
    textLight: "#6B7280",
    textMuted: "#9CA3AF",
  },
  font: {
    family: "Inter",
    weights: [300, 400, 500, 600, 700, 800],
  },
};
