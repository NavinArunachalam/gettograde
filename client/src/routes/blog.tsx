import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "../components/site/Layout";
import { ArrowUpRight, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { api, getAssetUrl } from "@/lib/api";
import { BlogDetailModal } from "@/components/home/BlogDetailModal";

export const Route = createFileRoute("/blog")({ component: Blog });

function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const res = await api.get("/public/blogs");
        if (res.success && res.blogs) {
          setPosts(res.blogs);
        }
      } catch (err) {
        console.error("Error fetching blogs:", err);
      }
    };
    loadBlogs();
  }, []);

  const hero = posts.find(p => p.featured) || posts[0] || null;
  const rest = hero ? posts.filter(p => p !== hero) : [];

  return (
    <PublicLayout>
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-plum">— Journal</div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl lg:text-7xl font-bold text-plum-dark tracking-[-0.03em] leading-[1.02]">
            Notes from the<br/><span className="text-plum">clinical floor.</span>
          </h1>

          {/* Featured — guard against null hero */}
          {hero && (
            <article
              className="mt-14 group grid lg:grid-cols-2 gap-8 rounded-3xl border border-border bg-card overflow-hidden cursor-pointer"
              onClick={() => setSelectedPost(hero)}
            >
              <div className={`relative aspect-[16/10] lg:aspect-auto ${hero.image ? "" : "bg-gradient-to-br from-plum to-plum-dark"} overflow-hidden`}>
                {hero.image ? (
                  <img src={getAssetUrl(hero.image)} alt={hero.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-noise opacity-30" />
                )}
                <span className="absolute top-4 left-4 rounded-full bg-lime px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-plum-dark">Featured · {hero.cat || hero.category}</span>
              </div>
              <div className="p-8 lg:p-10 flex flex-col justify-center">
                <div className="text-xs text-foreground/55 font-mono">{hero.date} · {hero.read || hero.readTime} read</div>
                <h2 className="mt-3 font-display text-2xl lg:text-4xl font-bold text-plum-dark leading-tight">{hero.title}</h2>
                <p className="mt-4 text-foreground/70 leading-relaxed line-clamp-3">{hero.excerpt}</p>
                <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-plum-dark w-fit group-hover:gap-3 transition-all">
                  Read article <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          )}

          {/* Grid */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map(p => (
              <article
                key={p._id || p.id || p.title}
                className="group rounded-3xl border border-border bg-card overflow-hidden hover:-translate-y-1 transition-all flex flex-col cursor-pointer"
                onClick={() => setSelectedPost(p)}
              >
                <div className={`relative aspect-[16/10] ${p.image ? "" : "bg-gradient-to-br from-plum-dark to-plum"} overflow-hidden`}>
                  {p.image ? (
                    <img src={getAssetUrl(p.image)} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-noise opacity-30" />
                  )}
                  <span className="absolute top-4 left-4 rounded-full bg-cream/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-plum-dark">{p.cat || p.category}</span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="text-xs text-foreground/55 font-mono flex items-center gap-2">{p.date} <span>·</span> <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{p.read || p.readTime} read</span></div>
                  <h3 className="mt-3 font-display font-semibold text-plum-dark leading-snug">{p.title}</h3>
                  <p className="mt-2 text-sm text-foreground/70 line-clamp-2">{p.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Detail Modal */}
      {selectedPost && (
        <BlogDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </PublicLayout>
  );
}