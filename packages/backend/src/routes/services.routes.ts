import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger';

const execAsync = promisify(exec);
const router = Router();

// Map of service names to Docker container name patterns
const SERVICE_CONTAINERS = {
  analyzer: 'analyzer',
  saliency: 'saliency',
  audioSeparation: 'audio-separation',
  backend: 'backend',
  frontend: 'frontend'
};

// Helper to check if Docker is available
async function isDockerAvailable(): Promise<boolean> {
  try {
    await Promise.race([
      execAsync('docker --version'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);
    return true;
  } catch {
    return false;
  }
}

// Helper to find container name dynamically
async function findContainerName(serviceName: string): Promise<string | null> {
  try {
    // Check if Docker is available first
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return null;
    }

    // Try to find container by name pattern with timeout
    const { stdout } = await Promise.race([
      execAsync(`docker ps -a --filter "name=${SERVICE_CONTAINERS[serviceName as keyof typeof SERVICE_CONTAINERS]}" --format "{{.Names}}"`),
      new Promise<{ stdout: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )
    ]);
    const containerName = stdout.trim().split('\n')[0];
    return containerName || null;
  } catch (error) {
    // Silently fail - Docker not available or timeout
    return null;
  }
}

// Get service status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const statuses: Record<string, any> = {};
    const dockerAvailable = await isDockerAvailable();

    for (const serviceName of Object.keys(SERVICE_CONTAINERS)) {
      try {
        if (!dockerAvailable) {
          // Docker not available - return basic status
          statuses[serviceName] = {
            running: false,
            status: 'docker_unavailable',
            container: null
          };
          continue;
        }

        const containerName = await findContainerName(serviceName);

        if (containerName) {
          try {
            // Add timeout for docker ps command
            const { stdout } = await Promise.race([
              execAsync(`docker ps --filter "name=${containerName}" --format "{{.Status}}"`),
              new Promise<{ stdout: string }>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 2000)
              )
            ]);
            statuses[serviceName] = {
              running: stdout.trim() !== '',
              status: stdout.trim() || 'stopped',
              container: containerName
            };
          } catch (error) {
            // Timeout or error - assume not running
            statuses[serviceName] = {
              running: false,
              status: 'check_timeout',
              container: containerName
            };
          }
        } else {
          statuses[serviceName] = {
            running: false,
            status: 'not_found',
            container: null
          };
        }
      } catch (error) {
        statuses[serviceName] = {
          running: false,
          status: 'error',
          container: null
        };
      }
    }

    res.json(statuses);
  } catch (error) {
    logger.error('Error getting service status:', error);
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

// Start service
router.post('/:serviceName/start', async (req: Request, res: Response) => {
  const { serviceName } = req.params;

  // Map service names to actual Docker container names
  const containerName = SERVICE_CONTAINERS[serviceName as keyof typeof SERVICE_CONTAINERS];

  if (!containerName) {
    return res.status(400).json({ error: 'Unknown service' });
  }

  try {
    // Try to find the container by searching for containers with the service name
    const { stdout } = await execAsync(`docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`);
    const actualContainerName = stdout.trim().split('\n')[0];

    if (!actualContainerName) {
      return res.status(404).json({ error: 'Container not found' });
    }

    logger.info(`Starting service: ${serviceName} (container: ${actualContainerName})`);

    // Start the container
    await execAsync(`docker start ${actualContainerName}`);

    logger.info(`Service started successfully: ${serviceName}`);
    res.json({
      success: true,
      message: `Service ${serviceName} started successfully`,
      service: serviceName,
      container: actualContainerName
    });
  } catch (error) {
    logger.error(`Error starting service ${serviceName}:`, error);
    res.status(500).json({
      error: 'Failed to start service',
      message: (error as Error).message
    });
  }
});

// Stop service
router.post('/:serviceName/stop', async (req: Request, res: Response) => {
  const { serviceName } = req.params;

  if (!SERVICE_CONTAINERS[serviceName as keyof typeof SERVICE_CONTAINERS]) {
    return res.status(400).json({ error: 'Unknown service' });
  }

  try {
    const containerName = await findContainerName(serviceName);

    if (!containerName) {
      return res.status(404).json({ error: 'Container not found' });
    }

    logger.info(`Stopping service: ${serviceName} (container: ${containerName})`);

    // Stop the container
    await execAsync(`docker stop ${containerName}`);

    logger.info(`Service stopped successfully: ${serviceName}`);
    res.json({
      success: true,
      message: `Service ${serviceName} stopped successfully`,
      service: serviceName,
      container: containerName
    });
  } catch (error) {
    logger.error(`Error stopping service ${serviceName}:`, error);
    res.status(500).json({
      error: 'Failed to stop service',
      message: (error as Error).message
    });
  }
});

// Restart service
router.post('/:serviceName/restart', async (req: Request, res: Response) => {
  const { serviceName } = req.params;

  if (!SERVICE_CONTAINERS[serviceName as keyof typeof SERVICE_CONTAINERS]) {
    return res.status(400).json({ error: 'Unknown service' });
  }

  try {
    const containerName = await findContainerName(serviceName);

    if (!containerName) {
      return res.status(404).json({ error: 'Container not found' });
    }

    logger.info(`Restarting service: ${serviceName} (container: ${containerName})`);

    // Restart the container
    await execAsync(`docker restart ${containerName}`);

    logger.info(`Service restarted successfully: ${serviceName}`);
    res.json({
      success: true,
      message: `Service ${serviceName} restarted successfully`,
      service: serviceName,
      container: containerName
    });
  } catch (error) {
    logger.error(`Error restarting service ${serviceName}:`, error);
    res.status(500).json({
      error: 'Failed to restart service',
      message: (error as Error).message
    });
  }
});

export default router;

