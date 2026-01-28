import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export interface VideoExportData {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  duration: number;
  scenes: Array<{
    id: string;
    startTime: number;
    endTime: number;
    order: number;
  }>;
  transcription?: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
}

export interface ProjectExportData {
  id: string;
  name: string;
  description?: string;
  duration: number;
  scenes: Array<{
    id: string;
    videoId: string;
    videoFilename: string;
    videoOriginalName: string;
    videoFilePath: string;
    startTime: number;
    endTime: number;
    order: number;
    trimStart?: number;
    trimEnd?: number;
    audioLevel: number;
    keyframePath?: string;
  }>;
  transcriptions: Array<{
    videoId: string;
    language: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
}

export interface ReframingKeyframes {
  videoId: string;
  keyframes: Array<{
    frame: number;
    time: number;
    position: {
      x: number;
      y: number;
    };
  }>;
}

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export class PremiereExportService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getVideoExportData(videoId: string): Promise<VideoExportData | null> {
    try {
      logger.info('Getting video export data', { videoId });
      
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
        include: {
          scenes: true,
          transcriptions: true
        }
      });
      
      if (!video) {
        logger.warn('Video not found', { videoId });
        return null;
      }
      
      const videoData: VideoExportData = {
        id: video.id,
        filename: video.filename,
        originalName: video.originalName,
        filePath: (() => {
          const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
          return path.join(videosStoragePath, video.filename);
        })(),
        duration: video.duration || 0,
        scenes: video.scenes.map((scene: any) => ({
          id: scene.id,
          startTime: scene.startTime || 0,
          endTime: scene.endTime || 0,
          order: scene.order
        })),
        transcription: video.transcriptions?.map((transcription: any) => ({
          id: transcription.id,
          text: transcription.text,
          startTime: transcription.startTime,
          endTime: transcription.endTime
        }))
      };
      
      logger.info('Video export data retrieved', { videoId, sceneCount: videoData.scenes.length });
      return videoData;
      
    } catch (error) {
      logger.error('Failed to get video export data', { videoId, error: (error as Error).message });
      throw error;
    }
  }

  async getProjectExportData(projectId: string): Promise<ProjectExportData | null> {
    try {
      logger.info('Getting project export data', { projectId });
      
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          scenes: {
            include: {
              video: {
                include: {
                  transcriptions: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                  }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!project) {
        logger.warn('Project not found for export', { projectId });
        return null;
      }

      logger.info('Project found for export', { 
        projectId, 
        name: project.name, 
        sceneCount: project.scenes.length 
      });

      // Calculate total duration from all scenes
      const totalDuration = project.scenes.reduce((total, scene) => {
        const actualStart = scene.trimStart || scene.startTime;
        const actualEnd = scene.trimEnd || scene.endTime;
        return total + (actualEnd - actualStart);
      }, 0);

      // Build scenes data
      const scenesData = project.scenes.map(scene => {
        const videosStoragePath = process.env.VIDEOS_STORAGE_PATH || '/app/storage/videos';
        const videoPath = path.join(videosStoragePath, scene.video.filename);
        
        return {
          id: scene.id,
          videoId: scene.videoId,
          videoFilename: scene.video.filename,
          videoOriginalName: scene.video.originalName,
          videoFilePath: videoPath,
          startTime: scene.startTime,
          endTime: scene.endTime,
          order: scene.order,
          trimStart: scene.trimStart || undefined,
          trimEnd: scene.trimEnd || undefined,
          audioLevel: scene.audioLevel,
          keyframePath: undefined // TODO: Get keyframe from original scene
        };
      });

      // Build transcriptions data
      const transcriptionsData = project.scenes
        .filter(scene => scene.video.transcriptions.length > 0)
        .map(scene => ({
          videoId: scene.videoId,
          language: scene.video.transcriptions[0].language,
          segments: JSON.parse(scene.video.transcriptions[0].segments)
        }));

      return {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        duration: totalDuration,
        scenes: scenesData,
        transcriptions: transcriptionsData
      };
    } catch (error) {
      logger.error('Failed to get project export data', { projectId, error: (error as Error).message });
      throw error;
    }
  }

  generateProjectPremiereXML(projectData: ProjectExportData): string {
    const { scenes } = projectData;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
	<sequence id="sequence-1" TL.SQAudioVisibleBase="0" TL.SQVideoVisibleBase="0" TL.SQVisibleBaseTime="0" TL.SQAVDividerPosition="0.5" TL.SQHideShyTracks="0" TL.SQHeaderWidth="204" Monitor.ProgramZoomOut="19284048000000" Monitor.ProgramZoomIn="0" TL.SQTimePerPixel="0.11493817814786703" MZ.EditLine="0" MZ.Sequence.PreviewFrameSizeHeight="1080" MZ.Sequence.PreviewFrameSizeWidth="1920" MZ.Sequence.AudioTimeDisplayFormat="200" MZ.Sequence.PreviewRenderingClassID="1061109567" MZ.Sequence.PreviewRenderingPresetCodec="1634755443" MZ.Sequence.PreviewRenderingPresetPath="EncoderPresets/SequencePreview/795454d9-d3c2-429d-9474-923ab13b7018/QuickTime.epr" MZ.Sequence.PreviewUseMaxRenderQuality="false" MZ.Sequence.PreviewUseMaxBitDepth="false" MZ.Sequence.EditingModeGUID="795454d9-d3c2-429d-9474-923ab13b7018" MZ.Sequence.VideoTimeDisplayFormat="100" MZ.WorkOutPoint="19284048000000" MZ.WorkInPoint="0" explodedTracks="true">
		<uuid>96b5e219-72c4-4897-bc8e-149ee1cc3294</uuid>
		<duration>${this.framesFromTime(projectData.duration)}</duration>
		<rate>
			<timebase>30</timebase>
			<ntsc>FALSE</ntsc>
		</rate>
		<name>
			<binitem>
				<name>${this.escapeXml(projectData.name)}</name>
			</binitem>
		</name>
		<media>
			<video>
				<format>
					<samplecharacteristics>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<width>1920</width>
						<height>1080</height>
						<pixelaspectratio>square</pixelaspectratio>
						<fielddominance>none</fielddominance>
					</samplecharacteristics>
				</format>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" TL.SQTrackAudioKeyframeStyle="0" MZ.TrackTargeted="1" premiereTrackType="Video">
					${scenes.map((scene, index) => {
            const actualStart = scene.trimStart || scene.startTime;
            const actualEnd = scene.trimEnd || scene.endTime;
            const actualDuration = actualEnd - actualStart;
            
            return `
					<clipitem id="clipitem-${index + 1}" premiereChannelType="video">
						<masterclipid>masterclip-${scene.videoId}</masterclipid>
						<name>${this.escapeXml(scene.videoOriginalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(actualDuration)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index))}</start>
						<end>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index) + actualDuration)}</end>
						<in>${this.framesFromTime(actualStart)}</in>
						<out>${this.framesFromTime(actualEnd)}</out>
						<pproTicksIn>${this.framesFromTime(actualStart) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(actualEnd) * 1000000}</pproTicksOut>
						<file id="file-${scene.videoId}"/>
						<sourcetrack>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
						</sourcetrack>
						<logginginfo>
							<description>Project Scene ${index + 1} - ${this.escapeXml(scene.videoOriginalName)}</description>
							<scene>Scene ${index + 1}</scene>
							<shottake>Take 1</shottake>
							<lognote>Project: ${this.escapeXml(projectData.name)}</lognote>
						</logginginfo>
						<labels>
							<label2>Orange</label2>
						</labels>
						<file id="file-${scene.videoId}">
							<name>${this.escapeXml(scene.videoOriginalName)}</name>
							<pathurl>file://videos/${this.escapeXml(scene.videoOriginalName)}</pathurl>
							<rate>
								<timebase>30</timebase>
								<ntsc>FALSE</ntsc>
							</rate>
							<duration>${this.framesFromTime(scene.endTime - scene.startTime)}</duration>
							<timecode>
								<rate>
									<timebase>30</timebase>
									<ntsc>FALSE</ntsc>
								</rate>
								<string>00:00:00:00</string>
								<frame>0</frame>
								<displayformat>NDF</displayformat>
							</timecode>
							<media>
								<video>
									<samplecharacteristics>
										<rate>
											<timebase>30</timebase>
											<ntsc>FALSE</ntsc>
										</rate>
										<width>1920</width>
										<height>1080</height>
										<pixelaspectratio>square</pixelaspectratio>
										<fielddominance>none</fielddominance>
									</samplecharacteristics>
								</video>
								<audio>
									<samplecharacteristics>
										<depth>16</depth>
										<samplerate>48000</samplerate>
									</samplecharacteristics>
									<channelcount>2</channelcount>
								</audio>
							</media>
						</file>
					</clipitem>`;
          }).join('')}
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
			</video>
			<audio>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" TL.SQTrackAudioKeyframeStyle="0" MZ.TrackTargeted="1" premiereTrackType="Stereo">
					${scenes.map((scene, index) => {
            const actualStart = scene.trimStart || scene.startTime;
            const actualEnd = scene.trimEnd || scene.endTime;
            const actualDuration = actualEnd - actualStart;
            
            return `
					<clipitem id="clipitem-${index + 1 + scenes.length}" premiereChannelType="stereo">
						<masterclipid>masterclip-${scene.videoId}</masterclipid>
						<name>${this.escapeXml(scene.videoOriginalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(actualDuration)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index))}</start>
						<end>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index) + actualDuration)}</end>
						<in>${this.framesFromTime(actualStart)}</in>
						<out>${this.framesFromTime(actualEnd)}</out>
						<pproTicksIn>${this.framesFromTime(actualStart) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(actualEnd) * 1000000}</pproTicksOut>
						<file id="file-${scene.videoId}"/>
						<sourcetrack>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
						</sourcetrack>
						<link>
							<linkclipref>clipitem-${index + 1}</linkclipref>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
						</link>
						<gain>
							<parameter>
								<parameterid>gain</parameterid>
								<name>Level</name>
								<value>${scene.audioLevel}</value>
							</parameter>
						</gain>
					</clipitem>`;
          }).join('')}
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>1</outputchannelindex>
				</track>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" premiereTrackType="Stereo">
					${scenes.map((scene, index) => {
            const actualStart = scene.trimStart || scene.startTime;
            const actualEnd = scene.trimEnd || scene.endTime;
            const actualDuration = actualEnd - actualStart;
            
            return `
					<clipitem id="clipitem-${index + 1 + scenes.length * 2}" premiereChannelType="stereo">
						<masterclipid>masterclip-${scene.videoId}</masterclipid>
						<name>${this.escapeXml(scene.videoOriginalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(actualDuration)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index))}</start>
						<end>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index) + actualDuration)}</end>
						<in>${this.framesFromTime(actualStart)}</in>
						<out>${this.framesFromTime(actualEnd)}</out>
						<pproTicksIn>${this.framesFromTime(actualStart) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(actualEnd) * 1000000}</pproTicksOut>
						<file id="file-${scene.videoId}"/>
						<sourcetrack>
							<mediatype>audio</mediatype>
							<trackindex>2</trackindex>
						</sourcetrack>
						<link>
							<linkclipref>clipitem-${index + 1}</linkclipref>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length * 2}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>2</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<gain>
							<parameter>
								<parameterid>gain</parameterid>
								<name>Level</name>
								<value>${scene.audioLevel}</value>
							</parameter>
						</gain>
					</clipitem>`;
          }).join('')}
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>1</outputchannelindex>
				</track>
			</audio>
		</media>
	</sequence>
</xmeml>`;
  }

  private getProjectSceneStartTime(scenes: any[], sceneIndex: number): number {
    let cumulativeTime = 0;
    for (let i = 0; i < sceneIndex; i++) {
      const scene = scenes[i];
      const actualStart = scene.trimStart || scene.startTime;
      const actualEnd = scene.trimEnd || scene.endTime;
      cumulativeTime += (actualEnd - actualStart);
    }
    return cumulativeTime;
  }

  generatePremiereXML(videoData: VideoExportData): string {
    const { scenes } = videoData;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
	<sequence id="sequence-1" TL.SQAudioVisibleBase="0" TL.SQVideoVisibleBase="0" TL.SQVisibleBaseTime="0" TL.SQAVDividerPosition="0.5" TL.SQHideShyTracks="0" TL.SQHeaderWidth="204" Monitor.ProgramZoomOut="19284048000000" Monitor.ProgramZoomIn="0" TL.SQTimePerPixel="0.11493817814786703" MZ.EditLine="0" MZ.Sequence.PreviewFrameSizeHeight="1080" MZ.Sequence.PreviewFrameSizeWidth="1920" MZ.Sequence.AudioTimeDisplayFormat="200" MZ.Sequence.PreviewRenderingClassID="1061109567" MZ.Sequence.PreviewRenderingPresetCodec="1634755443" MZ.Sequence.PreviewRenderingPresetPath="EncoderPresets/SequencePreview/795454d9-d3c2-429d-9474-923ab13b7018/QuickTime.epr" MZ.Sequence.PreviewUseMaxRenderQuality="false" MZ.Sequence.PreviewUseMaxBitDepth="false" MZ.Sequence.EditingModeGUID="795454d9-d3c2-429d-9474-923ab13b7018" MZ.Sequence.VideoTimeDisplayFormat="100" MZ.WorkOutPoint="19284048000000" MZ.WorkInPoint="0" explodedTracks="true">
		<uuid>96b5e219-72c4-4897-bc8e-149ee1cc3294</uuid>
		<duration>${this.framesFromTime(videoData.duration)}</duration>
		<rate>
			<timebase>30</timebase>
			<ntsc>FALSE</ntsc>
		</rate>
		<name>${this.escapeXml(videoData.originalName)}</name>
		<media>
			<video>
				<format>
					<samplecharacteristics>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<codec>
							<name>H.264</name>
							<appspecificdata>
								<appname>Premiere Pro</appname>
								<appmanufacturer>Adobe</appmanufacturer>
								<appversion>2025.0</appversion>
							</appspecificdata>
						</codec>
						<width>1920</width>
						<height>1080</height>
						<anamorphic>FALSE</anamorphic>
						<pixelaspectratio>square</pixelaspectratio>
						<fielddominance>none</fielddominance>
						<colordepth>24</colordepth>
					</samplecharacteristics>
				</format>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1">
					${scenes.map((scene, index) => `
					<clipitem id="clipitem-${index + 1}">
						<masterclipid>masterclip-1</masterclipid>
						<name>${this.escapeXml(videoData.originalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(videoData.duration)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(scene.startTime)}</start>
						<end>${this.framesFromTime(scene.endTime)}</end>
						<in>${this.framesFromTime(scene.startTime)}</in>
						<out>${this.framesFromTime(scene.endTime)}</out>
						<pproTicksIn>${this.framesFromTime(scene.startTime) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(scene.endTime) * 1000000}</pproTicksOut>
						<alphatype>none</alphatype>
						<pixelaspectratio>square</pixelaspectratio>
						<anamorphic>FALSE</anamorphic>
						<file id="file-1">
							<name>${this.escapeXml(videoData.filename)}</name>
							<pathurl>file://localhost${videoData.filePath}</pathurl>
							<rate>
								<timebase>30</timebase>
								<ntsc>FALSE</ntsc>
							</rate>
							<duration>${this.framesFromTime(videoData.duration)}</duration>
							<timecode>
								<rate>
									<timebase>30</timebase>
									<ntsc>FALSE</ntsc>
								</rate>
								<string>00:00:00:00</string>
								<frame>0</frame>
								<displayformat>NDF</displayformat>
							</timecode>
							<media>
								<video>
									<samplecharacteristics>
										<rate>
											<timebase>30</timebase>
											<ntsc>FALSE</ntsc>
										</rate>
										<width>1920</width>
										<height>1080</height>
										<anamorphic>FALSE</anamorphic>
										<pixelaspectratio>square</pixelaspectratio>
										<fielddominance>none</fielddominance>
									</samplecharacteristics>
								</video>
								<audio>
									<samplecharacteristics>
										<depth>16</depth>
										<samplerate>48000</samplerate>
									</samplecharacteristics>
									<channelcount>2</channelcount>
								</audio>
							</media>
						</file>
						<link>
							<linkclipref>clipitem-${index + 1}</linkclipref>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length * 2}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>2</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<logginginfo>
							<description>Scene ${index + 1}</description>
							<scene>Scene ${index + 1}</scene>
							<shottake></shottake>
							<lognote></lognote>
							<good></good>
							<originalvideofilename></originalvideofilename>
							<originalaudiofilename></originalaudiofilename>
						</logginginfo>
						<colorinfo>
							<lut></lut>
							<lut1></lut1>
							<asc_sop></asc_sop>
							<asc_sat></asc_sat>
							<lut2></lut2>
						</colorinfo>
						<labels>
							<label2>Iris</label2>
						</labels>
					</clipitem>`).join('')}
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="0">
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="0">
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
			</video>
			<audio>
				<numOutputChannels>2</numOutputChannels>
				<format>
					<samplecharacteristics>
						<depth>16</depth>
						<samplerate>48000</samplerate>
					</samplecharacteristics>
				</format>
				<outputs>
					<group>
						<index>1</index>
						<numchannels>1</numchannels>
						<downmix>0</downmix>
						<channel>
							<index>1</index>
						</channel>
					</group>
					<group>
						<index>2</index>
						<numchannels>1</numchannels>
						<downmix>0</downmix>
						<channel>
							<index>2</index>
						</channel>
					</group>
				</outputs>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Ausgleich" currentExplodedTrackIndex="0" totalExplodedTrackCount="2" premiereTrackType="Stereo">
					${scenes.map((scene, index) => `
					<clipitem id="clipitem-${index + 1 + scenes.length}" premiereChannelType="stereo">
						<masterclipid>masterclip-1</masterclipid>
						<name>${this.escapeXml(videoData.originalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(scene.endTime - scene.startTime)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(scene.startTime)}</start>
						<end>${this.framesFromTime(scene.endTime)}</end>
						<in>${this.framesFromTime(scene.startTime)}</in>
						<out>${this.framesFromTime(scene.endTime)}</out>
						<pproTicksIn>${this.framesFromTime(scene.startTime) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(scene.endTime) * 1000000}</pproTicksOut>
						<file id="file-1"/>
						<sourcetrack>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
						</sourcetrack>
						<link>
							<linkclipref>clipitem-${index + 1}</linkclipref>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length * 2}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>2</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<logginginfo>
							<description>Scene ${index + 1} Audio</description>
							<scene>Scene ${index + 1}</scene>
							<shottake></shottake>
							<lognote></lognote>
							<good></good>
							<originalvideofilename></originalvideofilename>
							<originalaudiofilename></originalaudiofilename>
						</logginginfo>
						<colorinfo>
							<lut></lut>
							<lut1></lut1>
							<asc_sop></asc_sop>
							<asc_sat></asc_sat>
							<lut2></lut2>
						</colorinfo>
						<labels>
							<label2>Iris</label2>
						</labels>
					</clipitem>`).join('')}
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>1</outputchannelindex>
				</track>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Ausgleich" currentExplodedTrackIndex="1" totalExplodedTrackCount="2" premiereTrackType="Stereo">
					${scenes.map((scene, index) => `
					<clipitem id="clipitem-${index + 1 + scenes.length * 2}" premiereChannelType="stereo">
						<masterclipid>masterclip-1</masterclipid>
						<name>${this.escapeXml(videoData.originalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(scene.endTime - scene.startTime)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(scene.startTime)}</start>
						<end>${this.framesFromTime(scene.endTime)}</end>
						<in>${this.framesFromTime(scene.startTime)}</in>
						<out>${this.framesFromTime(scene.endTime)}</out>
						<pproTicksIn>${this.framesFromTime(scene.startTime) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(scene.endTime) * 1000000}</pproTicksOut>
						<file id="file-1"/>
						<sourcetrack>
							<mediatype>audio</mediatype>
							<trackindex>2</trackindex>
						</sourcetrack>
						<link>
							<linkclipref>clipitem-${index + 1}</linkclipref>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<link>
							<linkclipref>clipitem-${index + 1 + scenes.length * 2}</linkclipref>
							<mediatype>audio</mediatype>
							<trackindex>2</trackindex>
							<clipindex>${index + 1}</clipindex>
							<groupindex>1</groupindex>
						</link>
						<logginginfo>
							<description>Scene ${index + 1} Audio</description>
							<scene>Scene ${index + 1}</scene>
							<shottake></shottake>
							<lognote></lognote>
							<good></good>
							<originalvideofilename></originalvideofilename>
							<originalaudiofilename></originalaudiofilename>
						</logginginfo>
						<colorinfo>
							<lut></lut>
							<lut1></lut1>
							<asc_sop></asc_sop>
							<asc_sat></asc_sat>
							<lut2></lut2>
						</colorinfo>
						<labels>
							<label2>Iris</label2>
						</labels>
					</clipitem>`).join('')}
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>2</outputchannelindex>
				</track>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Ausgleich" currentExplodedTrackIndex="0" totalExplodedTrackCount="2" premiereTrackType="Stereo">
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>1</outputchannelindex>
				</track>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Ausgleich" currentExplodedTrackIndex="1" totalExplodedTrackCount="2" premiereTrackType="Stereo">
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>2</outputchannelindex>
				</track>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Ausgleich" currentExplodedTrackIndex="0" totalExplodedTrackCount="2" premiereTrackType="Stereo">
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>1</outputchannelindex>
				</track>
				<track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Ausgleich" currentExplodedTrackIndex="1" totalExplodedTrackCount="2" premiereTrackType="Stereo">
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>2</outputchannelindex>
				</track>
			</audio>
		</media>
		<timecode>
			<rate>
				<timebase>30</timebase>
				<ntsc>FALSE</ntsc>
			</rate>
			<string>00:00:00:00</string>
			<frame>0</frame>
			<displayformat>NDF</displayformat>
		</timecode>
		<labels>
			<label2>Forest</label2>
		</labels>
		<logginginfo>
			<description>${this.escapeXml(videoData.originalName)}</description>
			<scene>VIDEON Export</scene>
			<shottake></shottake>
			<lognote></lognote>
			<good></good>
			<originalvideofilename></originalvideofilename>
			<originalaudiofilename></originalaudiofilename>
		</logginginfo>
	</sequence>
</xmeml>`;
  }

  generateSRT(transcriptions: any[]): string {
    if (!transcriptions || transcriptions.length === 0) {
      return '';
    }

    // Combine all transcriptions into one SRT file
    let srtContent = '';
    let subtitleIndex = 1;
    let currentTime = 0;

    for (const transcription of transcriptions) {
      if (transcription.segments) {
        for (const segment of transcription.segments) {
          const startTime = this.formatSRTTime(currentTime + segment.start);
          const endTime = this.formatSRTTime(currentTime + segment.end);
          srtContent += `${subtitleIndex}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
          subtitleIndex++;
        }
        // Add some spacing between different video transcriptions
        currentTime += 1; // 1 second gap between videos
      }
    }

    return srtContent;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private framesFromTime(seconds: number): number {
    return Math.round(seconds * 30); // 30fps
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async createPremiereZip(projectData: ProjectExportData, xmlContent: string): Promise<Buffer> {
    try {
      logger.info('Creating Premiere ZIP package for project', { projectId: projectData.id });
      
      // Create archive with fast compression
      const archive = archiver('zip', { 
        zlib: { level: 1 }, // Fast compression
        forceLocalTime: true,
        forceZip64: false
      });
      
      const buffers: Buffer[] = [];
      
      archive.on('data', (chunk) => {
        buffers.push(chunk);
      });
      
      archive.on('error', (err) => {
        logger.error('Archive error:', err);
        throw err;
      });
      
      // Add XML file
      archive.append(xmlContent, { name: `${projectData.name}.xml` });
      
      // Add SRT file if transcriptions exist
      if (projectData.transcriptions.length > 0) {
        const srtContent = this.generateSRT(projectData.transcriptions);
        if (srtContent) {
          archive.append(srtContent, { name: `${projectData.name}.srt` });
        }
      }
      
      // Add project info file
      const projectInfo = {
        projectName: projectData.name,
        description: projectData.description,
        duration: projectData.duration,
        sceneCount: projectData.scenes.length,
        exportDate: new Date().toISOString(),
        scenes: projectData.scenes.map(scene => ({
          videoName: scene.videoOriginalName,
          startTime: scene.startTime,
          endTime: scene.endTime,
          trimStart: scene.trimStart,
          trimEnd: scene.trimEnd,
          audioLevel: scene.audioLevel
        }))
      };
      
      archive.append(JSON.stringify(projectInfo, null, 2), { name: 'project_info.json' });
      
      // Add README file
      const readmeContent = `# VIDEON Project Export

This ZIP file contains a complete export of your project "${projectData.name}".

## Contents:

- **${projectData.name}.xml** - Adobe Premiere Pro project file
- **${projectData.name}.srt** - Subtitle file (if transcription available)
- **project_info.json** - Project metadata and scene information
- **videos/** - Original video files used in the project

## How to use:

1. Extract this ZIP file to a folder
2. Open Adobe Premiere Pro
3. Import the XML file: File → Import → Select "${projectData.name}.xml"
4. Premiere will automatically link to the video files in the videos/ folder

## Project Details:

- **Project Name:** ${projectData.name}
- **Duration:** ${Math.floor(projectData.duration / 60)}:${Math.floor(projectData.duration % 60).toString().padStart(2, '0')}
- **Scenes:** ${projectData.scenes.length}
- **Export Date:** ${new Date().toISOString()}

## Notes:

- All video files are included with their original filenames
- Scene timing and audio levels are preserved
- Trim settings are applied in the timeline
- The XML file uses relative paths to the videos/ folder

Generated by VIDEON - Video Analysis & Editing Platform
`;
      
      archive.append(readmeContent, { name: 'README.md' });
      
      // Add original video files
      const uniqueVideos = new Map();
      for (const scene of projectData.scenes) {
        if (!uniqueVideos.has(scene.videoId)) {
          uniqueVideos.set(scene.videoId, {
            filename: scene.videoFilename,
            originalName: scene.videoOriginalName,
            filePath: scene.videoFilePath
          });
        }
      }
      
      logger.info('Adding original video files to ZIP', { 
        videoCount: uniqueVideos.size,
        videos: Array.from(uniqueVideos.values()).map(v => v.originalName)
      });
      
      for (const [videoId, videoInfo] of uniqueVideos) {
        try {
          // Check if file exists
          if (fs.existsSync(videoInfo.filePath)) {
            // Add file to archive with original filename
            archive.file(videoInfo.filePath, { name: `videos/${videoInfo.originalName}` });
            logger.info('Added video file to ZIP', { 
              videoId, 
              originalName: videoInfo.originalName,
              filePath: videoInfo.filePath 
            });
          } else {
            logger.warn('Video file not found, skipping', { 
              videoId, 
              filePath: videoInfo.filePath 
            });
          }
        } catch (error) {
          logger.error('Error adding video file to ZIP', { 
            videoId, 
            filePath: videoInfo.filePath, 
            error: (error as Error).message 
          });
          // Continue with other files even if one fails
        }
      }
      
      await archive.finalize();
      
      const zipBuffer = Buffer.concat(buffers);
      logger.info('Premiere ZIP package created successfully', { 
        projectId: projectData.id, 
        size: zipBuffer.length,
        videoCount: uniqueVideos.size
      });
      
      return zipBuffer;
    } catch (error) {
      logger.error('Failed to create Premiere ZIP package', { 
        projectId: projectData.id, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  async createExportPackage(videoId: string, format: 'premiere' | 'fcpxml'): Promise<Buffer> {
    try {
      logger.info('Creating export package', { videoId, format });
      
      const videoData = await this.getVideoExportData(videoId);
      if (!videoData) {
        throw new Error('Video not found');
      }

      // Create archive with fast compression
      const archive = archiver('zip', { 
        zlib: { level: 1 }, // Fast compression
        forceLocalTime: true,
        forceZip64: false
      });
      const buffers: Buffer[] = [];
      
      archive.on('data', (chunk) => buffers.push(chunk));
      
      // Add XML file
      const xmlContent = this.generatePremiereXML(videoData);
      archive.append(xmlContent, { name: 'project.xml' });
      
      // Add SRT file if transcription exists
      if (videoData.transcription) {
        const srtContent = this.generateSRT(videoData.transcription);
        archive.append(srtContent, { name: 'subtitles.srt' });
      }
      
      // Add video file with streaming for large files
      if (fs.existsSync(videoData.filePath)) {
        logger.info('Adding video file to archive', { filename: videoData.filename });
        archive.file(videoData.filePath, { name: videoData.filename });
      }
      
      logger.info('Finalizing archive');
      await archive.finalize();
      
      // Wait for archive to complete with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Export timeout - video file too large'));
        }, 120000); // 2 minute timeout for large videos
        
        archive.on('end', () => {
          clearTimeout(timeout);
          logger.info('Archive completed successfully', { videoId, format });
          resolve(Buffer.concat(buffers));
        });
        archive.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
    } catch (error) {
      logger.error('Failed to create export package', { videoId, format, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Generates position keyframes from ROI data for reframing
   */
  async generateReframingKeyframes(
    projectData: ProjectExportData,
    aspectRatio: string = '9:16'
  ): Promise<ReframingKeyframes[]> {
    try {
      logger.info('Generating reframing keyframes', { 
        projectId: projectData.id, 
        sceneCount: projectData.scenes.length,
        aspectRatio 
      });

      const reframingData: ReframingKeyframes[] = [];

      for (const scene of projectData.scenes) {
        // Get saliency analysis for this video
        const saliencyAnalysis = await this.prisma.saliencyAnalysis.findFirst({
          where: { videoId: scene.videoId },
          orderBy: { createdAt: 'desc' }
        });

        if (!saliencyAnalysis) {
          logger.warn('No saliency analysis found for video', { videoId: scene.videoId });
          continue;
        }

        // Load saliency data
        const saliencyDataPath = saliencyAnalysis.dataPath;
        if (!fs.existsSync(saliencyDataPath)) {
          logger.warn('Saliency data file not found', { path: saliencyDataPath });
          continue;
        }

        const saliencyData = JSON.parse(fs.readFileSync(saliencyDataPath, 'utf8'));
        const keyframes = this.roiToPositionKeyframes(
          saliencyData,
          scene,
          aspectRatio
        );

        if (keyframes.length > 0) {
          reframingData.push({
            videoId: scene.videoId,
            keyframes
          });
        }
      }

      logger.info('Reframing keyframes generated', { 
        videoCount: reframingData.length,
        totalKeyframes: reframingData.reduce((sum, data) => sum + data.keyframes.length, 0)
      });

      return reframingData;
    } catch (error) {
      logger.error('Failed to generate reframing keyframes', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Converts ROI data to position keyframes for a scene
   */
  private roiToPositionKeyframes(
    saliencyData: any,
    scene: ProjectExportData['scenes'][0],
    aspectRatio: string
  ): Array<{ frame: number; time: number; position: { x: number; y: number } }> {
    const keyframes: Array<{ frame: number; time: number; position: { x: number; y: number } }> = [];
    
    if (!saliencyData.frames || !Array.isArray(saliencyData.frames)) {
      return keyframes;
    }

    const fps = 25; // Assume 25 FPS for keyframe calculation
    const [targetWidth, targetHeight] = aspectRatio.split(':').map(Number);
    
    // Filter frames that fall within the scene's time range
    const sceneFrames = saliencyData.frames.filter((frame: any) => {
      const frameTime = frame.frame_number / fps;
      return frameTime >= scene.startTime && frameTime <= scene.endTime;
    });

    for (const frame of sceneFrames) {
      if (!frame.roi_suggestions || frame.roi_suggestions.length === 0) {
        continue;
      }

      // Get the best ROI (highest score)
      const bestROI = frame.roi_suggestions.reduce((best: ROI, current: ROI) => 
        current.score > best.score ? current : best
      );

      // Convert ROI center to position
      const position = this.roiToPosition(bestROI, targetWidth, targetHeight);
      
      // Calculate time relative to scene start
      const frameTime = frame.frame_number / fps;
      const relativeTime = frameTime - scene.startTime;

      keyframes.push({
        frame: frame.frame_number,
        time: relativeTime,
        position
      });
    }

    return keyframes;
  }

  /**
   * Converts ROI to position coordinates
   */
  private roiToPosition(roi: ROI, frameWidth: number, frameHeight: number): { x: number; y: number } {
    // ROI center in original video coordinates
    const centerX = roi.x + roi.width / 2;
    const centerY = roi.y + roi.height / 2;
    
    // For reframing, we want to position the crop center
    // This will be used as the Motion > Position value in Premiere
    return { x: centerX, y: centerY };
  }

  /**
   * Generates Premiere XML with position keyframes for reframing
   */
  generateReframedProjectXML(
    projectData: ProjectExportData,
    reframingData: ReframingKeyframes[]
  ): string {
    const { scenes } = projectData;
    
    // Create a map of videoId to keyframes for quick lookup
    const keyframesMap = new Map<string, ReframingKeyframes['keyframes']>();
    reframingData.forEach(data => {
      keyframesMap.set(data.videoId, data.keyframes);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
	<sequence id="sequence-1" TL.SQAudioVisibleBase="0" TL.SQVideoVisibleBase="0" TL.SQVisibleBaseTime="0" TL.SQAVDividerPosition="0.5" TL.SQHideShyTracks="0" TL.SQHeaderWidth="204" Monitor.ProgramZoomOut="19284048000000" Monitor.ProgramZoomIn="0" TL.SQTimePerPixel="0.11493817814786703" MZ.EditLine="0" MZ.Sequence.PreviewFrameSizeHeight="1080" MZ.Sequence.PreviewFrameSizeWidth="1920" MZ.Sequence.AudioTimeDisplayFormat="200" MZ.Sequence.PreviewRenderingClassID="1061109567" MZ.Sequence.PreviewRenderingPresetCodec="1634755443" MZ.Sequence.PreviewRenderingPresetPath="EncoderPresets/SequencePreview/795454d9-d3c2-429d-9474-923ab13b7018/QuickTime.epr" MZ.Sequence.PreviewUseMaxRenderQuality="false" MZ.Sequence.PreviewUseMaxBitDepth="false" MZ.Sequence.EditingModeGUID="795454d9-d3c2-429d-9474-923ab13b7018" MZ.Sequence.VideoTimeDisplayFormat="100" MZ.WorkOutPoint="19284048000000" MZ.WorkInPoint="0" explodedTracks="true">
		<uuid>96b5e219-72c4-4897-bc8e-149ee1cc3294</uuid>
		<duration>${this.framesFromTime(projectData.duration)}</duration>
		<rate>
			<timebase>30</timebase>
			<ntsc>FALSE</ntsc>
		</rate>
		<name>
			<binitem>
				<name>${this.escapeXml(projectData.name)} - Reframed</name>
			</binitem>
		</name>
		<media>
			<video>
				<format>
					<samplecharacteristics>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<width>1920</width>
						<height>1080</height>
						<pixelaspectratio>square</pixelaspectratio>
						<fielddominance>none</fielddominance>
						<colordepth>24</colordepth>
					</samplecharacteristics>
				</format>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" TL.SQTrackAudioKeyframeStyle="0" MZ.TrackTargeted="1" premiereTrackType="Video">
					${scenes.map((scene, index) => {
            const actualStart = scene.trimStart || scene.startTime;
            const actualEnd = scene.trimEnd || scene.endTime;
            const actualDuration = actualEnd - actualStart;
            const keyframes = keyframesMap.get(scene.videoId) || [];
            
            return `
					<clipitem id="clipitem-${index + 1}" premiereChannelType="video">
						<masterclipid>masterclip-${scene.videoId}</masterclipid>
						<name>${this.escapeXml(scene.videoOriginalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(actualDuration)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index))}</start>
						<end>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index) + actualDuration)}</end>
						<in>${this.framesFromTime(actualStart)}</in>
						<out>${this.framesFromTime(actualEnd)}</out>
						<pproTicksIn>${this.framesFromTime(actualStart) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(actualEnd) * 1000000}</pproTicksOut>
						<file id="file-${scene.videoId}"/>
						<sourcetrack>
							<mediatype>video</mediatype>
							<trackindex>1</trackindex>
						</sourcetrack>
						${this.generatePositionKeyframes(keyframes, actualDuration)}
						<logginginfo>
							<description>Project Scene ${index + 1} - ${this.escapeXml(scene.videoOriginalName)} (Reframed)</description>
							<scene>Scene ${index + 1}</scene>
							<shottake>Take 1</shottake>
							<lognote>Project: ${this.escapeXml(projectData.name)} - Reframed</lognote>
						</logginginfo>
						<labels>
							<label2>Orange</label2>
						</labels>
						<file id="file-${scene.videoId}">
							<name>${this.escapeXml(scene.videoOriginalName)}</name>
							<pathurl>file://videos/${this.escapeXml(scene.videoOriginalName)}</pathurl>
							<rate>
								<timebase>30</timebase>
								<ntsc>FALSE</ntsc>
							</rate>
							<duration>${this.framesFromTime(scene.endTime - scene.startTime)}</duration>
							<timecode>
								<rate>
									<timebase>30</timebase>
									<ntsc>FALSE</ntsc>
								</rate>
								<string>00:00:00:00</string>
								<frame>0</frame>
								<displayformat>NDF</displayformat>
							</timecode>
							<media>
								<video>
									<samplecharacteristics>
										<rate>
											<timebase>30</timebase>
											<ntsc>FALSE</ntsc>
										</rate>
										<width>1920</width>
										<height>1080</height>
										<pixelaspectratio>square</pixelaspectratio>
										<fielddominance>none</fielddominance>
										<colordepth>24</colordepth>
									</samplecharacteristics>
									<codec>
										<name>H.264</name>
										<appspecificdata>
											<appname>Premiere Pro</appname>
											<appmanufacturer>Adobe Systems, Inc.</appmanufacturer>
											<appversion>15.0</appversion>
										</appspecificdata>
									</codec>
								</video>
							</media>
						</file>
					</clipitem>`;
          }).join('')}
				</track>
			</video>
			<audio>
				<track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" TL.SQTrackAudioKeyframeStyle="0" MZ.TrackTargeted="1" premiereTrackType="Stereo">
					${scenes.map((scene, index) => {
            const actualStart = scene.trimStart || scene.startTime;
            const actualEnd = scene.trimEnd || scene.endTime;
            const actualDuration = actualEnd - actualStart;
            
            return `
					<clipitem id="clipitem-${index + 1 + scenes.length}" premiereChannelType="stereo">
						<masterclipid>masterclip-${scene.videoId}</masterclipid>
						<name>${this.escapeXml(scene.videoOriginalName)}</name>
						<enabled>TRUE</enabled>
						<duration>${this.framesFromTime(actualDuration)}</duration>
						<rate>
							<timebase>30</timebase>
							<ntsc>FALSE</ntsc>
						</rate>
						<start>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index))}</start>
						<end>${this.framesFromTime(this.getProjectSceneStartTime(scenes, index) + actualDuration)}</end>
						<in>${this.framesFromTime(actualStart)}</in>
						<out>${this.framesFromTime(actualEnd)}</out>
						<pproTicksIn>${this.framesFromTime(actualStart) * 1000000}</pproTicksIn>
						<pproTicksOut>${this.framesFromTime(actualEnd) * 1000000}</pproTicksOut>
						<file id="file-${scene.videoId}"/>
						<sourcetrack>
							<mediatype>audio</mediatype>
							<trackindex>1</trackindex>
						</sourcetrack>
						<levels>
							<level>
								<gain>${scene.audioLevel}</gain>
							</level>
						</levels>
						<labels>
							<label2>Orange</label2>
						</labels>
						<linkclipref>clipitem-${index + 1}</linkclipref>
					</clipitem>`;
          }).join('')}
				</track>
			</audio>
		</media>
	</sequence>
</xmeml>`;
  }

  /**
   * Generates position keyframes XML for Premiere Pro
   */
  private generatePositionKeyframes(
    keyframes: ReframingKeyframes['keyframes'],
    duration: number
  ): string {
    if (keyframes.length === 0) {
      return '';
    }

    // Sort keyframes by time
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    
    // Generate keyframe XML
    const keyframeXML = sortedKeyframes.map(keyframe => {
      const frameTime = this.framesFromTime(keyframe.time);
      return `
						<keyframe>
							<when>${frameTime}</when>
							<value>${keyframe.position.x} ${keyframe.position.y}</value>
						</keyframe>`;
    }).join('');

    return `
					<filter>
						<effect>
							<name>Motion</name>
							<effectid>motion</effectid>
							<effectcategory>motion</effectcategory>
							<effecttype>motion</effecttype>
							<mediatype>video</mediatype>
							<parameter>
								<parameterid>center</parameterid>
								<name>Position</name>
								<valuemin>0</valuemin>
								<valuemax>1</valuemax>
								<value>${sortedKeyframes[0]?.position.x || 960} ${sortedKeyframes[0]?.position.y || 540}</value>
								<keyframe>${keyframeXML}
								</keyframe>
							</parameter>
						</effect>
					</filter>`;
  }
}