import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { name, slug: newSlug, trigger, instructions, output_format, example_output, executor_type } = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('skills')
    .update({ name, slug: newSlug, trigger, instructions, output_format, example_output, executor_type: executor_type ?? 'draft', updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServerClient()
  const { error } = await supabase.rpc('delete_skill_and_unlink', { skill_slug: slug })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
