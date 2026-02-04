import convert from 'heic-convert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Image converter for handling HEIC and other formats
 * Converts HEIC to JPEG for X API compatibility
 */
export class ImageConverter {
  private tempDir: string;

  constructor() {
    // Create temp directory for converted images
    this.tempDir = join(__dirname, '..', '.temp-images');
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
    console.log(`Image converter initialized. Temp dir: ${this.tempDir}`);
  }

  /**
   * Expand ~ to home directory if present
   */
  private expandPath(filePath: string): string {
    if (filePath.startsWith('~')) {
      return filePath.replace('~', homedir());
    }
    return filePath;
  }

  /**
   * Check if a file needs conversion (is HEIC format)
   */
  needsConversion(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const needs = ext === '.heic' || ext === '.heif';
    console.log(`  Checking if conversion needed for ${basename(filePath)}: ${needs ? 'YES' : 'NO'} (ext: ${ext})`);
    return needs;
  }

  /**
   * Convert HEIC image to JPEG using heic-convert library
   * @param heicPath - Path to HEIC file
   * @returns Path to converted JPEG file
   */
  async convertToJpeg(heicPath: string): Promise<string> {
    try {
      // Expand path if it contains ~
      const expandedPath = this.expandPath(heicPath);
      console.log(`  Converting HEIC to JPEG: ${basename(heicPath)}`);
      console.log(`  Full path: ${expandedPath}`);

      // Read the HEIC file
      const inputBuffer = readFileSync(expandedPath);
      console.log(`  Read ${inputBuffer.length} bytes from HEIC file`);

      // Convert to JPEG using heic-convert
      const outputBuffer = await convert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9
      });

      // Generate output path
      const fileName = basename(heicPath, extname(heicPath));
      const outputPath = join(this.tempDir, `${fileName}.jpg`);

      // Write the converted file
      writeFileSync(outputPath, Buffer.from(outputBuffer));
      console.log(`  Converted successfully: ${outputPath}`);
      console.log(`  Output size: ${outputBuffer.byteLength} bytes`);

      return outputPath;
    } catch (error) {
      console.error(`  Failed to convert HEIC image:`, error);
      throw new Error(`HEIC conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process an image path - convert if needed, otherwise return original
   * @param imagePath - Original image path
   * @returns Path to upload-ready image
   */
  async processImage(imagePath: string): Promise<string> {
    // Expand path if it contains ~
    const expandedPath = this.expandPath(imagePath);

    console.log(`  Processing image: ${imagePath}`);
    console.log(`  Expanded path: ${expandedPath}`);

    if (!existsSync(expandedPath)) {
      throw new Error(`Image file not found: ${expandedPath}`);
    }

    if (this.needsConversion(imagePath)) {
      return await this.convertToJpeg(imagePath);
    }

    // Return the expanded path for non-HEIC images
    return expandedPath;
  }

  /**
   * Clean up temporary converted images
   */
  cleanup(): void {
    try {
      console.log('Image converter cleanup (temp files kept in .temp-images/)');
    } catch (error) {
      console.warn('Failed to cleanup temp images:', error);
    }
  }
}
