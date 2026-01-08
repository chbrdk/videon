/**
 * Script zum Neu-Indizieren aller Videos
 * Fügt Qwen VL Beschreibungen zum Suchindex hinzu
 */
import { PrismaClient } from '@prisma/client';
import { SearchIndexService } from '../src/services/search-index.service';

const prisma = new PrismaClient();
const searchIndexService = new SearchIndexService();

async function reindexAllVideos() {
  try {
    console.log('🔍 Starting re-indexing of all videos...');
    
    // Hole alle Videos
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        originalName: true,
        status: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });
    
    console.log(`📊 Found ${videos.length} videos to re-index`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const video of videos) {
      try {
        // Überspringe Videos die noch nicht analysiert wurden
        if (video.status === 'UPLOADED' || video.status === 'ANALYZING') {
          console.log(`⏭️  Skipping video ${video.originalName} (status: ${video.status})`);
          skippedCount++;
          continue;
        }
        
        console.log(`🔄 Re-indexing video: ${video.originalName} (${video.id})`);
        await searchIndexService.indexVideo(video.id);
        successCount++;
        console.log(`✅ Successfully re-indexed: ${video.originalName}`);
      } catch (error: any) {
        console.error(`❌ Failed to re-index video ${video.originalName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Re-indexing Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`📦 Total: ${videos.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Re-indexing completed! Qwen VL descriptions are now searchable.');
    }
    
  } catch (error) {
    console.error('❌ Re-indexing failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
reindexAllVideos()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

