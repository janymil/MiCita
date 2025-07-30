import { Request, Response } from 'express';
import { ScrapingOrchestrator } from '../../../../services/scraping-orchestrator';

export const getScrapingResults = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: 'Job ID is required'
            });
        }

        const orchestrator = new ScrapingOrchestrator();
        const job = await orchestrator.getJobStatus(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: `Job is not completed yet. Current status: ${job.status}`,
                status: job.status,
                progress: job.progress
            });
        }

        // Return the processed data from the completed job
        res.status(200).json({
            success: true,
            data: {
                businessData: job.processedData,
                rawData: job.rawData,
                qualityScore: job.qualityScore,
                completedAt: job.completedAt,
                status: job.status
            }
        });

    } catch (error) {
        console.error('❌ Failed to get scraping results:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to get scraping results',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
