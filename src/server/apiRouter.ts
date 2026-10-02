import { Router, Request, Response } from 'express';
import { processBillImageWithGemini } from './geminiService';

export const apiRouter = Router();

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'BillMaster API', version: '2.4.0' });
});

apiRouter.post('/scan-bill', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Image data (imageBase64) is required.' });
      return;
    }

    const extracted = await processBillImageWithGemini(imageBase64, mimeType || 'image/jpeg');
    res.json({ success: true, data: extracted });
  } catch (error: any) {
    console.error('Error processing bill:', error);
    res.status(500).json({
      error: 'Failed to process bill image.',
      message: error?.message || 'AI processing error. Please retry or enter manually.',
    });
  }
});
