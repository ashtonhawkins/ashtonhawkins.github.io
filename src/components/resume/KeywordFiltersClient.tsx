import { useEffect, useState } from "react";

type Props = {
  keywords: string[];
};

const applyFilters = (selected: string[]) => {
  const elements = document.querySelectorAll<HTMLElement>('[data-tags]');
  elements.forEach((element) => {
    const tags = element.dataset.tags ? element.dataset.tags.split(',') : [];
    if (selected.length === 0) {
      element.classList.remove('hidden');
      return;
    }
    const match = tags.some((tag) => selected.includes(tag));
    element.classList.toggle('hidden', !match);
  });
};

export default function KeywordFiltersClient({ keywords }: Props) {
  const [active, setActive] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTags = params.get('tags');
    if (urlTags) {
      const list = urlTags.split(',').filter((tag) => keywords.includes(tag));
      setActive(list);
      applyFilters(list);
    }
  }, [keywords]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (active.length > 0) {
      params.set('tags', active.join(','));
    } else {
      params.delete('tags');
    }
    history.replaceState(null, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    applyFilters(active);
  }, [active]);

  const toggle = (keyword: string) => {
    setActive((prev) => {
      if (prev.includes(keyword)) {
        return prev.filter((item) => item !== keyword);
      }
      return [...prev, keyword];
    });
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Keyword filters">
      {keywords.map((keyword) => (
        <button
          key={keyword}
          type="button"
          onClick={() => toggle(keyword)}
          aria-pressed={active.includes(keyword)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            active.includes(keyword)
              ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--ink)]'
              : 'border-[color-mix(in_srgb,var(--ink)_12%,transparent)] text-[var(--ink-2)] hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]'
          }`}
        >
          {keyword}
        </button>
      ))}
    </div>
  );
}
