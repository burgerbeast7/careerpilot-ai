from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentResponse
from app.services.ai_factory import AIFactory

# ReportLab imports for structured PDF layout
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/documents", tags=["documents"])

def build_pdf_file(text: str, filepath: str, title: str):
    """
    Helper to compile text into a letter-sized PDF with standard margins,
    word-wrapping, typography leading, and brand headers.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    doc = SimpleDocTemplate(
        filepath, 
        pagesize=letter,
        rightMargin=54, 
        leftMargin=54,
        topMargin=54, 
        bottomMargin=54
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom heading style matching IBM colors
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f62fe'),
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#222222'),
        spaceAfter=8
    )

    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 10))
    
    # Split text into paragraphs and wrap
    paragraphs = text.split('\n')
    for p in paragraphs:
        clean_p = p.strip()
        if clean_p:
            story.append(Paragraph(clean_p, body_style))
        else:
            story.append(Spacer(1, 6))
            
    doc.build(story)

@router.post("/generate", response_model=DocumentResponse)
async def generate_document(
    request_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers the Doc Generator Agent to create a cover letter, tailored resume text,
    or cold outreach. Compiles a PDF and saves the record in PostgreSQL.
    """
    # 1. Ask AI to generate tailored text content
    prompt = f"""
    Build a tailored {request_in.doc_type} titled '{request_in.title}'.
    Target Role: {current_user.target_role or "Software Engineer"}
    Target Company: {current_user.target_company or "IBM"}
    User Name: {current_user.full_name}
    
    Write the body contents clearly and professionally.
    Content details:
    {request_in.content_text}
    """
    
    raw_doc = await AIFactory.generate_text(prompt, "You are a professional Resume and Cover Letter writer Agent.")
    
    # 2. Build local PDF path
    filename = f"doc_{current_user.id}_{int(os.urandom(4).hex(), 16)}.pdf"
    pdf_dir = os.path.join(os.getcwd(), "uploads", "documents")
    pdf_path = os.path.join(pdf_dir, filename)
    
    # Build the PDF file
    try:
        build_pdf_file(raw_doc, pdf_path, request_in.title)
        relative_pdf_path = f"uploads/documents/{filename}"
    except Exception as e:
        print(f"PDF creation error: {e}")
        relative_pdf_path = None

    # 3. Create document record
    db_doc = Document(
        user_id=current_user.id,
        doc_type=request_in.doc_type,
        title=request_in.title,
        content_text=raw_doc,
        pdf_path=relative_pdf_path
    )
    
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    return db_doc

@router.get("/list", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all documents generated for the user.
    """
    docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).all()
    return docs

@router.get("/download/{doc_id}")
def download_pdf(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Serves the compiled PDF document file download.
    """
    doc_entry = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc_entry or not doc_entry.pdf_path:
        raise HTTPException(status_code=404, detail="PDF file not found or not compiled.")
        
    full_path = os.path.join(os.getcwd(), doc_entry.pdf_path)
    if not os.path.exists(full_path):
         raise HTTPException(status_code=404, detail="Compiled PDF file does not exist on disk.")
         
    return FileResponse(
        path=full_path,
        filename=f"{doc_entry.title.replace(' ', '_')}.pdf",
        media_type="application/pdf"
    )
