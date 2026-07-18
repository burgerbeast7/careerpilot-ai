import os
import json
import logging
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger("careerpilot.ai_factory")

class AIFactory:
    @staticmethod
    def get_provider():
        provider = settings.AI_PROVIDER.lower()
        if provider == "openai" and not settings.OPENAI_API_KEY:
            logger.warning("OpenAI provider selected but OPENAI_API_KEY is not set. Falling back to Mock.")
            return "mock"
        if provider == "gemini" and not settings.GEMINI_API_KEY:
            logger.warning("Gemini provider selected but GEMINI_API_KEY is not set. Falling back to Mock.")
            return "mock"
        if provider == "watsonx" and not settings.WATSONX_API_KEY:
            logger.warning("Watsonx provider selected but WATSONX_API_KEY is not set. Falling back to Mock.")
            return "mock"
        if provider == "groq" and not settings.GROQ_API_KEY:
            logger.warning("Groq provider selected but GROQ_API_KEY is not set. Falling back to Mock.")
            return "mock"
        return provider

    @classmethod
    async def generate_text(cls, prompt: str, system_prompt: Optional[str] = None) -> str:
        provider = cls.get_provider()
        
        if provider == "openai":
            return await cls._call_openai(prompt, system_prompt)
        elif provider == "gemini":
            return await cls._call_gemini(prompt, system_prompt)
        elif provider == "watsonx":
            return await cls._call_watsonx(prompt, system_prompt)
        elif provider == "groq":
            return await cls._call_groq(prompt, system_prompt)
        else:
            return cls._call_mock(prompt)

    @classmethod
    async def _call_openai(cls, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.2
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI call failed: {e}. Falling back to Mock.")
            return cls._call_mock(prompt)

    @classmethod
    async def _call_gemini(cls, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            model_name = "gemini-1.5-flash"
            
            contents = []
            if system_prompt:
                contents.append(system_prompt)
            contents.append(prompt)

            model = genai.GenerativeModel(model_name)
            # Run in executor to avoid blocking async event loop (since genai is synchronous)
            import anyio
            response = await anyio.to_thread.run_sync(
                lambda: model.generate_content(contents)
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini call failed: {e}. Falling back to Mock.")
            return cls._call_mock(prompt)

    @classmethod
    async def _call_watsonx(cls, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            # We utilize the standard ibm-watsonx-ai package or REST requests
            # Standard IBM Cloud API Call via requests is highly reliable and doesn't depend on heavy SDK installation issues.
            import requests
            
            # 1. Obtain Token
            token_url = "https://iam.cloud.ibm.com/identity/token"
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            data = {
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": settings.WATSONX_API_KEY
            }
            token_response = requests.post(token_url, headers=headers, data=data, timeout=10)
            token = token_response.json()["access_token"]
            
            # 2. Call Generation endpoint
            generate_url = f"{settings.WATSONX_URL}/ml/v4/deployments/generation?version=2020-09-01"
            if settings.WATSONX_PROJECT_ID:
                generate_url = f"{settings.WATSONX_URL}/ml/v1/text/generation?version=2023-05-29"
                
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            }
            
            # Combine prompts
            full_prompt = f"{system_prompt}\n\nUser: {prompt}" if system_prompt else prompt
            
            payload = {
                "model_id": "meta-llama/llama-3-70b-instruct",
                "input": full_prompt,
                "parameters": {
                    "decoding_method": "greedy",
                    "max_new_tokens": 1500,
                    "min_new_tokens": 1,
                    "stop_sequences": [],
                    "repetition_penalty": 1
                }
            }
            if settings.WATSONX_PROJECT_ID:
                payload["project_id"] = settings.WATSONX_PROJECT_ID
                
            res = requests.post(generate_url, headers=headers, json=payload, timeout=30)
            if res.status_code == 200:
                result_data = res.json()
                return result_data["results"][0]["generated_text"]
            else:
                logger.error(f"WatsonX HTTP error: {res.text}")
                raise Exception("Watsonx rejected request")
        except Exception as e:
            logger.error(f"WatsonX API call failed: {e}. Falling back to Mock.")
            return cls._call_mock(prompt)

    @classmethod
    async def _call_groq(cls, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            import requests
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": "llama3-70b-8192",
                "messages": messages,
                "temperature": 0.2
            }
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Groq API returned status {res.status_code}")
        except Exception as e:
            logger.error(f"Groq API call failed: {e}. Falling back to Mock.")
            return cls._call_mock(prompt)

    @classmethod
    def _call_mock(cls, prompt: str) -> str:
        # Generates realistic mock JSON/text depending on prompt contents to keep backend testable
        prompt_lower = prompt.lower()
        
        # 1. Resume / ATS parse mock
        if "resume" in prompt_lower or "ats" in prompt_lower:
            return json.dumps({
                "ats_score": 78,
                "sections_data": {
                    "contact": {"email": "kunal@gmail.com", "phone": "+91-9876543210", "name": "Kunal Sen"},
                    "education": [{"degree": "B.Tech in Computer Science", "school": "IIT Kharagpur", "year": "2026"}],
                    "experience": [
                        {"role": "Frontend Intern", "company": "IBM Tech", "duration": "3 months", "description": "Developed React pages and worked on internal UI dashboards."}
                    ],
                    "projects": [
                        {"title": "E-Commerce App", "tech": "React, Node, SQLite", "description": "Built an online store with product checkout and responsive layouts."}
                    ],
                    "skills": ["JavaScript", "TypeScript", "React", "HTML5", "CSS3", "Node.js", "Git", "Python"]
                },
                "keyword_analysis": {
                    "matched": ["React", "JavaScript", "TypeScript", "HTML5", "Git", "Python"],
                    "missing": ["Docker", "Kubernetes", "PostgreSQL", "CI/CD Pipelines", "FastAPI"],
                    "recommendations": [
                        "Incorporate impact metrics (e.g., 'Improved loading speed by 25%').",
                        "Add projects featuring Docker and SQL backend configuration.",
                        "Rephrase project lines to use active verbs like 'Architected' or 'Pioneered'."
                    ]
                }
            })
            
        # 2. Skill Gap Mock
        elif "skill gap" in prompt_lower or "missing" in prompt_lower:
            return json.dumps({
                "current_skills": ["React", "JavaScript", "TypeScript", "Python"],
                "missing_skills": {
                    "Docker": {"priority": "High", "time": "2 weeks", "difficulty": "Medium"},
                    "PostgreSQL": {"priority": "High", "time": "1.5 weeks", "difficulty": "Medium"},
                    "FastAPI": {"priority": "Medium", "time": "1 week", "difficulty": "Easy"},
                    "Kubernetes": {"priority": "Low", "time": "3 weeks", "difficulty": "Hard"}
                },
                "recommendations": [
                    {"skill": "Docker", "resource": "Docker Containerization Fundamentals on IBM developerWorks", "sequence": 1},
                    {"skill": "PostgreSQL", "resource": "Intro to Relational Databases on Coursera", "sequence": 2},
                    {"skill": "FastAPI", "resource": "FastAPI Official Documentation Tutorials", "sequence": 3}
                ]
            })
            
        # 3. Roadmap Mock
        elif "roadmap" in prompt_lower or "duration" in prompt_lower:
            return json.dumps({
                "weekly_goals": [
                    "Week 1: Mastering Containerization with Docker",
                    "Week 2: Advanced SQL & Database Integration with PostgreSQL",
                    "Week 3: Backend REST APIs with FastAPI & SQLAlchemy",
                    "Week 4: Project Capstone Integration & Deployment"
                ],
                "tasks_data": [
                    {
                        "week": 1,
                        "title": "Mastering Containerization",
                        "tasks": [
                            {"task": "Understand Dockerfile structures and build custom images", "completed": False},
                            {"task": "Run multi-container apps with Docker Compose", "completed": False},
                            {"task": "Practice caching dependencies inside layers", "completed": False}
                        ]
                    },
                    {
                        "week": 2,
                        "title": "Advanced SQL & Database",
                        "tasks": [
                            {"task": "Study indices, relational constraints and normalization rules", "completed": False},
                            {"task": "Set up PostgreSQL locally and practice migration scripts", "completed": False}
                        ]
                    },
                    {
                        "week": 3,
                        "title": "REST APIs with FastAPI",
                        "tasks": [
                            {"task": "Build async CRUD endpoints and validation layers", "completed": False},
                            {"task": "Set up SQLAlchemy repositories and database session lifecycles", "completed": False}
                        ]
                    },
                    {
                        "week": 4,
                        "title": "Deployment & Capstone",
                        "tasks": [
                            {"task": "Combine React frontend and FastAPI backend inside compose", "completed": False},
                            {"task": "Write basic unit tests using Pytest", "completed": False}
                        ]
                    }
                ]
            })
            
        # 4. Interview Mock
        elif "interview" in prompt_lower or "star" in prompt_lower or "question" in prompt_lower:
            # Check if this is an answer grading prompt or a question generation prompt
            if "answer" in prompt_lower or "evaluate" in prompt_lower:
                # Local heuristic STAR evaluator (100% free, no key required)
                user_ans = ""
                try:
                    if "User's Answer:" in prompt:
                        user_ans = prompt.split("User's Answer:")[1].strip()
                        if "Evaluate" in user_ans:
                            user_ans = user_ans.split("Evaluate")[0].strip()
                except Exception:
                    pass

                word_count = len(user_ans.split())
                if word_count < 6 or len(user_ans) < 15:
                    return json.dumps({
                        "score": 2.5,
                        "accuracy": 25.0,
                        "confidence": 15.0,
                        "communication": 30.0,
                        "feedback": {
                            "situation": "Insufficient text provided to establish background context.",
                            "task": "No target responsibilities or core challenges identified.",
                            "action": "No technical implementations or active steps described.",
                            "result": "No output metrics or final improvements reported.",
                            "improvements": "Your response is too short or lacks structural detail. Draft a complete answer containing at least 2 sentences explaining your background, task, action, and resulting metrics."
                        }
                    })

                # Simple keyword checking
                has_s = any(w in user_ans.lower() for w in ["i was", "my team", "project", "when", "at", "during", "faced", "problem", "issue", "lag"])
                has_t = any(w in user_ans.lower() for w in ["task", "needed to", "had to", "responsibility", "assigned", "goal", "target"])
                has_a = any(w in user_ans.lower() for w in ["implemented", "wrote", "built", "created", "resolved", "pioneered", "designed", "used", "refactored", "optimized"])
                has_r = any(w in user_ans.lower() for w in ["resulting in", "improved", "increased", "reduced", "saved", "%", "ms", "seconds", "hours", "faster"])

                score = 3.5
                accuracy = 40.0
                confidence = 40.0
                communication = 40.0

                situation_text = "Clearly stated the scenario." if has_s else "A background scenario was partially mentioned, but lacks situational context (e.g. project setting or problem details)."
                task_text = "Identified the core target challenge." if has_t else "Specify the exact goals or expectations assigned to you."
                action_text = "Described active technical steps." if has_a else "Include concrete verbs describing your technical solution."
                result_text = "Highlighted final improvements or metrics." if has_r else "State the final impact, preferably with numerical metrics."

                if has_s:
                    score += 1.5; accuracy += 15.0; confidence += 10.0
                if has_t:
                    score += 1.5; accuracy += 15.0; communication += 10.0
                if has_a:
                    score += 1.5; confidence += 20.0; communication += 20.0
                if has_r:
                    score += 1.5; accuracy += 15.0; communication += 15.0

                score = min(9.5, score)
                accuracy = min(100.0, accuracy)
                confidence = min(100.0, confidence)
                communication = min(100.0, communication)

                improvements = []
                if not has_s: improvements.append("Start with context describing the project and the problem.")
                if not has_t: improvements.append("Explain what you were responsible for resolving.")
                if not has_a: improvements.append("Use active verbs (e.g., 'Architected', 'Refactored') to detail your solution.")
                if not has_r: improvements.append("Add numeric results or percentages showing the outcome of your actions.")

                if not improvements:
                    improvements_text = "Excellent structure! Try to quantify details by mentioning how you coordinated with team members."
                else:
                    improvements_text = " ".join(improvements)

                return json.dumps({
                    "score": round(score, 1),
                    "accuracy": round(accuracy, 1),
                    "confidence": round(confidence, 1),
                    "communication": round(communication, 1),
                    "feedback": {
                        "situation": situation_text,
                        "task": task_text,
                        "action": action_text,
                        "result": result_text,
                        "improvements": improvements_text
                    }
                })
            else:
                return json.dumps([
                    {"id": 1, "type": "Technical", "question": "Explain the difference between useMemo and useCallback. When does it improve performance?"},
                    {"id": 2, "type": "Behavioral", "question": "Describe a situation where you had a conflict with a teammate on design choice. How did you resolve it?"},
                    {"id": 3, "type": "Technical", "question": "How does asynchronous execution work in FastAPI, and when should you use 'async def' vs standard 'def'?"}
                ])
                
        # 5. Document generator / cover letter Mock
        elif "cover letter" in prompt_lower or "cold email" in prompt_lower:
            return "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Software Engineer position at IBM. As a student specializing in full-stack engineering with experience in React and Python, I am eager to contribute to your Cloud integration team.\n\nThroughout my projects, I have developed responsive user dashboards and scaled RESTful backends. Integrating robust data pipelines matches my background in optimization, and I am excited about the opportunity to work alongside research scientists at IBM.\n\nThank you for your consideration.\n\nSincerely,\nKunal Sen"

        # 6. Default Fallback
        return "CareerPilot AI Orchestration completed successfully. The agent has compiled the context."
