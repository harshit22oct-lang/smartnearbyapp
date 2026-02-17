import React, { useMemo, useState } from "react";

const clamp = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const PlaceCard = ({
  title,
  subtitle1,
  subtitle2,
  rightTop,
  buttonText,
  onOpen,
  onAction,
  imageUrl,
  badgeText,
}) => {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);

  const initials = useMemo(() => {
    const t = (title || "").trim();
    if (!t) return "MN";
    const p = t.split(" ").filter(Boolean);
    return ((p[0]?.[0] || "M") + (p[1]?.[0] || "N")).toUpperCase();
  }, [title]);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "140px 1fr auto",
        gap: 14,
        alignItems: "stretch",
        padding: 12,
        borderRadius: 18,
        background: "#fff",
        border: hover ? "1px solid #cfcfcf" : "1px solid #e9e9e9",
        boxShadow: hover
          ? "0 14px 32px rgba(0,0,0,0.12)"
          : "0 6px 18px rgba(0,0,0,0.06)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all 160ms ease",
        marginBottom: 12,
      }}
    >
      {/* IMAGE */}
      <div
        style={{
          width: 140,
          height: 110,
          borderRadius: 16,
          overflow: "hidden",
          background: "#f3f3f3",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 20,
              color: "#666",
              background: "linear-gradient(135deg,#eaeaea,#f7f7f7)",
            }}
          >
            {initials}
          </div>
        )}

        {badgeText ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: 999,
              background: "rgba(0,0,0,0.65)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.4)",
              backdropFilter: "blur(6px)",
            }}
          >
            {badgeText}
          </div>
        ) : null}
      </div>

      {/* CONTENT */}
      <div style={{ minWidth: 0, paddingTop: 2 }}>
        <h4
          style={{
            margin: 0,
            fontSize: 18,
            lineHeight: "22px",
            fontWeight: 800,
            ...clamp(2),
          }}
          title={title}
        >
          {title}
        </h4>

        {subtitle1 ? (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              color: "#444",
              ...clamp(2),
            }}
            title={subtitle1}
          >
            {subtitle1}
          </p>
        ) : null}

        {subtitle2 ? (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12.5,
              color: "#666",
              whiteSpace: "pre-line",
              ...clamp(3),
            }}
            title={subtitle2}
          >
            {subtitle2}
          </p>
        ) : null}
      </div>

      {/* ACTION */}
      <div
        style={{
          minWidth: 140,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        {rightTop ? (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#111",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid #e9e9e9",
              maxWidth: 140,
              ...clamp(1),
            }}
            title={rightTop}
          >
            {rightTop}
          </div>
        ) : (
          <div style={{ height: 28 }} />
        )}

        {buttonText ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(e);
            }}
            style={{
              padding: "9px 12px",
              borderRadius: 12,
              border: hover ? "1px solid #cfcfcf" : "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 160ms ease",
            }}
          >
            {buttonText}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default PlaceCard;
