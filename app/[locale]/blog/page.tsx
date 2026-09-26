import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import { blogPosts } from "@/lib/blog/posts"

export const metadata = {
  title: "Blog | ContractorOps",
  description: "Practical, sourced writing for contractors on growth, leads, and running the business.",
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />

      <section className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-16 pt-32 text-white sm:px-8 lg:pt-36">
        <img src="/hero2.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,14,22,0.78),rgba(8,14,22,0.62)_50%,rgba(8,14,22,0.8))]" />
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/62">ContractorOps Blog</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-normal sm:text-5xl">
            Straight talk on growing a contracting business.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/76">
            Sourced numbers and practical habits, written for owners who would rather be on the job.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/${locale}/blog/${post.slug}`}
              className="group grid overflow-hidden rounded-2xl border border-[#eadfd7] bg-white/80 shadow-[0_18px_60px_rgba(96,75,64,0.08)] transition-shadow hover:shadow-[0_24px_70px_rgba(96,75,64,0.14)] lg:grid-cols-[1.1fr_1fr]"
            >
              <div className="flex items-center justify-center bg-white p-4">
                <img src={post.heroImage} alt="" className="h-auto w-full max-w-xl" />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {post.category} · {post.readTime}
                </p>
                <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">{post.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">{post.description}</p>
                <p className="mt-6 flex items-center gap-2 text-sm font-black text-slate-950">
                  Read the post
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </p>
                <p className="mt-4 text-xs text-slate-400">{formatDate(post.publishedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
