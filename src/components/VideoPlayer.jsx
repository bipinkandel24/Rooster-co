import React from "react";

function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      if (parsed.pathname.startsWith("/embed/")) {
        return `${url}${url.includes("?") ? "&" : "?"}autoplay=1&rel=0`;
      }
    }
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.substring(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    return url;
  } catch {
    return url;
  }
}

export default function VideoPlayer({ src, label, onClose }) {
  const embedUrl = getYouTubeEmbedUrl(src);

  return (
    <div className="rc-video-modal">
      <div className="rc-video-modal-header">
        <span>{label}</span>
        <button onClick={onClose} className="rc-close-btn">Close</button>
      </div>

      <div className="rc-video-frame">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={label}
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="rc-video-placeholder">
            Add a YouTube link for this training video in src/data/content.js
          </div>
        )}
      </div>

      <p className="rc-video-note">Video plays inside the Rooster &amp; Co training app.</p>
    </div>
  );
}
