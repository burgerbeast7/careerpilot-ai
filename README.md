# CareerPilot AI — Intelligent Agentic Career Copilot

> **Empowering Students with AI Automation, Agentic Intelligence, and Personalized Career Success.**

---

### **Creator: Kunal Chauhan**
**Copyright (c) 2026 Kunal Chauhan. All rights reserved.**

---

## 🚀 Executive Summary

**CareerPilot AI** is an enterprise-grade AI placement preparation platform designed to help students optimize their portfolios, map out syllabus milestones, conduct mock interviews, and organize internship track pipelines. 

By coordinating a **Multi-Agent Network** under a **Master Orchestrator**, the system parses files, calculates ATS scores, charts competency gap analyses, generates study roadmaps, scores mock interviews against the STAR framework, and generates downloadable PDF application templates.

---

## 📐 System Architecture

The application is structured around a decoupled **FastAPI Python gateway** and a **React TypeScript single-page application** styled with translucent glassmorphic components.

```mermaid
flowchart TD
    subgraph Client [Frontend React TypeScript]
        UI[Glassmorphic User Interface]
        Auth[AuthContext / JWT Session]
        Visualizer[AgentVisualizer SSE Console]
        Charts[Recharts Radar/Area Visuals]
        Kanban[Kanban Placement Board]
    end

    subgraph API_Gateway [FastAPI Backend]
        Router[FastAPI API Router]
        JWT[OAuth2 JWT Validator]
        Orchestrator[Master Orchestrator Agent]
        Parser[PDF/DOCX Document Parser]
        AIFactory[Unified AI Client Factory]
        PDFGen[ReportLab PDF Compiler]
    end

    subgraph Database [Storage Layer]
        SQLite[(careerpilot.db / SQLite)]
    end

    subgraph LLM_Providers [Inference APIs]
        Groq[Groq Llama-3 API]
        Gemini[Google Gemini API]
        WatsonX[IBM WatsonX API]
        LocalHeuristics[Local Heuristics STAR Evaluator]
    end

    UI -->|API Requests| Router
    Visualizer -->|POST Chunk Reader Stream| Router
    Router -->|Verify Token| JWT
    Router -->|Dispatch Tasks| Orchestrator
    Router -->|Extract Content| Parser
    Router -->|Build PDFs| PDFGen
    Orchestrator -->|Request Generation| AIFactory
    AIFactory -->|Choose Provider| LLM_Providers
    Router -->|Commit Data| SQLite
```

---

## 🤝 Multi-Agent Sequence Mesh

This sequence diagram details how the **Master Orchestrator** manages worker nodes and streams live logs via Server-Sent Events (SSE):

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant MO as Master Orchestrator
    participant AP as ATS Parser Agent
    participant SG as Skill Gap Agent
    participant RM as Roadmap Agent
    participant AI as inference Engine

    Student->>MO: Upload Resume / Select Role
    MO-->>Student: SSE stream: [active] orchestrator -> Initializing
    critical Parse Resume
        MO->>AP: Dispatch ATS Parser Agent
        AP->>AI: Scan structure & extract keywords
        AI-->>AP: Returned keyword indices
        AP-->>Student: SSE stream: [progress] ats -> Checked Keyword match
    end
    critical Audit Gaps
        MO->>SG: Dispatch Skill Gap Agent
        SG->>AI: Compare current profile vs role benchmark
        AI-->>SG: Returned missing skill matrix
        SG-->>Student: SSE stream: [progress] skill_gap -> Analyzed gap indices
    end
    critical Formulate Roadmap
        MO->>RM: Dispatch Roadmap Agent
        RM->>AI: Structure modular study checkpoints
        AI-->>RM: Returned weekly tasks JSON
        RM-->>Student: SSE stream: [progress] roadmap -> Curated weeks 1-4
    end
    MO->>Student: SSE stream: [complete] orchestrator -> Finished! (Returns JSON result)
```

---

## 📂 Project Directory Structure

```
k:/IBM
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # Config loader (Pydantic Settings)
│   │   │   ├── database.py       # DB engine, session maker, SQLite/Postgres compatibility
│   │   │   └── security.py       # Password hashing (bcrypt) & JWT helpers
│   │   ├── models/               # SQLAlchemy models (User, Resume, Roadmap, etc.)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── ai_factory.py     # Unified LLM client (watsonx, openai, gemini, groq, mock)
│   │   │   ├── agents.py         # Multi-agent logic prompts and generators
│   │   │   └── parser.py         # PDF and DOCX text extractor parser
│   │   └── routers/              # Endpoints (auth, resume, gap, interview, docs, dashboard)
│   ├── main.py                   # FastAPI entrypoint
│   └── requirements.txt          # Server dependencies
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AgentVisualizer.tsx  # Dynamic multi-agent SVG mesh graph & terminal logs
    │   │   ├── ChatWidget.tsx       # Floating conversational streaming chat assistant
    │   │   └── Navbar.tsx           # Floating translucent navigation bar (Creator Watermark)
    │   ├── context/
    │   │   └── AuthContext.tsx      # Auth provider managing JWT tokens & profile sessions
    │   ├── services/
    │   │   └── api.ts               # Axios client with request token interceptors
    │   ├── pages/
    │   │   ├── Landing.tsx          # Hero page with interactive canvas connections (Creator copyright)
    │   │   ├── Login.tsx            # Login card with glowing validation outlines
    │   │   ├── Signup.tsx           # SignUp parameters form setup
    │   │   ├── ForgotPassword.tsx   # Recovery email form stub
    │   │   ├── Dashboard.tsx        # Readiness Index gauges & upcoming checklists
    │   │   ├── ResumeAnalyzer.tsx   # Resume dropzone & keyword heatmap
    │   │   ├── SkillGap.tsx         # Competency audits & Recharts Radar comparison
    │   │   ├── Roadmap.tsx          # Weekly checklist progress & confetti triggers
    │   │   ├── InterviewCoach.tsx   # Mock room & slide transition STAR critique panels
    │   │   └── DocGenerator.tsx     # Outreach editor & ReportLab PDF download links
    │   ├── App.tsx                  # Main router setup
    │   ├── index.css                # Glassmorphism templates & styling animations
    │   └── main.tsx                 # Mounting script
    ├── tailwind.config.js           # Palette guidelines (IBM Blue, Purple, Cyan, Black)
    └── package.json                 # Frontend UI packages
```

---

## 🌟 Key Features

1. **Interactive Connections Canvas**: A floating HTML5 particle canvas on the landing screen responds to cursor movement, connecting dots dynamically.
2. **Live Agent Visualizer Console**: Displays an animated SVG node-mesh and terminal logs, showing real-time background collaborations of the active agent models.
3. **Resume Analyzer & Keyword Heatmaps**: Evaluates resume text against target company benchmarks, reporting keyword densities, missing terms, and structural advice.
4. **Skill Gap Auditing**: Compares user capabilities against target roles using a polar **Recharts Radar Chart**, prioritizing missing proficiencies.
5. **Confetti study Roadmaps**: Generates custom schedules. Toggling weekly tasks advances progress meters and triggers celebratory confetti showers on milestones.
6. **STAR Mock Interview Simulator**: Features a mock interview panel. Evaluates answers locally for **free** using a custom Python heuristic parser that flags STAR components (Situation, Task, Action, Result) and highlights suggestions.
7. **ReportLab PDF Exporter**: Builds letter-sized cover letters and outreach templates using custom document styles and Helvetica fonts, downloadable directly from the workspace.
8. **Kanban Internship Tracker**: A workflow board divided into *Recommended, Applied, Interviewing, Offered, and Rejected* columns. Action arrows animate cards across columns.
9. **Streaming Chat Assistant Widget**: A floating chat widget providing prompt suggestions and streaming guidance.

---

## 🛠️ Installation & Run Instructions

Follow these steps to run the servers locally:

### 1. Backend API Gateway
Navigate to the `backend` folder, set up a virtual environment, install requirements, and run FastAPI:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```
*Note*: The API will start on `http://localhost:8000`. By default, it initializes a local SQLite database (`careerpilot.db`) and uses the mock engine, so you can test all features offline and free of cost.

### 2. Frontend Application
Open a new console window, navigate to the `frontend` folder, install dependencies, and launch Vite:

```powershell
cd frontend
npm install
npm run dev
```
*Note*: The Vite app will open at [http://localhost:5173](http://localhost:5173).

---

## 🌐 Production Deployment Architecture

This diagram illustrates the cloud topology when migrating CareerPilot AI from the local environment to enterprise-grade serverless hosts:

```
                 Internet
                       │
        ┌──────────────┴──────────────┐
        │                             │
   Frontend (Vercel)            Backend (Render)
        │                             │
        └──────────────┬──────────────┘
                       │
              PostgreSQL Database
                (Neon or Supabase)
                       │
                 FAISS / Local Storage
                       │
                OpenAI / Gemini /
              IBM watsonx.ai APIs
```

### 1. Frontend (Vercel Hosting)
* **Build Configuration**: Set build directory to `frontend/dist` and build command to `npm run build`.
* **Environment Configuration**: Set `VITE_API_URL` to point to your backend API gateway on Render (e.g., `https://careerpilot-backend.onrender.com/api/v1`).

### 2. Backend (Render Hosting)
* **Build Command**: `pip install -r requirements.txt` (Ensure the `psycopg2-binary` package is registered in `requirements.txt` to enable PostgreSQL drivers).
* **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT` (Start from the `/backend` working directory).
* **Environment Variables**:
  * `DATABASE_URL`: Your PostgreSQL connection string from Neon or Supabase (e.g., `postgresql://user:pass@ep-flat-water-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`).
  * `SECRET_KEY`: Random 64-character JWT secret.
  * `AI_PROVIDER`: Choose your active API provider (`gemini`, `openai`, `watsonx`, or `mock` for local heuristic execution).

### 3. PostgreSQL Database (Neon or Supabase)
* Fully relational cloud storage setup. The backend FastAPI application automatically auto-generates tables and configures relational models on server launch.

---

## 📝 Creator Credentials & Copyright

* **Creator**: Kunal Chauhan
* **Project**: CareerPilot AI (Enterprise Edition)
* **Scope**: IBM Placement Copilot & Agentic Portal Mockup
* **License**: Copyright (c) 2026 Kunal Chauhan. All rights reserved. Unauthorized reproduction or distribution is strictly prohibited.
