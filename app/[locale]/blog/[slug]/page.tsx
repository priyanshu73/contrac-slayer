import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import { blogPosts, getBlogPost } from "@/lib/blog/posts"

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: "Blog | ContractorOps" }
  return {
    title: `${post.title} | ContractorOps`,
    description: post.description,
  }
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />

      <section className="rounded-b-[2rem] bg-slate-950 px-5 pb-14 pt-32 text-white sm:px-8 lg:pt-36">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-2 text-sm font-bold text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All posts
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/50">
            {post.category} · {post.readTime} · {formatDate(post.publishedAt)}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-normal text-white sm:text-5xl">{post.title}</h1>
        </div>
      </section>

      <article className="px-5 pb-16 pt-10 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[#eadfd7] bg-white/80 p-5 text-base leading-7 text-slate-700">
            <span className="font-black text-slate-950">The short version: </span>
            {post.summary}
          </div>

          <div className="prose prose-slate mt-10 max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:mt-12 prose-a:text-slate-950 prose-img:rounded-xl prose-img:border prose-img:border-[#eadfd7] prose-img:bg-white">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => {
                  if (href?.startsWith("#source-")) {
                    return (
                      <sup>
                        <a href={href} className="font-semibold text-slate-500 no-underline hover:text-slate-950">
                          {children}
                        </a>
                      </sup>
                    )
                  }
                  return (
                    <a href={href} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  )
                },
              }}
            >
              {post.body}
            </ReactMarkdown>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-lg font-black">See what ContractorOps would find in your area.</p>
              <p className="mt-2 text-sm leading-6 text-white/68">Start a free trial and set up your outreach in minutes.</p>
            </div>
            <Link
              href={`/${locale}/auth/signup`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-white/90"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <section className="mt-12 border-t border-[#eadfd7] pt-8">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Sources</h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
              {post.sources.map((source) => (
                <li key={source.id} id={`source-${source.id}`} className="scroll-mt-28">
                  <span className="font-bold text-slate-950">{source.id}.</span> {source.label}{" "}
                  <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-slate-500 underline hover:text-slate-950">
                    {source.url}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>

      <LandingFooter />
    </main>
  )
}
