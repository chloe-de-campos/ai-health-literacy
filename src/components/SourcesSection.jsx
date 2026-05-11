import React from 'react';
import SOURCES from '../data/sources';

export default function SourcesSection() {
  return (
    <section className="sources-section">
      <h2 className="sources-title">Sources</h2>
      <ol className="sources-list">
        {SOURCES.map(s => (
          <li key={s.id} id={`source-${s.id}`} className="sources-item">
            <span className="source-authors">{s.authors}</span> ({s.year}).{' '}
            <em>{s.title}</em>.{' '}
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
              >
                {s.url}
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
