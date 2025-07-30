import { Request, Response } from 'express';
import { ScrapingOrchestrator } from '../../../../services/scraping-orchestrator';

export const getScrapingStatus = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: 'Job ID is required'
            });
        }

        const orchestrator = new ScrapingOrchestrator();
        const status = await orchestrator.getJobStatus(jobId);

        res.status(200).json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('❌ Failed to get scraping status:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to get scraping status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
