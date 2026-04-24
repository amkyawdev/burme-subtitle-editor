#!/usr/bin/env python3
"""
Burme Subtitle Editor - Backend API
FastAPI application for subtitle processing and file generation
"""

import os
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="Burme Subtitle Editor API",
    description="Backend API for subtitle processing and SRT file generation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======================
# Data Models
# ======================

class Subtitle(BaseModel):
    """Subtitle model"""
    id: Optional[int] = None
    text: str
    start: int  # in milliseconds
    end: int    # in milliseconds
    fontSize: Optional[int] = 24
    fontFamily: Optional[str] = "Inter"
    textColor: Optional[str] = "#ffffff"
    bgColor: Optional[str] = "#000000"
    bgOpacity: Optional[int] = 50
    position: Optional[str] = "bottom"


class SubtitleProject(BaseModel):
    """Project model"""
    name: str
    video_filename: Optional[str] = None
    subtitles: List[Subtitle] = []


class SRTTime:
    """SRT time formatter"""
    
    @staticmethod
    def ms_to_srt_time(ms: int) -> str:
        """Convert milliseconds to SRT time format (00:00:00,000)"""
        hours = ms // 3600000
        minutes = (ms % 3600000) // 60000
        seconds = (ms % 60000) // 1000
        milliseconds = ms % 1000
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
    
    @staticmethod
    def srt_time_to_ms(time_str: str) -> int:
        """Convert SRT time format to milliseconds"""
        match = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', time_str)
        if not match:
            raise ValueError(f"Invalid time format: {time_str}")
        
        hours = int(match.group(1)) * 3600000
        minutes = int(match.group(2)) * 60000
        seconds = int(match.group(3)) * 1000
        milliseconds = int(match.group(4))
        
        return hours + minutes + seconds + milliseconds


# ======================
# API Routes
# ======================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Burme Subtitle Editor API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/subtitles/convert")
async def convert_srt_to_json(srt_content: str = Form(...)):
    """
    Convert SRT content to JSON format
    
    Args:
        srt_content: Raw SRT file content
        
    Returns:
        JSON response with parsed subtitles
    """
    try:
        subtitles = parse_srt(srt_content)
        return JSONResponse(content={
            "success": True,
            "subtitles": [sub.dict() for sub in subtitles]
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/subtitles/export")
async def export_to_srt(subtitles: List[Dict[str, Any]]):
    """
    Export subtitles to SRT format
    
    Args:
        subtitles: List of subtitle dictionaries
        
    Returns:
        SRT file content
    """
    try:
        srt_content = generate_srt(subtitles)
        return Response(
            content=srt_content,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=subtitles.srt"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/subtitles/validate")
async def validate_subtitles(subtitles: List[Dict[str, Any]]):
    """
    Validate subtitle list for timing conflicts and errors
    
    Args:
        subtitles: List of subtitle dictionaries
        
    Returns:
        Validation result
    """
    issues = []
    
    for i, sub in enumerate(subtitles):
        # Check empty text
        if not sub.get("text", "").strip():
            issues.append({
                "index": i,
                "type": "empty_text",
                "message": f"Subtitle {i + 1} has empty text"
            })
        
        # Check invalid timing
        start = sub.get("start", 0)
        end = sub.get("end", 0)
        
        if end <= start:
            issues.append({
                "index": i,
                "type": "invalid_timing",
                "message": f"Subtitle {i + 1}: end time must be after start time"
            })
        
        # Check negative values
        if start < 0 or end < 0:
            issues.append({
                "index": i,
                "type": "negative_time",
                "message": f"Subtitle {i + 1}: timing values cannot be negative"
            })
        
        # Check for overlaps with previous subtitle
        if i > 0:
            prev_sub = subtitles[i - 1]
            prev_end = prev_sub.get("end", 0)
            if start < prev_end:
                issues.append({
                    "index": i,
                    "type": "overlap",
                    "message": f"Subtitle {i + 1} overlaps with subtitle {i}"
                })
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "subtitle_count": len(subtitles)
    }


@app.post("/api/subtitles/shift")
async def shift_subtitles(subtitles: List[Dict[str, Any]], offset_ms: int = Form(...)):
    """
    Shift all subtitle timestamps by an offset
    
    Args:
        subtitles: List of subtitle dictionaries
        offset_ms: Milliseconds to shift (positive or negative)
        
    Returns:
        Shifted subtitles
    """
    shifted = []
    
    for sub in subtitles:
        new_sub = sub.copy()
        new_sub["start"] = max(0, sub.get("start", 0) + offset_ms)
        new_sub["end"] = max(0, sub.get("end", 0) + offset_ms)
        shifted.append(new_sub)
    
    # Sort by start time
    shifted.sort(key=lambda x: x["start"])
    
    return {
        "success": True,
        "offset_ms": offset_ms,
        "subtitles": shifted
    }


@app.post("/api/subtitles/scale")
async def scale_subtitles(subtitles: List[Dict[str, Any]], scale_factor: float = Form(1.0)):
    """
    Scale subtitle timings by a factor
    
    Args:
        subtitles: List of subtitle dictionaries
        scale_factor: Factor to scale timings (e.g., 1.5 for slower video)
        
    Returns:
        Scaled subtitles
    """
    scaled = []
    
    for sub in subtitles:
        new_sub = sub.copy()
        new_sub["start"] = int(sub.get("start", 0) * scale_factor)
        new_sub["end"] = int(sub.get("end", 0) * scale_factor)
        scaled.append(new_sub)
    
    # Sort by start time
    scaled.sort(key=lambda x: x["start"])
    
    return {
        "success": True,
        "scale_factor": scale_factor,
        "subtitles": scaled
    }


@app.post("/api/subtitles/merge")
async def merge_subtitles(
    subtitles1: List[Dict[str, Any]] = Form([]),
    subtitles2: List[Dict[str, Any]] = Form([]),
    offset2: int = Form(0)
):
    """
    Merge two subtitle tracks with optional offset
    
    Args:
        subtitles1: First subtitle track
        subtitles2: Second subtitle track
        offset2: Time offset in ms for second track
        
    Returns:
        Merged subtitles
    """
    merged = []
    
    # Add first track
    for sub in subtitles1:
        merged.append(sub.copy())
    
    # Add second track with offset
    for sub in subtitles2:
        new_sub = sub.copy()
        new_sub["start"] = max(0, sub.get("start", 0) + offset2)
        new_sub["end"] = max(0, sub.get("end", 0) + offset2)
        merged.append(new_sub)
    
    # Sort by start time
    merged.sort(key=lambda x: x["start"])
    
    return {
        "success": True,
        "total_count": len(merged),
        "subtitles": merged
    }


@app.post("/api/subtitles/split")
async def split_subtitles(subtitles: List[Dict[str, Any]], split_at: int = Form(0)):
    """
    Split subtitles into two parts at given timestamp
    
    Args:
        subtitles: List of subtitle dictionaries
        split_at: Timestamp to split at (ms)
        
    Returns:
        Two sets of subtitles
    """
    part1 = []
    part2 = []
    
    for sub in subtitles:
        if sub.get("end", 0) <= split_at:
            part1.append(sub)
        elif sub.get("start", 0) >= split_at:
            part2.append(sub)
        else:
            # Subtitle spans the split point - keep in first part
            part1.append(sub)
    
    return {
        "success": True,
        "part1": part1,
        "part2": part2,
        "split_at": split_at
    }


@app.post("/api/subtitles/gap-fill")
async def fill_gaps(
    subtitles: List[Dict[str, Any]],
    min_gap: int = Form(100),
    default_duration: int = Form(2000)
):
    """
    Fill gaps between subtitles
    
    Args:
        subtitles: List of subtitle dictionaries
        min_gap: Minimum gap size to consider (ms)
        default_duration: Default duration for filled gaps (ms)
        
    Returns:
        Subtitles with gaps filled
    """
    if not subtitles:
        return {"success": True, "subtitles": [], "filled_count": 0}
    
    # Sort by start time
    sorted_subs = sorted(subtitles.copy(), key=lambda x: x.get("start", 0))
    
    result = []
    filled_count = 0
    
    for i, sub in enumerate(sorted_subs):
        result.append(sub.copy())
        
        # Check gap to next subtitle
        if i < len(sorted_subs) - 1:
            next_sub = sorted_subs[i + 1]
            gap = next_sub.get("start", 0) - sub.get("end", 0)
            
            if gap >= min_gap and gap < default_duration * 2:
                filled_count += 1
    
    return {
        "success": True,
        "subtitles": result,
        "filled_count": filled_count
    }


# ======================
# File Upload Endpoint
# ======================

@app.post("/api/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Handle file upload
    
    Args:
        file: Uploaded file
        
    Returns:
        File info
    """
    content = await file.read()
    file_size = len(content)
    
    # Check file type
    if file.filename.endswith('.srt'):
        # Parse and return subtitles
        try:
            srt_content = content.decode('utf-8')
            parsed = parse_srt(srt_content)
            return {
                "success": True,
                "filename": file.filename,
                "file_size": file_size,
                "subtitle_count": len(parsed),
                "subtitles": [sub.dict() for sub in parsed]
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse SRT: {str(e)}")
    
    return {
        "success": True,
        "filename": file.filename,
        "file_size": file_size
    }


# ======================
# Helper Functions
# ======================

def parse_srt(srt_content: str) -> List[Subtitle]:
    """
    Parse SRT content to subtitle objects
    
    Args:
        srt_content: Raw SRT file content
        
    Returns:
        List of Subtitle objects
    """
    # Normalize line endings
    srt_content = srt_content.replace('\r\n', '\n').replace('\r', '\n')
    
    # Split into blocks
    blocks = srt_content.strip().split('\n\n')
    
    subtitles = []
    
    for block in blocks:
        lines = block.strip().split('\n')
        
        if len(lines) < 3:
            continue
        
        # Skip index line
        try:
            int(lines[0])
        except ValueError:
            continue
        
        # Parse timing line
        timing_match = re.match(
            r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})',
            lines[1]
        )
        
        if not timing_match:
            continue
        
        start_ms = SRTTime.srt_time_to_ms(timing_match.group(1))
        end_ms = SRTTime.srt_time_to_ms(timing_match.group(2))
        
        # Parse text (remaining lines)
        text = '\n'.join(lines[2:])
        
        subtitles.append(Subtitle(
            id=len(subtitles) + 1,
            text=text,
            start=start_ms,
            end=end_ms
        ))
    
    return subtitles


def generate_srt(subtitles: List[Dict[str, Any]]) -> str:
    """
    Generate SRT content from subtitle objects
    
    Args:
        subtitles: List of subtitle dictionaries
        
    Returns:
        SRT formatted string
    """
    # Sort by start time
    sorted_subs = sorted(subtitles, key=lambda x: x.get("start", 0))
    
    lines = []
    
    for i, sub in enumerate(sorted_subs, 1):
        start = SRTTime.ms_to_srt_time(sub.get("start", 0))
        end = SRTTime.ms_to_srt_time(sub.get("end", 0))
        text = sub.get("text", "")
        
        lines.append(f"{i}")
        lines.append(f"{start} --> {end}")
        lines.append(f"{text}")
        lines.append("")  # Empty line between entries
    
    return '\n'.join(lines)


# ======================
# Main Entry Point
# ======================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)