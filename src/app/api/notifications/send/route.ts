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

function isTodayMatch(dateStr: string): boolean {
  if (!dateStr) return false
  try {
    const parts = dateStr.split(/[-./]/)
    const d = new Date(parts.join('-'))
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret (protect from unauthorized access)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all members with their family info
    const { data: members } = await supabase
      .from('members')
      .select('name, birth_date, marriage_date, gender, families(head_name)')

    if (!members || members.length === 0) {
      return NextResponse.json({ message: 'No members found' })
    }

    // Find today's birthdays
    const todayBirthdays = members.filter(m => isTodayMatch(m.birth_date))
    // Find today's anniversaries
    const todayAnniversaries = members.filter(m => isTodayMatch(m.marriage_date))

    const notifications: { title: string; body: string; tag: string }[] = []

    if (todayBirthdays.length > 0) {
      const names = todayBirthdays.map(m => {
        const title = m.gender === 'Male' ? 'Bro.' : m.gender === 'Female' ? 'Sis.' : ''
        return `${title} ${m.name}`
      }).join(', ')

      notifications.push({
        title: '🎂 Birthday Today!',
        body: `${names} ${todayBirthdays.length === 1 ? 'has a' : 'have'} birthday today! Send them your wishes! 🙏`,
        tag: `birthday-${new Date().toISOString().split('T')[0]}`,
      })
    }

    if (todayAnniversaries.length > 0) {
      const names = todayAnniversaries.map(m => {
        const familyName = (m.families as any)?.head_name || m.name
        return familyName
      })
      const uniqueNames = [...new Set(names)]

      notifications.push({
        title: '💒 Wedding Anniversary!',
        body: `${uniqueNames.join(', ')} family ${uniqueNames.length === 1 ? 'has an' : 'have'} anniversary today! God bless them! 🙏`,
        tag: `anniversary-${new Date().toISOString().split('T')[0]}`,
      })
    }

    if (notifications.length === 0) {
      return NextResponse.json({ message: 'No birthdays or anniversaries today', sent: 0 })
    }

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscribers', notifications: notifications.length })
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

      for (const notif of notifications) {
        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title: notif.title,
              body: notif.body,
              tag: notif.tag,
              url: '/',
            })
          )
          sent++
        } catch (err: any) {
          console.error(`Push failed for ${sub.endpoint}:`, err?.statusCode || err)
          failed++
          // If subscription expired (410 Gone), mark for cleanup
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint)
          }
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

    return NextResponse.json({
      message: 'Notifications sent',
      sent,
      failed,
      cleaned: expiredEndpoints.length,
      notifications: notifications.length,
      subscribers: subscriptions.length,
    })
  } catch (err) {
    console.error('Send notification error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
