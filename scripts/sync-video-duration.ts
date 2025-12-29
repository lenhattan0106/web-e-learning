import 'dotenv/config';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Replace get-video-duration with fluent-ffmpeg
import ffmpeg from 'fluent-ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';

ffmpeg.setFfprobePath(ffprobePath);

/**
 * Get video duration from URL with retry logic using fluent-ffmpeg
 */
async function getDurationWithRetry(url: string, retries = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      ffmpeg.ffprobe(url, (err, metadata) => {
        if (err) {
          if (retries < MAX_RETRIES) {
            console.log(`  Retry ${retries + 1}/${MAX_RETRIES} after ${RETRY_DELAY}ms...`);
             setTimeout(() => {
                getDurationWithRetry(url, retries + 1).then(resolve).catch(reject);
             }, RETRY_DELAY);
          } else {
             reject(err);
          }
          return;
        }
        
        const duration = metadata.format.duration;
        if (typeof duration === 'number') {
           resolve(Math.round(duration));
        } else {
           // Should fail if no duration
           reject(new Error("Could not determine duration"));
        }
      });
    };
    attempt();
  });
}

/**
 * Main sync function
 */
async function syncVideoDuration() {
  console.log('🎬 Starting video duration sync...\n');

  // Find all lessons with videos but no duration
  const lessons = await prisma.baiHoc.findMany({
    where: {
      maVideo: { not: null },
      OR: [
        { thoiLuong: 0 },
        { thoiLuong: null },
      ],
    },
    select: {
      id: true,
      tenBaiHoc: true,
      maVideo: true,
      chuong: {
        select: {
          idKhoaHoc: true,
        },
      },
    },
  });

  console.log(`📊 Found ${lessons.length} lessons to process\n`);

  let successCount = 0;
  let failCount = 0;
  const failedLessons: { id: string; title: string; error: string }[] = [];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    console.log(`[${i + 1}/${lessons.length}] Processing: ${lesson.tenBaiHoc}`);

    try {
      if (!lesson.maVideo) {
        console.log(`  ⚠️  No video URL, skipping\n`);
        continue;
      }

      // Construct full URL
      // Hardcoded for now based on use-contruct-url.ts, as loading env in scripts can be tricky without setup
      // Assuming bucket name is 'lms-app' based on common patterns or I should check .env. 
      // safer approach: try to read it from process.env, fallback to a placeholder that user might need to fix, 
      // OR better: use the valid domain directly if known.
      // Let's check .env content first? I can't.
      // I will trust the user to have .env loaded by `tsx` (it usually does load .env).
      const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES || "";
      let fullUrl = lesson.maVideo;
      
      if (!fullUrl.startsWith("http")) {
         if (bucketName) {
            fullUrl = `https://${bucketName}.t3.storage.dev/${lesson.maVideo}`;
         } else {
             // Fallback if env not found - try to guess or just warn
             console.log(`  ⚠️  Missing NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES env var, trying raw key (likely fail)...`);
         }
      }

      // Get duration with retry logic
      const duration = await getDurationWithRetry(fullUrl);

      // Update lesson
      await prisma.baiHoc.update({
        where: { id: lesson.id },
        data: { thoiLuong: duration },
      });

      successCount++;
      console.log(`  ✅ Updated: ${duration} seconds\n`);
    } catch (error) {
      failCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failedLessons.push({
        id: lesson.id,
        title: lesson.tenBaiHoc,
        error: errorMessage,
      });
      console.log(`  ❌ Failed: ${errorMessage}\n`);
    }
  }

  // Update course durations
  console.log('\n🔄 Recalculating course durations...');
  
  const courses = await prisma.khoaHoc.findMany({
    include: {
      chuongs: {
        include: {
          baiHocs: {
            select: {
              thoiLuong: true,
            },
          },
        },
      },
    },
  });

  for (const course of courses) {
    let totalDuration = 0;
    for (const chapter of course.chuongs) {
      for (const lesson of chapter.baiHocs) {
        if (lesson.thoiLuong) {
          totalDuration += lesson.thoiLuong;
        }
      }
    }

    await prisma.khoaHoc.update({
      where: { id: course.id },
      data: { thoiLuong: totalDuration },
    });
  }

  console.log(`✅ Updated ${courses.length} courses\n`);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 SYNC SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed:  ${failCount}`);
  console.log(`📚 Total:   ${lessons.length}\n`);

  if (failedLessons.length > 0) {
    console.log('Failed lessons:');
    failedLessons.forEach((lesson) => {
      console.log(`  - ${lesson.title} (${lesson.id}): ${lesson.error}`);
    });
  }
}

// Run the migration
syncVideoDuration()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
