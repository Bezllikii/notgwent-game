import { Request, Response } from 'express'

export const wsLogger = () => (req: Request, res: Response, next) => {
	next()
	// @ts-ignore
	if (req.ws) {
		console.info(`WS ${req.baseUrl}${req.url}`)
	}
}
