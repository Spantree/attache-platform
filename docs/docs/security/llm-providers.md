---
title: LLM Provider Data Handling
sidebar_position: 6
---

# LLM provider data handling

Your agent sends code, messages, and file contents to an LLM provider every time it reasons about a task. That's the fundamental tradeoff of using hosted models. But not all provider relationships are equal — the subscription tier you pay for determines what happens to your data after inference.

This page breaks down what each provider does with your data, and how to choose the right tier for your deployment.

## The data sovereignty argument

With Attache, your agent runs on hardware you control. Your files, credentials, memory, and conversation history stay on your Mac mini. The only data that leaves your network is the inference payload — the prompt and context sent to the LLM for processing, and the response that comes back.

Compare this to cloud-based AI tools (Google Gemini with Drive access, Microsoft Copilot with email integration, GitHub Copilot with your full codebase) where the tool itself runs in someone else's infrastructure and has standing access to your data. With Attache, you control what gets sent and when.

The remaining question is: what does the LLM provider do with the inference data?

## Provider comparison

### Anthropic (Claude)

_Last verified: 2026-03-19. Sources: [Anthropic API Terms of Service](https://www.anthropic.com/api-terms), [Commercial Terms](https://www.anthropic.com/commercial-terms), [Privacy Policy](https://www.anthropic.com/privacy)._

| Tier                    | Trains on your data? | Retention                              | Zero Data Retention?          |
| ----------------------- | -------------------- | -------------------------------------- | ----------------------------- |
| **API (default)**       | No                   | 7 days (reduced from 30 in Sept 2025)  | Available via agreement       |
| **API (ZDR agreement)** | No                   | Zero — deleted after response returned | Yes, covers API + Claude Code |
| **Claude Pro / Max**    | Opt-out available    | Retained for product improvement       | No                            |
| **Claude Free**         | Yes, by default      | Retained                               | No                            |

Anthropic's API terms state that API inputs and outputs are not used for model training. The 7-day retention is for trust and safety monitoring. Zero Data Retention is available through a commercial agreement and applies to API endpoints and Claude Code.

**For Attache deployments: use the API tier.** If handling sensitive client data, get a ZDR agreement.

### OpenAI (GPT-4, GPT-4o)

_Last verified: 2026-03-19. Sources: [OpenAI API Data Usage Policy](https://openai.com/enterprise-privacy), [API Terms of Use](https://openai.com/policies/terms-of-use)._

| Tier                   | Trains on your data?                     | Retention                    | Zero Data Retention?       |
| ---------------------- | ---------------------------------------- | ---------------------------- | -------------------------- |
| **API (default)**      | No (since March 2023)                    | 30 days for abuse monitoring | Enterprise agreements only |
| **Team / Enterprise**  | No                                       | 30 days abuse monitoring     | Enterprise: yes            |
| **ChatGPT Plus / Pro** | Opt-out available, but **on by default** | Retained                     | No                         |
| **ChatGPT Free**       | Yes, by default                          | Retained                     | No                         |

OpenAI's API data usage policy states that API data is not used for training (effective March 1, 2023). The retention window is 30 days — longer than Anthropic's 7 days. ZDR requires an Enterprise agreement. Consumer products (Plus, Free) have training enabled by default; users must manually opt out.

**For Attache deployments: use the API tier.** Be aware of the 30-day abuse monitoring window.

### Google (Gemini)

_Last verified: 2026-03-19. Sources: [Google Cloud Data Processing Terms](https://cloud.google.com/terms/data-processing-terms), [Gemini API Terms](https://ai.google.dev/terms)._

| Tier                  | Trains on your data? | Retention                     | Zero Data Retention?       |
| --------------------- | -------------------- | ----------------------------- | -------------------------- |
| **Vertex AI**         | No                   | Per GCP data processing terms | Yes (GCP enterprise terms) |
| **Gemini API (paid)** | No                   | Varies                        | Check current terms        |
| **Gemini Free**       | Yes                  | Retained                      | No                         |

Google Vertex AI runs within your GCP project and follows standard GCP data processing agreements. This is the strongest Google option for data-sensitive work.

### AWS Bedrock

_Last verified: 2026-03-19. Source: [Amazon Bedrock FAQs — Security](https://aws.amazon.com/bedrock/faqs/#Security)._

| Tier                     | Trains on your data? | Retention                       | Who has access?                           |
| ------------------------ | -------------------- | ------------------------------- | ----------------------------------------- |
| **Bedrock (all models)** | No                   | Not stored or logged by default | AWS only — model providers have no access |

AWS Bedrock deep-copies models into AWS infrastructure. According to the [Bedrock security FAQ](https://aws.amazon.com/bedrock/faqs/#Security): "Amazon Bedrock doesn't store or log your prompts and completions. Amazon Bedrock doesn't use your prompts and completions to train any AWS models and doesn't distribute them to third parties."

The model provider (Anthropic, Meta, etc.) never sees your prompts or completions. Your data stays within AWS's security boundary. Among the hosted options, Bedrock provides the strongest separation between your inference data and the model provider.

**The tradeoff:** Bedrock is pay-as-you-go and more expensive per token than direct API access. For high-volume agent workloads, the cost difference can be significant. But for clients with strict data residency requirements, it's the right choice.

### Google Cloud Vertex AI

Similar to Bedrock — runs within your GCP project, follows your data processing agreement, model providers don't have direct access to your inference data.

## How this compares to tools you already use

Before getting anxious about LLM inference data, consider what you're already trusting third parties with:

| Tool                         | Where your data goes                | Who controls it                    | Training risk                                              |
| ---------------------------- | ----------------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| **GitHub**                   | Microsoft servers                   | Microsoft                          | Private repos: no. Public repos: used for Copilot training |
| **Google Workspace**         | Google servers                      | Google                             | Enterprise: no training                                    |
| **Slack**                    | Salesforce servers                  | Salesforce                         | Enterprise: no training                                    |
| **OpenClaw + Anthropic API** | Your Mac mini + Anthropic inference | You + Anthropic                    | No (API default)                                           |
| **OpenClaw + AWS Bedrock**   | Your Mac mini + AWS                 | You + AWS (provider has no access) | No                                                         |
| **GitHub Copilot**           | Microsoft servers                   | Microsoft                          | Enterprise: no. Individual: opt-out                        |

Your source code already lives on GitHub. Your email is on Google or Microsoft servers. Your chat history is on Slack. If your organization trusts those platforms for standing data storage, it's worth asking why LLM inference — where data is processed and discarded — would be held to a stricter standard.

That's not an argument for being careless. It's an argument for consistency. Apply the same data governance framework across all your tools, including AI.

## Choosing the right tier

**Minimum for any professional use:** API tier (Anthropic or OpenAI). No training on your data. Short retention windows. No consumer-grade subscriptions (Free, Plus) for client work.

**For client-facing work with NDA-covered code:** API with Zero Data Retention agreement. Data deleted after the response is returned.

**For regulated industries or strict data residency:** AWS Bedrock or Google Vertex AI. The model provider never sees your data. Your inference runs within your cloud account's security boundary.

**What to avoid:**

- Consumer-tier subscriptions (Claude Free, ChatGPT Free/Plus) for any work involving client data
- Assuming "I'm paying for it" means your data is protected — the tier matters, not just the price
- Using one provider's consumer product while holding another provider's API to enterprise standards

## Configuration

Attache supports multiple LLM providers. Point your agent at the appropriate endpoint:

```json
{
  "providers": {
    "anthropic": {
      "apiKey": "op://Agent-Vault/ANTHROPIC_API_KEY/credential"
    }
  }
}
```

For AWS Bedrock:

```json
{
  "providers": {
    "bedrock": {
      "region": "us-east-1",
      "model": "anthropic.claude-sonnet-4-20250514-v1:0"
    }
  }
}
```

For Google Vertex AI:

```json
{
  "providers": {
    "vertex": {
      "project": "your-gcp-project",
      "location": "us-central1",
      "model": "claude-sonnet-4-20250514"
    }
  }
}
```

:::tip Match the provider to the sensitivity
You can configure different providers for different agents. Your personal agent can use the direct Anthropic API for cost efficiency. A client-facing agent handling regulated data can route through Bedrock. Same platform, different data handling guarantees.
:::

## Documenting your choice

Whatever tier you choose, document it. Your security policy should state:

1. Which LLM providers are approved for use
2. Which subscription tiers are required (API, not consumer)
3. Whether a ZDR agreement is in place
4. For which clients or projects Bedrock/Vertex is required
5. How this was communicated to the team

This documentation turns "we think our data is safe" into a defensible data governance policy for AI inference.
