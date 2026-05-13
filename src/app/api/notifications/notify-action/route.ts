import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:admin@tph.local',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { title, body, url } = await req.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscribers' })
    }

    let sent = 0
    let failed = 0
    const expiredEndpoints: string[] = []

    // Send notifications to all subscribers
    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      }

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body,
            tag: `action-${Date.now()}`,
            url: url || '/',
          })
        )
        sent++
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint}:`, err?.statusCode || err)
        failed++
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint)
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints)
    }

    return NextResponse.json({ success: true, sent, failed })
  } catch (err) {
    console.error('Notify action error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
