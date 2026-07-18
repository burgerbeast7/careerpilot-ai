from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.interview import Interview
from app.models.recommendation import Recommendation
from app.schemas.interview import InterviewStartRequest, InterviewAnswerRequest
from app.services.agents import CareerAgents
from app.services.ai_factory import AIFactory

router = APIRouter(prefix="/interview", tags=["interview"])

@router.post("/start")
async def start_interview(
    request_in: InterviewStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Spawns an Interview Coach Agent stream. Generates questions and saves
    the active session in PostgreSQL on stream completion.
    """
    target_role = current_user.target_role or "Software Engineer"
    target_company = current_user.target_company or "IBM"
    job_desc = ""

    if request_in.recommendation_id:
        rec = db.query(Recommendation).filter(
            Recommendation.id == request_in.recommendation_id, 
            Recommendation.user_id == current_user.id
        ).first()
        if rec:
            target_role = rec.job_title
            target_company = rec.company
            job_desc = rec.job_description or ""

    # Custom SSE generator to update the DB on pipeline completion
    async def sse_generator():
        async for message in CareerAgents.run_orchestrator("interview_coach", {
            "session_type": request_in.session_type,
            "target_role": target_role,
            "target_company": target_company,
            "job_description": job_desc
        }):
            if "complete" in message:
                clean_msg = message.replace("data: ", "").strip()
                try:
                    payload = json.loads(clean_msg)
                    if payload.get("event") == "complete":
                        questions = payload.get("result", [])
                        
                        # Format question answer placeholders
                        qa_list = []
                        for q in questions:
                            qa_list.append({
                                "id": q.get("id"),
                                "type": q.get("type"),
                                "question": q.get("question"),
                                "user_answer": None,
                                "feedback": None,
                                "score": 0.0
                            })
                        
                        # Create and save Interview record
                        db_interview = Interview(
                            user_id=current_user.id,
                            session_type=request_in.session_type,
                            question_answers=json.dumps(qa_list),
                            overall_score=0.0,
                            performance_metrics=json.dumps({
                                "accuracy": 0.0,
                                "confidence": 0.0,
                                "communication": 0.0
                            })
                        )
                        db.add(db_interview)
                        db.commit()
                except Exception as e:
                    print(f"Error creating interview: {e}")
            yield message
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@router.get("/latest")
def get_latest_interview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the latest mock interview session for the user.
    """
    interview = db.query(Interview).filter(Interview.user_id == current_user.id).order_by(Interview.created_at.desc()).first()
    if not interview:
        raise HTTPException(status_code=404, detail="No mock interview session found.")
        
    qa = json.loads(interview.question_answers) if isinstance(interview.question_answers, str) else interview.question_answers
    metrics = json.loads(interview.performance_metrics) if isinstance(interview.performance_metrics, str) else interview.performance_metrics

    return {
        "id": interview.id,
        "user_id": interview.user_id,
        "session_type": interview.session_type,
        "question_answers": qa,
        "overall_score": interview.overall_score,
        "performance_metrics": metrics,
        "created_at": interview.created_at
    }

@router.post("/submit-answer")
async def submit_answer(
    payload: InterviewAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates a user response against accuracy, confidence, communication,
    and STAR criteria, returning detailed critique.
    """
    interview = db.query(Interview).filter(Interview.user_id == current_user.id).order_by(Interview.created_at.desc()).first()
    if not interview:
        raise HTTPException(status_code=404, detail="No active interview session found.")
        
    qa = json.loads(interview.question_answers) if isinstance(interview.question_answers, str) else interview.question_answers
    
    if payload.question_index < 0 or payload.question_index >= len(qa):
        raise HTTPException(status_code=400, detail="Invalid question index.")
        
    target_q = qa[payload.question_index]
    
    # 1. Ask AI to grade the response
    grading_prompt = f"""
    Evaluate the user's answer to the following interview question.
    Question: {target_q.get("question")}
    User's Answer: {payload.user_answer}
    
    Evaluate the response out of 10. Assess accuracy, confidence (eliminating filler words), and communication clarity. Provide feedback detailing Situation, Task, Action, and Result (STAR framework) and list improvements.
    Return output strictly as a JSON object matching this schema:
    {{
       "score": 8.5,
       "accuracy": 85.0,
       "confidence": 90.0,
       "communication": 80.0,
       "feedback": {{
          "situation": "...",
          "task": "...",
          "action": "...",
          "result": "...",
          "improvements": "..."
       }}
    }}
    """
    
    raw_eval = await AIFactory.generate_text(grading_prompt, "You are a professional Interview Evaluator Agent. Output JSON only.")
    try:
        eval_data = json.loads(raw_eval)
    except Exception:
        # Fallback to mock evaluator
        mock_json = AIFactory._call_mock("interview evaluate")
        eval_data = json.loads(mock_json)

    # 2. Update target QA entry
    target_q["user_answer"] = payload.user_answer
    target_q["feedback"] = eval_data.get("feedback")
    target_q["score"] = eval_data.get("score", 7.0)
    
    # 3. Re-calculate metrics
    total_score = 0.0
    graded_count = 0
    total_acc, total_conf, total_comm = 0.0, 0.0, 0.0
    
    for q in qa:
        if q.get("user_answer") is not None:
            total_score += q.get("score", 0.0)
            graded_count += 1
            
    overall_score = (total_score / graded_count) if graded_count > 0 else 0.0
    
    # Update performance metrics with latest question grading
    perf_metrics = {
        "accuracy": eval_data.get("accuracy", 70.0),
        "confidence": eval_data.get("confidence", 70.0),
        "communication": eval_data.get("communication", 70.0)
    }

    interview.question_answers = json.dumps(qa)
    interview.overall_score = round(overall_score, 1)
    interview.performance_metrics = json.dumps(perf_metrics)
    
    db.add(interview)
    db.commit()
    db.refresh(interview)
    
    return {
        "overall_score": interview.overall_score,
        "performance_metrics": perf_metrics,
        "question_answers": qa
    }
