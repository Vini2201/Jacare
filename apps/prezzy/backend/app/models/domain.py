from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BrandKitModel(BaseModel):
    name: str
    primary_color: str = "#000000"
    secondary_color: str = "#ffffff"
    font_family: str = "Inter"

class BriefingData(BaseModel):
    title: str = Field(description="The main title of the project")
    audience: str = Field(description="Target audience of the document")
    tone: str = Field(description="Tone of voice (e.g., professional, casual)")
    objectives: List[str] = Field(description="Main objectives to cover")

class SlideContent(BaseModel):
    headline: str
    body_text: str
    image_prompt: Optional[str] = None
    layout_type: str = "text_image_split"

class PresentationDraft(BaseModel):
    title: str
    slides: List[SlideContent]
    
class EbookChapter(BaseModel):
    chapter_title: str
    content: str
    image_prompt: Optional[str] = None

class EbookDraft(BaseModel):
    title: str
    chapters: List[EbookChapter]
