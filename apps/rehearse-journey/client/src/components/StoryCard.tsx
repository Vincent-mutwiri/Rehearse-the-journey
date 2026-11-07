import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { StoryDef } from '../stories'

interface StoryCardProps {
  story: StoryDef
  onClose: () => void
}

/**
 * A story-style card shown next to Joy's mascot. The bot opens it; the person
 * pages through slides manually (Prev/Next) — no auto-advance, so it stays
 * usable with a screen reader and under reduced motion.
 */
export default function StoryCard({ story, onClose }: StoryCardProps) {
  const [index, setIndex] = useState(0)

  // Reopening the same story (or switching stories) restarts at slide one.
  useEffect(() => {
    setIndex(0)
  }, [story.id])

  const slide = story.slides[Math.min(index, story.slides.length - 1)]
  const last = index >= story.slides.length - 1

  return (
    <section className="story-card" aria-label={`Story: ${story.title}`}>
      <header className="story-card-header">
        <div className="story-card-titles">
          {story.kicker && <span className="story-card-kicker">{story.kicker}</span>}
          <h2 className="story-card-title">{story.title}</h2>
        </div>
        <button
          type="button"
          className="story-card-close"
          onClick={onClose}
          aria-label="Close story"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="story-card-body" aria-live="polite" key={slide.id}>
        {slide.kind === 'custom' && slide.render ? (
          slide.render()
        ) : (
          <div className="story-card-text">
            {slide.title && <h3>{slide.title}</h3>}
            {slide.body && <p>{slide.body}</p>}
          </div>
        )}
      </div>

      <footer className="story-card-footer">
        <div className="story-card-progress" aria-hidden="true">
          {story.slides.map((s, i) => (
            <span key={s.id} className={`story-card-dot${i === index ? ' is-active' : ''}`} />
          ))}
        </div>
        <div className="story-card-nav">
          <button
            type="button"
            className="story-card-nav-btn"
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            <ChevronLeft aria-hidden="true" />
            <span>Back</span>
          </button>
          <button
            type="button"
            className="story-card-nav-btn"
            onClick={() => (last ? onClose() : setIndex(i => i + 1))}
          >
            <span>{last ? 'Done' : 'Next'}</span>
            {!last && <ChevronRight aria-hidden="true" />}
          </button>
        </div>
      </footer>
    </section>
  )
}
