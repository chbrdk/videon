import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { SearchIndexService } from '../services/search-index.service';
import logger from '../utils/logger';

const searchService = new SearchService();
const searchIndexService = new SearchIndexService();

export class SearchController {
  async search(req: Request, res: Response) {
    try {
      const { q, limit } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      
      const results = await searchService.search(
        q, 
        limit ? parseInt(limit as string) : 20
      );
      
      res.json(results);
    } catch (error) {
      logger.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
  
  async indexVideo(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      await searchIndexService.indexVideo(videoId);
      res.json({ message: 'Video indexed successfully' });
    } catch (error) {
      logger.error('Indexing error:', error);
      res.status(500).json({ error: 'Indexing failed' });
    }
  }
}
