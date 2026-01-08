import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router: Router = Router();
const searchController = new SearchController();

router.get('/', searchController.search);
router.post('/videos/:videoId/index', searchController.indexVideo);

export default router;