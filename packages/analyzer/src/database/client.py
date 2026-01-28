import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio
from ..utils.logger import logger

class DatabaseClient:
    def __init__(self):
        # Get DATABASE_URL from environment
        self.connection_string = os.getenv('DATABASE_URL')
        if not self.connection_string:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Parse connection string to extract components
        logger.info(f"Initializing DatabaseClient with DATABASE_URL")

    def get_connection(self):
        """Get database connection"""
        try:
            conn = psycopg2.connect(self.connection_string)
            # Set search_path to videon schema for PostgreSQL
            with conn.cursor() as cursor:
                cursor.execute('SET search_path TO videon, public')
            conn.commit()
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    def _update_video_status_sync(self, video_id: str, status: str) -> bool:
        """Update video status in database (synchronous implementation)"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('SET search_path TO videon, public')
                    if status == 'ANALYZED':
                        cursor.execute(
                            'UPDATE videos SET status = %s, "analyzedAt" = NOW() WHERE id = %s',
                            (status, video_id)
                        )
                    else:
                        cursor.execute(
                            'UPDATE videos SET status = %s WHERE id = %s',
                            (status, video_id)
                        )
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Failed to update video status for {video_id}: {e}")
            return False

    async def update_video_status(self, video_id: str, status: str) -> bool:
        """Update video status in database (async wrapper)"""
        return await asyncio.to_thread(self._update_video_status_sync, video_id, status)
    
    def update_video_status_sync(self, video_id: str, status: str) -> bool:
        """Update video status in database (synchronous, for backwards compatibility)"""
        return self._update_video_status_sync(video_id, status)

    def _create_scene_sync(self, video_id: str, start_time: float, end_time: float, keyframe_path: Optional[str] = None) -> Optional[str]:
        """Create a new scene record (synchronous implementation)"""
        try:
            scene_id = str(uuid.uuid4())
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('SET search_path TO videon, public')
                    cursor.execute(
                        '''
                        INSERT INTO scenes (id, "videoId", "startTime", "endTime", "keyframePath", "createdAt")
                        VALUES (%s, %s, %s, %s, %s, NOW())
                        ''',
                        (scene_id, video_id, start_time, end_time, keyframe_path)
                    )
                    conn.commit()
                    logger.info(f"Created scene {scene_id} for video {video_id}")
                    return scene_id
        except Exception as e:
            logger.error(f"Failed to create scene for video {video_id}: {e}")
            return None

    async def create_scene(self, video_id: str, start_time: float, end_time: float, keyframe_path: Optional[str] = None) -> Optional[str]:
        """Create a new scene record (async wrapper)"""
        return await asyncio.to_thread(self._create_scene_sync, video_id, start_time, end_time, keyframe_path)

    def get_scenes_by_video_id(self, video_id: str) -> List[Dict[str, Any]]:
        """Get all scenes for a video"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute('SET search_path TO videon, public')
                    cursor.execute(
                        '''
                        SELECT id, "videoId", "startTime", "endTime", "keyframePath", "createdAt"
                        FROM scenes 
                        WHERE "videoId" = %s
                        ORDER BY "startTime"
                        ''',
                        (video_id,)
                    )
                    rows = cursor.fetchall()
                    scenes = []
                    for row in rows:
                        scenes.append({
                            'id': row['id'],
                            'videoId': row['videoId'],
                            'start_time': row['startTime'],
                            'end_time': row['endTime'],
                            'keyframePath': row['keyframePath'],
                            'createdAt': row['createdAt']
                        })
                    logger.info(f"Retrieved {len(scenes)} scenes for video {video_id}")
                    return scenes
        except Exception as e:
            logger.error(f"Failed to get scenes for video {video_id}: {e}")
            return []

    def _create_analysis_log_sync(self, video_id: str, level: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Create analysis log entry (synchronous implementation)"""
        try:
            log_id = str(uuid.uuid4())
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('SET search_path TO videon, public')
                    cursor.execute(
                        '''
                        INSERT INTO analysis_logs (id, "videoId", level, message, metadata, "createdAt")
                        VALUES (%s, %s, %s, %s, %s, NOW())
                        ''',
                        (log_id, video_id, level, message, json.dumps(metadata) if metadata else None)
                    )
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Failed to create analysis log for video {video_id}: {e}")
            return False

    async def create_analysis_log(self, video_id: str, level: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Create analysis log entry (async wrapper)"""
        return await asyncio.to_thread(self._create_analysis_log_sync, video_id, level, message, metadata)
    
    def create_analysis_log_sync(self, video_id: str, level: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Create analysis log entry (synchronous, for backwards compatibility)"""
        return self._create_analysis_log_sync(video_id, level, message, metadata)

    def _get_video_info_sync(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get video information (synchronous implementation)"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(
                        'SELECT id, filename, "originalName", "fileSize" FROM videos WHERE id = %s',
                        (video_id,)
                    )
                    result = cursor.fetchone()
                    if result:
                        return {
                            'id': result['id'],
                            'filename': result['filename'],
                            'originalName': result['originalName'],
                            'fileSize': result['fileSize']
                        }
                    return None
        except Exception as e:
            logger.error(f"Failed to get video info for {video_id}: {e}")
            return None

    async def get_video_info(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get video information (async wrapper)"""
        return await asyncio.to_thread(self._get_video_info_sync, video_id)

    def _save_vision_analysis_sync(self, scene_id: str, objects: str, object_count: int, 
                                  faces: str, face_count: int, processing_time: float, 
                                  vision_version: str, text_recognitions: str = None, 
                                  text_count: int = 0, human_rectangles: str = None,
                                  human_count: int = 0, human_body_poses: str = None,
                                  pose_count: int = 0) -> bool:
        """Save vision analysis results to database (synchronous implementation)"""
        try:
            analysis_id = str(uuid.uuid4())
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        '''
                        INSERT INTO vision_analyses (id, "sceneId", objects, "objectCount", faces, "faceCount", 
                                                     "textRecognitions", "textCount",
                                                     "humanRectangles", "humanCount",
                                                     "humanBodyPoses", "poseCount",
                                                     "processingTime", "visionVersion", "createdAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT ("sceneId") DO UPDATE SET
                            objects = EXCLUDED.objects,
                            "objectCount" = EXCLUDED."objectCount",
                            faces = EXCLUDED.faces,
                            "faceCount" = EXCLUDED."faceCount",
                            "textRecognitions" = EXCLUDED."textRecognitions",
                            "textCount" = EXCLUDED."textCount",
                            "humanRectangles" = EXCLUDED."humanRectangles",
                            "humanCount" = EXCLUDED."humanCount",
                            "humanBodyPoses" = EXCLUDED."humanBodyPoses",
                            "poseCount" = EXCLUDED."poseCount",
                            "processingTime" = EXCLUDED."processingTime",
                            "visionVersion" = EXCLUDED."visionVersion"
                        ''',
                        (analysis_id, scene_id, objects, object_count, faces, face_count,
                         text_recognitions, text_count, human_rectangles, human_count,
                         human_body_poses, pose_count, processing_time, vision_version)
                    )
                    conn.commit()
                    return True
        except Exception as e:
            logger.error(f"Failed to save vision analysis for scene {scene_id}: {e}")
            return False

    async def save_vision_analysis(self, scene_id: str, objects: str, object_count: int, 
                                  faces: str, face_count: int, processing_time: float, 
                                  vision_version: str, text_recognitions: str = None, 
                                  text_count: int = 0, human_rectangles: str = None,
                                  human_count: int = 0, human_body_poses: str = None,
                                  pose_count: int = 0) -> bool:
        """Save vision analysis results to database (async wrapper)"""
        return await asyncio.to_thread(
            self._save_vision_analysis_sync, scene_id, objects, object_count,
            faces, face_count, processing_time, vision_version, text_recognitions, text_count,
            human_rectangles, human_count, human_body_poses, pose_count
        )

    def create_transcription(self, video_id: str, language: str, segments: list) -> str:
        """Save transcription to database"""
        try:
            transcription_id = str(uuid.uuid4())
            
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO transcriptions (id, "videoId", language, segments, "createdAt", "updatedAt")
                        VALUES (%s, %s, %s, %s, NOW(), NOW())
                    """, (transcription_id, video_id, language, json.dumps(segments)))
                    
                    conn.commit()
                    logger.info(f"✅ Transcription saved with ID: {transcription_id}")
                    return transcription_id
        except Exception as e:
            logger.error(f"❌ Failed to save transcription for video {video_id}: {e}")
            raise

    def _get_transcription_sync(self, video_id: str):
        """Get transcription for video (synchronous implementation)"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("""
                        SELECT * FROM transcriptions WHERE "videoId" = %s
                        ORDER BY "createdAt" DESC
                        LIMIT 1
                    """, (video_id,))
                    
                    result = cursor.fetchone()
                    if result:
                        return dict(result)
                    return None
        except Exception as e:
            logger.error(f"❌ Failed to get transcription for video {video_id}: {e}")
            raise

    async def get_transcription(self, video_id: str):
        """Get transcription for video (async wrapper)"""
        return await asyncio.to_thread(self._get_transcription_sync, video_id)

    def get_video(self, video_id: str):
        """Get video info from database"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("""
                        SELECT * FROM videos WHERE id = %s
                    """, (video_id,))
                    
                    result = cursor.fetchone()
                    if result:
                        video_dict = dict(result)
                        # Add file_path for compatibility - use STORAGE_PATH environment variable or default
                        storage_path = os.getenv('STORAGE_PATH', '/app/storage')
                        video_dict['file_path'] = f'{storage_path}/videos/{video_dict["filename"]}'
                        return video_dict
                    return None
        except Exception as e:
            logger.error(f"❌ Failed to get video {video_id}: {e}")
            raise

    def create_audio_stem(self, video_id: str, scene_id: Optional[str], stem_type: str, 
                          file_path: str, file_size: int, duration: Optional[float] = None,
                          start_time: Optional[float] = None, end_time: Optional[float] = None,
                          project_scene_id: Optional[str] = None) -> str:
        """Save audio stem to database"""
        try:
            stem_id = str(uuid.uuid4())
            
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO audio_stems (id, "videoId", "sceneId", "projectSceneId", "stemType", 
                                                 "filePath", "fileSize", duration, "startTime", "endTime", "createdAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (stem_id, video_id, scene_id, project_scene_id, stem_type, file_path, 
                          file_size, duration, start_time, end_time))
                    
                    conn.commit()
                    logger.info(f"✅ Audio stem saved with ID: {stem_id} (type: {stem_type})")
                    return stem_id
        except Exception as e:
            logger.error(f"❌ Failed to save audio stem for video {video_id}: {e}")
            raise
