import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json()

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Upsert the subscription (update if endpoint exists, insert if not)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('Supabase upsert error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
