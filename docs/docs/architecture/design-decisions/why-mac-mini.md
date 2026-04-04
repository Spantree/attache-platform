---
sidebar_label: Why Mac Mini
---

# Why Mac Mini

## Problem

Every Evie Platform agent needs dedicated compute. The agent runs Docker containers, a Postgres instance, local inference models, and the OpenClaw gateway. It needs to be always-on, physically isolated from your primary workstation, and powerful enough for real-time work.

## Options Considered

1. **Cloud VM** -- AWS EC2, GCP, or a VPS provider
2. **Linux mini PC** -- Intel NUC or similar
3. **Mac mini with Apple Silicon** -- M4 now, M5 when available (May 2026)

## Decision

Dedicated Mac mini per agent, 512 GB SSD minimum. M4 for current deployments, upgrading to M5 when it ships.

The model is the same as Vision Pro: the device is yours. Your agent runs on your hardware, on your desk or in your closet, under your physical control.

Apple Silicon provides the unified memory architecture that makes local inference practical. A Mac mini with 24 GB unified memory can run quantized models (Llama 3, Mistral, Phi) for local reflection tasks without a discrete GPU. The Neural Engine accelerates inference workloads that would require an expensive GPU on x86.

macOS is the native target for OpenClaw. The gateway, tools, and ecosystem assume macOS or Linux -- and macOS has better support for the desktop integration patterns Evie Platform uses (launchd agents, Keychain Access, Shortcuts).

## Tradeoffs

- **Won.** Physical sovereignty -- no cloud provider can access, throttle, or terminate your agent. Data never leaves the box unless the agent explicitly sends it.
- **Won.** Local inference capability -- Apple Silicon's unified memory makes running quantized models practical without a separate GPU budget.
- **Lost.** Higher upfront cost than a cloud VM (though break-even is typically three to five months vs. a comparable EC2 instance).
- **Lost.** macOS-specific. Teams running Linux infrastructure need the [macOS vs. Linux](../macos-vs-linux.md) guide to evaluate the gap.
- **Lost.** Single point of failure without redundancy planning. A dead Mac mini means a dead agent until you replace it.
