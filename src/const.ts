import minimist from 'minimist'

export const DEV = __dirname.endsWith('src') ? 'DEV' : ''

if (DEV)
    console.clear()

const SPECIAL_URI = '/~/'
export const FRONTEND_URI = SPECIAL_URI + 'front/'
export const API_URI = SPECIAL_URI + 'api/'

export const argv = minimist(process.argv.slice(2))

export const METHOD_NOT_ALLOWED = 405
export const NO_CONTENT = 204
