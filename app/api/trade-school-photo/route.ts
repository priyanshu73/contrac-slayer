import photo from './photo.json'

// Static illustrative workshop JPEG, bundled at build time. No user input or network calls.
export const dynamic = 'force-static'
export function GET() {
  return new Response(Buffer.from(photo.base64, 'base64'), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
  })
}
