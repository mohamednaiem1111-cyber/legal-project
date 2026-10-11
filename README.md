# AI Regulatory Compliance & Cyber-Legal Defense Engine
**Digital Egypt Pioneers Initiative (DEPI) — Industry Track**

### Team Members:
- Mohamed Hosny (Project Lead & Legal Framework Lead)
- Shaimaa Khaled (System Analyst & UI/UX Lead)
- Yara Tarek (Knowledge Base & Data Engineer)
- Ahmed El-Sherif (Workflow Automation Engineer)
- Mohamed Abdelhaleem (QA & Cyber Testing Lead)

### Milestone Deliverables:
- [x] **Milestone 1:** [Project_Planning_and_Management_DEPI_Milestone_1.pdf](./Project_Planning_and_Management_DEPI_Milestone_1.pdf)
- [x] **Milestone 2:** [Milestone_2_System_Analysis_and_Design_DEPI_Final.pdf](./Milestone_2_System_Analysis_and_Design_DEPI_Final.pdf)

## System Architecture & Interaction Workflows

### 1. High-Level Component Architecture
```mermaid
graph TD
    Client["Client Browser / Lovable.dev (React UI)"] -->|POST Multipart PDF| Webhook["n8n Webhook Gateway"]
    Webhook --> Extract["Extract from File (Arabic Normalizer)"]
    Extract --> DB_Log["Supabase PostgreSQL (Audit Session Row)"]
    Extract --> Agent["Maat AI Agent (GPT-4o)"]
    Agent -->|Vector RAG Search| VectorStore["Supabase pgvector (Official Laws 151/816/175)"]
    Agent --> MathEngine["JavaScript Deterministic Engine (Math Scoring & Fines)"]
    MathEngine --> Render["Render Report (RTL Arabic HTML Engine)"]
    Render --> Delivery["Gmail API & Instant Webhook Response"]
```

### 2. End-to-End Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Corporate Legal
    participant Web as Lovable Web UI
    participant n8n as n8n Cloud Webhook
    participant DB as Supabase PostgreSQL
    participant RAG as Supabase pgvector
    participant AI as OpenAI GPT-4o
    participant Math as JS Math Engine

    User->>Web: Uploads Policy PDF & Sector Data
    Web->>n8n: POST /webhook (Multipart Payload)
    n8n->>DB: INSERT audit_sessions (Create Session)
    n8n->>AI: Dispatch Extracted Policy Text
    AI->>RAG: Vector Similarity Query (Laws 151/816/175)
    RAG-->>AI: Return Top-K Statutory Chunks
    AI->>Math: Output 9-Axis Evaluations (States & Quotes)
    Math->>n8n: Computed Scores, Fines (EGP) & Conciliation
    n8n->>Web: 200 OK (HTML Report & Dashboard Data)
    n8n->>User: Dispatch Gmail Full Executive Report
```

---

## 🎨 UI/UX Architecture & User Journey

### 1. End-to-End User Flow & Incident Response
The diagram below illustrates the complete platform lifecycle, including dual-intake processing, iterative remediation loops, and the dedicated 72-hour emergency breach protocol:

<img src="docs/ui-ux/user_flowchart.png" width="100%" />
---

### 2. Core System Wireframes & Design System
- **Screen 1 — Landing Page:** Regulatory countdown banner (Law 151/2020 & Exec Reg 816/2025) and core mission overview.
- **Screen 2 — Dual Audit Intake & AI War Room:** File upload (PDF) vs live domain audit (URL) with SSRF safeguards, live pipeline stages, and Risk Radar.
- **Screen 3 — Audit Results & Regulatory Action:** Real statutory penalty ranges (Law 151 & Law 175 Art. 33), Art. 49 pre-trial conciliation calculator (50% statutory reduction), and emergency breach alert.
- **Screen 4 — UX Journey & Design System:** Multi-tier remediation loop and enterprise color palette (Navy `#142C3B`, Gold `#CDA963`, Success `#377E5B`).

* 📄 **Static Documentation:** [View Full Wireframes PDF](docs/ui-ux/wireframes_system.pdf)
* 🔗 **Interactive Prototype:** [Explore Live Design on Canva](https://canva.link/c6m2pclgmjk4wc1)
