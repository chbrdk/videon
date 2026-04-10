import { runPostUploadAnalysisPipeline } from '../src/services/analysis-pipeline.service';

describe('runPostUploadAnalysisPipeline', () => {
  const prevStagger = process.env.ANALYSIS_STAGGER_JOBS;
  const prevPoll = process.env.ANALYSIS_PIPELINE_POLL_MS;
  const prevTimeout = process.env.ANALYSIS_SCENE_WAIT_TIMEOUT_MS;

  beforeEach(() => {
    process.env.ANALYSIS_STAGGER_JOBS = 'true';
    process.env.ANALYSIS_PIPELINE_POLL_MS = '500';
    process.env.ANALYSIS_SCENE_WAIT_TIMEOUT_MS = '5000';
  });

  afterEach(() => {
    process.env.ANALYSIS_STAGGER_JOBS = prevStagger;
    process.env.ANALYSIS_PIPELINE_POLL_MS = prevPoll;
    process.env.ANALYSIS_SCENE_WAIT_TIMEOUT_MS = prevTimeout;
  });

  it('runs analyze first, waits for ANALYZED, then audio and saliency', async () => {
    const analyzeVideo = jest.fn().mockResolvedValue(undefined);
    const separateAudioForVideo = jest.fn().mockResolvedValue(undefined);
    const analyzeSaliency = jest.fn().mockResolvedValue({});
    const getVideoStatus = jest
      .fn()
      .mockResolvedValueOnce({ status: 'ANALYZING' })
      .mockResolvedValue({ status: 'ANALYZED' });

    await runPostUploadAnalysisPipeline('vid-1', '/tmp/v.mp4', {
      analyzer: { analyzeVideo, separateAudioForVideo },
      saliency: { analyzeSaliency },
      videoService: { getVideoStatus },
    });

    expect(analyzeVideo).toHaveBeenCalledWith('vid-1', '/tmp/v.mp4');
    expect(separateAudioForVideo).toHaveBeenCalledWith('vid-1', '/tmp/v.mp4');
    expect(analyzeSaliency).toHaveBeenCalledWith('vid-1', '/tmp/v.mp4');
    expect(separateAudioForVideo.mock.invocationCallOrder[0]).toBeLessThan(
      analyzeSaliency.mock.invocationCallOrder[0]
    );
  });

  it('when stagger disabled, fires audio and saliency without waiting', async () => {
    process.env.ANALYSIS_STAGGER_JOBS = 'false';

    const analyzeVideo = jest.fn().mockResolvedValue(undefined);
    const separateAudioForVideo = jest.fn().mockResolvedValue(undefined);
    const analyzeSaliency = jest.fn().mockResolvedValue({});
    const getVideoStatus = jest.fn();

    await runPostUploadAnalysisPipeline('vid-2', '/tmp/x.mp4', {
      analyzer: { analyzeVideo, separateAudioForVideo },
      saliency: { analyzeSaliency },
      videoService: { getVideoStatus },
    });

    expect(analyzeVideo).toHaveBeenCalled();
    expect(getVideoStatus).not.toHaveBeenCalled();
    expect(separateAudioForVideo).toHaveBeenCalled();
    expect(analyzeSaliency).toHaveBeenCalled();
  });

  it('skips audio and saliency when status becomes ERROR', async () => {
    const analyzeVideo = jest.fn().mockResolvedValue(undefined);
    const separateAudioForVideo = jest.fn().mockResolvedValue(undefined);
    const analyzeSaliency = jest.fn().mockResolvedValue({});
    const getVideoStatus = jest.fn().mockResolvedValue({ status: 'ERROR' });

    await runPostUploadAnalysisPipeline('vid-3', '/tmp/y.mp4', {
      analyzer: { analyzeVideo, separateAudioForVideo },
      saliency: { analyzeSaliency },
      videoService: { getVideoStatus },
    });

    expect(separateAudioForVideo).not.toHaveBeenCalled();
    expect(analyzeSaliency).not.toHaveBeenCalled();
  });
});
