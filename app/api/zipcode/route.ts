import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const zip = searchParams.get('zip')

  if (!zip) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.API_NINJA_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API_NINJA_KEY is not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://api.api-ninjas.com/v1/zipcode?zip=${encodeURIComponent(zip)}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `API request failed: ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching zipcode data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch zipcode data' },
      { status: 500 }
    )
  }
}
