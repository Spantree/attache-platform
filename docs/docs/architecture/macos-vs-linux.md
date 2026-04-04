---
title: macOS vs Linux
sidebar_position: 1
---

# macOS vs Linux

Most AI agent deployments target Linux VPS instances or cloud containers. Evie Platform targets macOS — specifically Apple Silicon Mac minis running headless. This page covers what each platform brings to the table and when to pick one over the other.

## What macOS gives you

### Browser automation with a real display server

macOS provides a native GPU-backed display pipeline even in headless configurations. Browser automation runs against real Chrome or Safari instances with full rendering, WebGL, and extension support.

On a Linux VPS, browser automation typically means Puppeteer inside Xvfb — a virtual framebuffer with no GPU acceleration. It works for simple page scraping but falls apart with complex web apps, CAPTCHAs, and anything that checks for headless fingerprints.

### Apple ecosystem integration

If your agent needs to interact with iMessage, Apple Shortcuts, Keychain, Calendar.app, Contacts.app, or any other Apple service, it needs macOS. There's no workaround.

This extends to iOS device pairing. OpenClaw's node pairing protocol connects to iPhones and iPads over USB or local network for camera access, notifications, and location services. A Linux VPS can't pair with Apple devices.

### Desktop application control

AppleScript, `osascript`, and the Accessibility APIs let an agent drive GUI applications — clicking buttons, reading window contents, filling forms. Some workflows genuinely require interacting with apps that have no CLI or API equivalent.

### Hardware media pipeline

Apple Silicon's unified memory architecture and hardware encode/decode handle image generation, video processing, and audio synthesis without the latency and cost of cloud GPU instances. CoreML supports local model inference for tasks where you'd rather not send data to an API.

### Home and office network access

A Mac mini sitting on your network can reach your NAS, printers, IoT devices, and home automation systems directly. A cloud VPS requires tunneling every local service through a VPN or reverse proxy, adding latency and complexity.

### Cost structure

A Mac mini M4 with 16 GB of RAM costs $599 once. A comparable cloud instance (4 vCPU, 16 GB, GPU access, persistent storage) runs $50–150/month. At the one-year mark, the Mac mini is cheaper — and you own it.

The tradeoff is operational: you're responsible for power, networking, and hardware failures. Evie Platform's Ansible-based provisioning and monitoring reduce that burden, but it's not zero.

## When Linux is the better choice

Not every agent needs macOS. Linux VPS deployments win when:

- **The agent is pure CLI/API.** If your agent only runs shell commands, calls APIs, and processes text, it doesn't need a display server or Apple frameworks.
- **You need horizontal scaling.** Spinning up ten Linux containers is trivial. Ten Mac minis is a purchasing decision.
- **You want cattle, not pets.** Cloud instances are disposable and reproducible. Hardware has serial numbers and failure modes.
- **You have no Apple ecosystem dependency.** No iMessage, no Keychain, no iOS devices, no desktop apps to automate.
- **Budget favors operational expense over capital expense.** Some organizations prefer monthly cloud bills over hardware procurement.

## Platform-specific security implications

The OS choice affects the security model. Evie Platform accounts for this:

| Concern | macOS (Evie Platform) | Linux VPS |
|---|---|---|
| **Agent OS user** | Admin user — required for headless operation without invisible GUI permission dialogs (TCC, Keychain access, Gatekeeper) | Dedicated unprivileged user with tight group memberships |
| **Permission dialogs** | macOS presents consent popups that block processes on headless machines if the user lacks admin privileges | No GUI consent layer — permissions are purely filesystem and capability-based |
| **Security enforcement** | Exec allowlists, secrets proxy, seatbelt sandboxing, outbound scanning | Exec allowlists, secrets proxy, seccomp/AppArmor, standard Unix permissions |
| **Credential storage** | macOS Keychain + 1Password CLI | System keyring, HashiCorp Vault, or secrets manager of choice |
| **Network exposure** | Typically behind a home/office NAT with Tailscale overlay | Public IP by default — firewall configuration is critical |

The application-layer controls (exec allowlists, secrets proxy, bloom filter scanning) are identical on both platforms. The difference is in how the OS enforces the boundary beneath those controls.

### Why Evie Platform uses an admin user on macOS

On a headed Mac, permission dialogs are a mild annoyance — you click "Allow" and move on. On a headless Mac mini with no monitor attached, those same dialogs become invisible blockers. The agent's process hangs waiting for consent that nobody can grant.

Common triggers:

- **Keychain access** — new Node.js processes or updated binaries prompt for Keychain permission
- **TCC (Transparency, Consent, and Control)** — accessibility, screen recording, file access to protected directories
- **Gatekeeper** — first launch of unsigned or ad-hoc signed binaries
- **Network trust** — incoming connection approval for new services

Running as an admin user with appropriate TCC pre-approvals (managed by Evie Platform's Ansible provisioning) prevents these invisible hangs. Security is then enforced at the application layer: exec allowlists restrict what commands the agent can run, the secrets proxy controls credential access, and outbound scanning catches exfiltration attempts.

This is a deliberate architectural choice, not a shortcut. Restricting OS-level permissions on headless macOS creates reliability problems that are worse than the security risks they're meant to address — especially when the application-layer controls are tighter than what Unix permissions alone provide.

## The short version

Choose macOS when your agent needs to live in your world — your devices, your apps, your browser, your local network. Choose Linux when the agent just needs to run code and call APIs. Evie Platform exists because the first category is larger than most people think, and nobody was building the infrastructure to support it properly.
