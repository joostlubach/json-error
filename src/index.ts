/* eslint-disable no-console */

import { NextFunction, Request, Response } from 'express'
import { isFunction } from 'lodash'

const DEV = process.env.NODE_ENV !== 'production'

export default function jsonError() {
  return (error: Error, _: Request, response: Response, next: NextFunction) => {
    let status: number = (error as any).status
    if (status === undefined) { status = 500 }

    // Set the status to HTTP 500, but only if it was not already set to some error code.
    // For instance, someone may want to send an error using code 512, or 401.
    if (response.statusCode && response.statusCode < 400) {
      response.status(status)
    }

    let json
    if (isJSONError(error)) {
      // Let the error serialize itself. Pass a flag to determine if internal details should be included.
      json = {status, error: error.toJSON(DEV)}
    } else if (status < 500) {
      // Provide an error message.
      json = {status, error: {message: error.message}}
    } else {
      // No details.
      json = {status, error: {message: 'Internal error'}}
    }

    // Log the original error in any case, as details will be lost.
    if (response.statusCode >= 500) {
      console.error(`An error occurred: ${error.stack}`)
      if (isJSONError(error)) {
        console.error(error.toJSON(true))
      }
    }

    response.json(json)
    next()
  }
}

interface JSONError extends Error {
  toJSON(verbose?: boolean): Record<string, any>
}

export function isJSONError(error: Error): error is JSONError {
  if (!isFunction((error as any).toJSON)) { return false }

  return true
}