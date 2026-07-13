import * as client from 'openid-client'
import { isAdminEmail } from './auth.js'
import { upsertSsoUser } from './db.js'

const TENANT = process.env.AZURE_TENANT_ID || ''
const CLIENT_ID = process.env.AZURE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI || ''

/** Whether all the Entra settings are present. When false, SSO routes 503. */
export const ssoConfigured = Boolean(TENANT && CLIENT_ID && CLIENT_SECRET && REDIRECT_URI)

// Absolute origin the browser lands on for the callback (used to rebuild the URL).
export const REDIRECT_ORIGIN = REDIRECT_URI ? new URL(REDIRECT_URI).origin : ''

let _config = null
async function getConfig() {
  if (_config) return _config
  const issuer = new URL(`https://login.microsoftonline.com/${TENANT}/v2.0`)
  // Single-tenant issuer; confidential client using client_secret_post (Entra-friendly).
  _config = await client.discovery(
    issuer,
    CLIENT_ID,
    undefined,
    client.ClientSecretPost(CLIENT_SECRET),
  )
  return _config
}

/** Build the Entra authorization URL + the PKCE/state/nonce to stash in a cookie. */
export async function buildLoginUrl() {
  const config = await getConfig()
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })

  return { url: url.href, codeVerifier, state, nonce }
}

/**
 * Complete the login: exchange the code, validate state/nonce/tenant, and
 * upsert the user. `currentUrl` must be the absolute callback URL (with query).
 */
export async function completeLogin(currentUrl, { codeVerifier, state, nonce }) {
  const config = await getConfig()

  const tokens = await client.authorizationCodeGrant(config, new URL(currentUrl), {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
    expectedNonce: nonce,
    idTokenExpected: true,
  })

  const claims = tokens.claims() ?? {}

  // Defense in depth: the single-tenant authority already restricts this, but
  // reject anything whose tenant id doesn't match.
  if (TENANT && claims.tid && claims.tid !== TENANT) {
    throw new Error('Tenant no autorizado')
  }

  const email = String(claims.email || claims.preferred_username || '').trim()
  if (!email) throw new Error('El token no incluye un correo')
  const name = String(claims.name || email).trim()
  const oid = String(claims.oid || claims.sub)

  return upsertSsoUser({ oid, email, name, isAdmin: isAdminEmail(email) })
}
