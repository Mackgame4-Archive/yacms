"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <div className="page"><div className="empty"><h1>Something went wrong</h1><p>The requested CMS data could not be loaded.</p><button className="button" onClick={reset}>Try again</button></div></div>; }
