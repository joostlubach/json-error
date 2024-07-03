/* eslint-disable no-console */

import { NextFunction, Request, Response } from 'express'
import { isFunction } from 'ytil'

export default function jsonError(options: JSONErrorOptions = {}) {
  return (error: Error, _: Request, response: Response, next: NextFunction) => {
    let status: number = (error as any).status
    if (status === undefined) { status = 500 }

    // Set the status to HTTP 500, but only if it was not already set to some error code.
    // For instance, someone may want to send an error using code 512, or 401.
    if (response.statusCode && response.statusCode < 400) {
      response.status(status)
    }

    const {mask = true} = options

    let json
    if (isJSONError(error)) {
      // Let the error serialize itself. Pass a flag to determine if internal details should be included.
      json = {
        status,
        error: error.toJSON({mask: mask ? 'always' : 'auto'}),
      }
    } else if (status < 500) {
      // Provide an error message.
      json = {status, error: {message: error.message}}
    } else {
      json = {status, error: {message: 'Internal error'}}
      if (!mask) {
        Object.assign(json.error, {stack: parseStack(error.stack)})
      }

      // Log the original error in any case, as details will be lost.
      const logged = options.logInternal?.(error) ?? false
      if (!logged) {
        console.error(`An error occurred: ${error.stack}`)
        if (isJSONError(error)) {
          console.error(error.toJSON({mask: 'never'}))
        }
      }
    }

    response.json(json)
    next()
  }
}

export interface JSONErrorOptions {
  logInternal?: (error: Error) => boolean
  mask?:        boolean
}

interface JSONError extends Error {
  toJSON(options?: ToJSONOptions<JSONError>): Record<string, any>
}

export interface ToJSONOptions<E extends Error> {
  /**
   * Set this to true to apply masking. That is, hide sensitive details from the error.
   */
  mask?: 'always' | 'never' | 'auto'

  /**
   * Specify a function that determines whether a specific error should be masked if the `mask` option above is
   * set to `auto`.
   */
  maskForError?: (error: E) => boolean
}

export function isJSONError(error: Error): error is JSONError {
  if (!isFunction((error as any).toJSON)) { return false }

  return true
}

export function parseStack(stack: string | undefined) {
  if (stack == null) { return undefined}

  return stack
    .split('\n')
    .slice(1)
    .map(line => line.trim().replace(/^at\s*/, ''))
}