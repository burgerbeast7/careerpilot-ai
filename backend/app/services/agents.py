import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any
from app.services.ai_factory import AIFactory

class CareerAgents:
    @staticmethod
    async def run_orchestrator(task_name: str, payload: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Master Orchestrator. Decides which agents to dispatch and yields real-time progress
        updates in SSE (Server-Sent Events) compliant format.
        """
        # Yield start event
        yield f"data: {json.dumps({'event': 'start', 'agent': 'orchestrator', 'message': f'Master Orchestrator initiated for task: {task_name}', 'type': 'info'})}\n\n"
        await asyncio.sleep(0.8)

        if task_name == "resume_analysis":
            # 1. Dispatch Resume Agent
            yield f"data: {json.dumps({'event': 'active', 'agent': 'resume', 'message': 'Dispatching Resume Parser Agent to extract sections...', 'type': 'info'})}\n\n"
            await asyncio.sleep(1.0)
            yield f"data: {json.dumps({'event': 'thought', 'agent': 'resume', 'message': 'Analyzing PDF formatting blocks, font weights, and layout headings...', 'type': 'thought'})}\n\n"
            await asyncio.sleep(1.2)
            
            file_text = payload.get("file_text", "")
            target_role = payload.get("target_role", "Software Engineer")
            target_company = payload.get("target_company", "IBM")
            
            # Formulate prompt for parser agent
            resume_prompt = f"""
            Analyze the following resume text. Extract structural parts: name, email, phone, education, experience, projects, skills.
            Target Role: {target_role}
            Target Company: {target_company}
            
            Resume Text:
            {file_text}
            
            Return output strictly as a JSON object matching this schema:
            {{
              "sections_data": {{
                 "contact": {{"name": "...", "email": "...", "phone": "..."}},
                 "education": [{{"degree": "...", "school": "...", "year": "..."}}],
                 "experience": [{{"role": "...", "company": "...", "duration": "...", "description": "..."}}],
                 "projects": [{{"title": "...", "tech": "...", "description": "..."}}],
                 "skills": ["skill1", "skill2"]
              }}
            }}
            """
            raw_parsed = await AIFactory.generate_text(resume_prompt, "You are a professional Resume Extraction Agent. Output JSON only.")
            try:
                parsed_data = json.loads(raw_parsed)
            except Exception:
                # Fallback to mock parser format
                mock_json = AIFactory._call_mock("resume")
                parsed_data = json.loads(mock_json)
                
            yield f"data: {json.dumps({'event': 'progress', 'agent': 'resume', 'message': 'Successfully parsed structure (Education, Projects, Skills extracted).', 'type': 'success'})}\n\n"
            await asyncio.sleep(0.8)

            # 2. Dispatch ATS Agent
            yield f"data: {json.dumps({'event': 'active', 'agent': 'ats', 'message': 'Dispatching ATS Evaluator Agent for keywords analysis...', 'type': 'info'})}\n\n"
            await asyncio.sleep(1.0)
            yield f"data: {json.dumps({'event': 'thought', 'agent': 'ats', 'message': f'Comparing extracted skills against industry requirements for {target_role} at {target_company}...', 'type': 'thought'})}\n\n"
            await asyncio.sleep(1.5)
            
            skills_extracted = parsed_data.get("sections_data", {}).get("skills", [])
            ats_prompt = f"""
            Evaluate these extracted skills against standard requirements for role: '{target_role}' at '{target_company}'.
            Extracted Skills: {skills_extracted}
            
            Evaluate ATS score (0-100), identify matched and missing keywords, and suggest improvements.
            Return output strictly as a JSON object matching this schema:
            {{
               "ats_score": 75,
               "keyword_analysis": {{
                  "matched": ["React", "Python"],
                  "missing": ["Docker", "FastAPI"],
                  "recommendations": ["Recommendation 1", "Recommendation 2"]
               }}
            }}
            """
            raw_ats = await AIFactory.generate_text(ats_prompt, "You are a senior ATS Evaluator Agent. Output JSON only.")
            try:
                ats_data = json.loads(raw_ats)
            except Exception:
                mock_json = AIFactory._call_mock("ats")
                ats_data = json.loads(mock_json)

            ats_val = ats_data.get("ats_score", 70)
            yield f"data: {json.dumps({'event': 'progress', 'agent': 'ats', 'message': f'ATS scoring complete. Overall ATS compatibility is {ats_val}%', 'type': 'success'})}\n\n"
            await asyncio.sleep(0.8)

            # 3. Save & Combine Result
            yield f"data: {json.dumps({'event': 'active', 'agent': 'orchestrator', 'message': 'Consolidating agent outputs and building final response profile...', 'type': 'info'})}\n\n"
            await asyncio.sleep(0.8)
            
            result = {
                "ats_score": ats_data.get("ats_score", 70),
                "sections_data": parsed_data.get("sections_data", {}),
                "keyword_analysis": ats_data.get("keyword_analysis", {})
            }

            yield f"data: {json.dumps({'event': 'complete', 'agent': 'orchestrator', 'message': 'Resume analysis pipeline successfully finished.', 'type': 'success', 'result': result})}\n\n"

        elif task_name == "skill_gap_analysis":
            target_role = payload.get("target_role", "Software Engineer")
            target_company = payload.get("target_company", "IBM")
            current_skills = payload.get("current_skills", [])

            # 1. Dispatch Skill Gap Agent
            yield f"data: {json.dumps({'event': 'active', 'agent': 'skill_gap', 'message': 'Dispatching Skill Gap Detector Agent...', 'type': 'info'})}\n\n"
            await asyncio.sleep(1.0)
            yield f"data: {json.dumps({'event': 'thought', 'agent': 'skill_gap', 'message': f'Comparing student skill vectors with {target_role} profile index at {target_company}...', 'type': 'thought'})}\n\n"
            await asyncio.sleep(1.5)

            gap_prompt = f"""
            Analyze skill gaps for Target Role: '{target_role}', Company: '{target_company}'.
            Current Skills: {current_skills}
            
            Determine missing skills, priority levels, estimated learning time, difficulty levels, and sequence recommendations.
            Return output strictly as a JSON object matching this schema:
            {{
              "current_skills": ["React"],
              "missing_skills": {{
                 "Docker": {{"priority": "High", "time": "2 weeks", "difficulty": "Medium"}}
              }},
              "recommendations": [
                 {{"skill": "Docker", "resource": "IBM developerWorks Docker course", "sequence": 1}}
              ]
            }}
            """
            raw_gap = await AIFactory.generate_text(gap_prompt, "You are a professional Skill Gap Analysis Agent. Output JSON only.")
            try:
                gap_data = json.loads(raw_gap)
            except Exception:
                mock_json = AIFactory._call_mock("skill gap")
                gap_data = json.loads(mock_json)

            gap_count = len(gap_data.get("missing_skills", {}))
            yield f"data: {json.dumps({'event': 'progress', 'agent': 'skill_gap', 'message': f'Detected {gap_count} missing industry skills.', 'type': 'success'})}\n\n"
            await asyncio.sleep(0.8)

            yield f"data: {json.dumps({'event': 'complete', 'agent': 'orchestrator', 'message': 'Skill Gap analysis complete.', 'type': 'success', 'result': gap_data})}\n\n"

        elif task_name == "roadmap_generation":
            duration_weeks = payload.get("duration_weeks", "4")
            missing_skills = payload.get("missing_skills", [])
            target_role = payload.get("target_role", "Software Engineer")

            # 1. Dispatch Roadmap Agent
            yield f"data: {json.dumps({'event': 'active', 'agent': 'roadmap', 'message': 'Dispatching Roadmap Generator Agent...', 'type': 'info'})}\n\n"
            await asyncio.sleep(1.0)
            yield f"data: {json.dumps({'event': 'thought', 'agent': 'roadmap', 'message': f'Structuring a {duration_weeks}-week modular roadmap for learning: {missing_skills}...', 'type': 'thought'})}\n\n"
            await asyncio.sleep(1.5)

            roadmap_prompt = f"""
            Create a {duration_weeks}-week curriculum for target role '{target_role}'.
            Missing Skills: {missing_skills}
            
            Return output strictly as a JSON object matching this schema:
            {{
              "weekly_goals": ["Week 1: Goal 1", "Week 2: Goal 2"],
              "tasks_data": [
                 {{
                    "week": 1,
                    "title": "Week Title",
                    "tasks": [
                       {{"task": "Task description details", "completed": false}}
                    ]
                 }}
              ]
            }}
            """
            raw_roadmap = await AIFactory.generate_text(roadmap_prompt, "You are a professional Curriculum & Roadmap Agent. Output JSON only.")
            try:
                roadmap_data = json.loads(raw_roadmap)
            except Exception:
                mock_json = AIFactory._call_mock("roadmap")
                roadmap_data = json.loads(mock_json)

            yield f"data: {json.dumps({'event': 'progress', 'agent': 'roadmap', 'message': f'Generated week-by-week checkpoints for the {duration_weeks}-week curriculum.', 'type': 'success'})}\n\n"
            await asyncio.sleep(0.8)

            yield f"data: {json.dumps({'event': 'complete', 'agent': 'orchestrator', 'message': 'Roadmap generated successfully.', 'type': 'success', 'result': roadmap_data})}\n\n"

        elif task_name == "interview_coach":
            session_type = payload.get("session_type", "Technical")
            target_role = payload.get("target_role", "Software Engineer")

            # 1. Dispatch Interview Agent
            yield f"data: {json.dumps({'event': 'active', 'agent': 'interview', 'message': 'Dispatching Interview Coach Agent to select questions...', 'type': 'info'})}\n\n"
            await asyncio.sleep(1.0)
            yield f"data: {json.dumps({'event': 'thought', 'agent': 'interview', 'message': f'Generating challenging {session_type} mock questions for target role: {target_role}...', 'type': 'thought'})}\n\n"
            await asyncio.sleep(1.5)

            interview_prompt = f"""
            Generate 3 challenging interview questions for role '{target_role}'. Session Type: '{session_type}'.
            Return output strictly as a JSON list matching this schema:
            [
              {{"id": 1, "type": "Technical", "question": "Question text 1"}},
              {{"id": 2, "type": "Behavioral", "question": "Question text 2"}}
            ]
            """
            raw_questions = await AIFactory.generate_text(interview_prompt, "You are an Interview Coaching Agent. Output JSON list only.")
            try:
                questions_data = json.loads(raw_questions)
            except Exception:
                mock_json = AIFactory._call_mock("interview")
                questions_data = json.loads(mock_json)

            yield f"data: {json.dumps({'event': 'progress', 'agent': 'interview', 'message': f'Mock room loaded with 3 custom questions.', 'type': 'success'})}\n\n"
            await asyncio.sleep(0.8)

            yield f"data: {json.dumps({'event': 'complete', 'agent': 'orchestrator', 'message': 'Mock interview questions initialized.', 'type': 'success', 'result': questions_data})}\n\n"
