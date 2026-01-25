import { promises as fs } from 'fs';
import path from 'path';

async function initNotesDirectory() {
  try {
    // Create the uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'notes');
    await fs.mkdir(uploadDir, { recursive: true });
    
    console.log(`Notes upload directory created at: ${uploadDir}`);
    
    // Write a sample .gitkeep file to ensure the directory is tracked
    const gitkeepPath = path.join(uploadDir, '.gitkeep');
    await fs.writeFile(gitkeepPath, '');
    
    console.log('Initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing notes directory:', error);
  }
}

initNotesDirectory();