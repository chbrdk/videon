#!/usr/bin/env python3
"""
Reframing Service: Integrates SmoothReframer with the saliency service
Handles video reframing jobs with progress tracking
"""

import sys
import os
import json
import uuid
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import cv2
import numpy as np
from datetime import datetime
import httpx
import subprocess

# from smooth_reframing import SmoothReframer
from .smooth_reframing import SmoothReframer
from ..utils.logger import logger

class ReframingService:
    """
    Service for handling video reframing jobs with progress tracking
    """
    
    def __init__(self, storage_base_dir: str = "/Volumes/DOCKER_EXTERN/prismvid/storage", backend_url: str = "http://localhost:4001"):
        self.storage_base_dir = Path(storage_base_dir)
        self.backend_url = backend_url
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.output_dir = self.storage_base_dir / "reframed_videos"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"ReframingService initialized with storage: {self.storage_base_dir}")
    
    async def reframe_video(
        self,
        video_id: str,
        video_path: str,
        saliency_data_path: str,
        aspect_ratio: Dict[str, int],
        smoothing_factor: float = 0.3,
        output_format: str = "mp4",
        reframed_video_id: Optional[str] = None
    ) -> str:
        """
        Reframes a video based on saliency data
        
        Args:
            video_id: Video identifier
            video_path: Path to original video
            saliency_data_path: Path to saliency analysis JSON
            aspect_ratio: Target aspect ratio {"width": 9, "height": 16}
            smoothing_factor: Smoothing factor for transitions
            output_format: Output video format
            
        Returns:
            Job ID for tracking progress
        """
        job_id = str(uuid.uuid4())
        
        # Create job tracking entry
        self.active_jobs[job_id] = {
            "video_id": video_id,
            "video_path": video_path,
            "saliency_data_path": saliency_data_path,
            "aspect_ratio": aspect_ratio,
            "smoothing_factor": smoothing_factor,
            "output_format": output_format,
            "reframed_video_id": reframed_video_id,
            "status": "PROCESSING",
            "progress": 0.0,
            "started_at": datetime.now(),
            "output_path": None,
            "error": None
        }
        
        logger.info(f"Started reframing job {job_id} for video {video_id}")
        
        # Start reframing in background
        asyncio.create_task(self._process_reframing_job(job_id))
        
        return job_id
    
    async def _process_reframing_job(self, job_id: str):
        """
        Processes a reframing job in the background
        """
        try:
            job = self.active_jobs[job_id]
            
            # Generate output path
            aspect_str = f"{job['aspect_ratio']['width']}_{job['aspect_ratio']['height']}"
            output_filename = f"{job['video_id']}_reframed_{aspect_str}_{job_id[:8]}.{job['output_format']}"
            output_path = self.output_dir / output_filename
            
            job["output_path"] = str(output_path)
            
            # Update progress
            job["progress"] = 10.0
            
            # Initialize SmoothReframer
            reframer = SmoothReframer(
                smoothing_factor=job["smoothing_factor"],
                max_movement_per_frame=15.0
            )
            
            # Update progress
            job["progress"] = 20.0
            
            # Perform reframing
            logger.info(f"Starting reframing for job {job_id}")
            
            # Convert aspect ratio to tuple
            aspect_tuple = (job["aspect_ratio"]["width"], job["aspect_ratio"]["height"])
            
            # Run reframing (this is CPU intensive, so we run it in a thread)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._run_reframing,
                reframer,
                job["video_path"],
                job["saliency_data_path"],
                str(output_path),
                aspect_tuple
            )
            
            # Update progress
            job["progress"] = 90.0
            
            # Verify output file
            if output_path.exists():
                # Re-encode to H.264 for browser compatibility
                logger.info(f"🔄 Re-encoding video to H.264 for browser compatibility...")
                h264_output = self._reencode_to_h264(str(output_path))
                
                if h264_output and Path(h264_output).exists():
                    # Replace the original file with H.264 version
                    import shutil
                    shutil.move(h264_output, str(output_path))
                    logger.info(f"✅ Video re-encoded to H.264 successfully")
                
                file_size = output_path.stat().st_size
                job["file_size"] = file_size
                job["progress"] = 100.0
                job["status"] = "COMPLETED"
                job["completed_at"] = datetime.now()
                
                logger.info(f"Reframing job {job_id} completed successfully. Output: {output_path}")
                
                # Update database via backend API
                if job.get("reframed_video_id"):
                    await self._update_database(job["reframed_video_id"], str(output_path), file_size)
            else:
                raise Exception("Output file was not created")
                
        except Exception as e:
            logger.error(f"Reframing job {job_id} failed: {e}")
            job["status"] = "ERROR"
            job["error"] = str(e)
            job["completed_at"] = datetime.now()
    
    def _run_reframing(
        self,
        reframer: SmoothReframer,
        video_path: str,
        saliency_data_path: str,
        output_path: str,
        aspect_ratio: Tuple[int, int]
    ):
        """
        Runs the actual reframing process (blocking operation)
        """
        try:
            reframer.reframe_video_smooth(
                video_path=video_path,
                saliency_data_path=saliency_data_path,
                output_path=output_path,
                target_aspect_ratio=aspect_ratio
            )
        except Exception as e:
            logger.error(f"Reframing process failed: {e}")
            raise
    
    async def _update_database(self, reframed_video_id: str, output_path: str, file_size: int):
        """
        Updates the database via backend API when reframing is complete
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.backend_url}/api/reframed-videos/{reframed_video_id}",
                    json={
                        "outputPath": output_path,
                        "fileSize": file_size,
                        "status": "COMPLETED",
                        "progress": 100.0
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"✅ Database updated for reframed video {reframed_video_id}")
                else:
                    logger.error(f"❌ Failed to update database: {response.status_code} - {response.text}")
                    
        except Exception as e:
            logger.error(f"❌ Error updating database for reframed video {reframed_video_id}: {e}")
    
    def _reencode_to_h264(self, video_path: str) -> Optional[str]:
        """
        Re-encodes a video to H.264 format for browser compatibility
        """
        try:
            output_path = video_path.replace('.mp4', '_h264.mp4')
            
            logger.info(f"Starting H.264 re-encoding: {video_path} -> {output_path}")
            
            # Use FFmpeg to re-encode to H.264
            result = subprocess.run([
                'ffmpeg',
                '-i', video_path,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '22',
                '-movflags', '+faststart',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-y',  # Overwrite output file
                output_path
            ], capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                logger.info(f"✅ H.264 re-encoding completed: {output_path}")
                return output_path
            else:
                logger.error(f"❌ H.264 re-encoding failed: {result.stderr}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error during H.264 re-encoding: {e}")
            return None
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Gets the status of a reframing job
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job status dictionary or None if not found
        """
        if job_id not in self.active_jobs:
            return None
        
        job = self.active_jobs[job_id].copy()
        
        # Remove internal fields that shouldn't be exposed
        job.pop("video_path", None)
        job.pop("saliency_data_path", None)
        
        return job
    
    def get_video_saliency_status(self, video_id: str) -> Dict[str, Any]:
        """
        Gets saliency analysis status for a video
        
        Args:
            video_id: Video identifier
            
        Returns:
            Status dictionary
        """
        # Look for saliency data file
        saliency_dir = self.storage_base_dir / "saliency" / video_id
        saliency_data_path = saliency_dir / "saliency_data.json"
        
        if saliency_data_path.exists():
            try:
                with open(saliency_data_path, 'r') as f:
                    data = json.load(f)
                
                return {
                    "status": "COMPLETED",
                    "progress": 100.0,
                    "completed": True,
                    "frame_count": data.get("metadata", {}).get("frame_count", 0),
                    "sample_rate": data.get("metadata", {}).get("sample_rate", 1),
                    "model_version": data.get("metadata", {}).get("model_version", "unknown")
                }
            except Exception as e:
                logger.error(f"Error reading saliency data for video {video_id}: {e}")
                return {
                    "status": "ERROR",
                    "progress": 0.0,
                    "completed": False,
                    "error": str(e)
                }
        else:
            return {
                "status": "NOT_FOUND",
                "progress": 0.0,
                "completed": False,
                "message": "Saliency analysis not found"
            }
    
    def cleanup_completed_jobs(self, max_age_hours: int = 24):
        """
        Cleans up completed jobs older than specified age
        
        Args:
            max_age_hours: Maximum age in hours for completed jobs
        """
        current_time = datetime.now()
        jobs_to_remove = []
        
        for job_id, job in self.active_jobs.items():
            if job["status"] in ["COMPLETED", "ERROR"]:
                completed_at = job.get("completed_at", job["started_at"])
                age_hours = (current_time - completed_at).total_seconds() / 3600
                
                if age_hours > max_age_hours:
                    jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            del self.active_jobs[job_id]
            logger.info(f"Cleaned up old job {job_id}")
    
    def get_active_jobs_count(self) -> int:
        """Returns the number of active jobs"""
        return len([job for job in self.active_jobs.values() if job["status"] == "PROCESSING"])
