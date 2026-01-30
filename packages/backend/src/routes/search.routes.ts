import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router: Router = Router();
const searchController = new SearchController();

router.get('/', (req, res) => searchController.search(req, res));
router.get('/entities', (req, res) => searchController.searchEntities(req, res));
router.post('/videos/:videoId/index', (req, res) => searchController.indexVideo(req, res));

export default router;