import io
import logging
from pypdf import PdfReader
from docx import Document

logger = logging.getLogger("careerpilot.parser")

class FileParser:
    @staticmethod
    def parse_pdf(file_bytes: bytes) -> str:
        """
        Parses PDF file bytes and extracts all text.
        """
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            extracted_text = []
            
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text = page.extract_text()
                if text:
                    extracted_text.append(text)
                    
            return "\n".join(extracted_text).strip()
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise ValueError("Invalid PDF format or encoding.")

    @staticmethod
    def parse_docx(file_bytes: bytes) -> str:
        """
        Parses DOCX file bytes and extracts all text.
        """
        try:
            docx_file = io.BytesIO(file_bytes)
            doc = Document(docx_file)
            extracted_text = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text:
                    extracted_text.append(paragraph.text)
                    
            return "\n".join(extracted_text).strip()
        except Exception as e:
            logger.error(f"Error parsing DOCX: {e}")
            raise ValueError("Invalid DOCX format or encoding.")

    @classmethod
    def parse_file(cls, filename: str, file_bytes: bytes) -> str:
        """
        Detects file extension and extracts content.
        """
        ext = filename.split(".")[-1].lower()
        if ext == "pdf":
            return cls.parse_pdf(file_bytes)
        elif ext in ["docx", "doc"]:
            return cls.parse_docx(file_bytes)
        else:
            raise ValueError("Unsupported file format. Please upload PDF or DOCX.")
