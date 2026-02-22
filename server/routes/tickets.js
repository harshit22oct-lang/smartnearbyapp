const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

const Event = require("../models/Event");
const Ticket = require("../models/Ticket");

const isAdmin = (req) => !!req.user?.isAdmin;

const signQrToken = (ticketMongoId, eventId) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign(
    { tid: String(ticketMongoId), eid: String(eventId) },
    process.env.JWT_SECRET,
    { expiresIn: "365d" }
  );
};

const verifyQrToken = (token) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.verify(token, process.env.JWT_SECRET);
};

// ✅ Shared secure validation flow (qrToken JWT)
const validateQrTokenFlow = async ({ code, adminUserId }) => {
  // 1) verify token
  let payload;
  try {
    payload = verifyQrToken(code);
  } catch {
    return { status: 400, body: { message: "Invalid or expired QR" } };
  }

  const tid = payload?.tid;
  if (!tid) return { status: 400, body: { message: "Invalid QR payload" } };

  // 2) load ticket
  const t = await Ticket.findById(tid)
    .populate("event")
    .populate("user", "name email profilePicture");

  if (!t) return { status: 404, body: { message: "Ticket not found" } };

  // 3) hard-bind token must match stored token
  if (String(t.qrToken || "") !== String(code || "")) {
    return { status: 400, body: { message: "QR does not match ticket" } };
  }

  // (optional) event bind
  if (payload?.eid && String(t.event?._id) !== String(payload.eid)) {
    return { status: 400, body: { message: "QR event mismatch" } };
  }

  // 4) prevent double use
  if (t.status === "validated") {
    return {
      status: 409,
      body: {
        ok: false,
        message: `Already Verified at ${t.scannedAt ? new Date(t.scannedAt).toLocaleString() : ""}`,
        ticket: t,
      },
    };
  }

  if (t.status && t.status !== "unused") {
    return {
      status: 409,
      body: { ok: false, message: `Ticket is ${t.status}`, ticket: t },
    };
  }

  // 5) mark validated
  const now = new Date();
  t.status = "validated";

  // audit fields
  t.scannedAt = now;
  t.scannedBy = adminUserId;

  // optional extra fields (only if your schema allows; harmless if not strict)
  t.validatedAt = now;
  t.validatedBy = adminUserId;

  await t.save();

  return { status: 200, body: { ok: true, message: "Verified ✅", ticket: t } };
};

// ✅ Book ticket/pass
// POST /api/tickets/book  { eventId }
router.post("/book", protect, async (req, res) => {
  try {
    const { eventId } = req.body || {};
    if (!eventId) return res.status(400).json({ message: "eventId required" });

    const ev = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    // ✅ enforce button rules
    if (!ev.isCurated || !ev.hasTickets) {
      return res.status(400).json({ message: "Tickets not available for this event" });
    }

    // ✅ block booking if no profile picture
    if (!req.user?.profilePicture) {
      return res.status(400).json({
        code: "PROFILE_REQUIRED",
        message: "Please upload profile picture before booking",
      });
    }

    // ✅ prevent double booking
    const existing = await Ticket.findOne({ event: ev._id, user: req.user.id }).select("_id status");
    if (existing) {
      return res.status(400).json({ message: "You already booked this event" });
    }

    // ✅ capacity / sold out protection
    const sold = Number(ev.ticketsSold || 0);
    const cap = Number(ev.capacity || 0);
    if (cap > 0 && sold >= cap) {
      return res.status(400).json({ message: "Sold out" });
    }

    // ✅ create ticket first (need _id)
    const ticketId = uuidv4(); // display/reference only
    const created = await Ticket.create({
      event: ev._id,
      user: req.user.id,
      ticketId,
      amount: ev.price || 0,
      currency: "INR",
      status: "unused",
      paymentProvider: "test",
      paymentRef: "",
      qty: 1,
      qrToken: "TEMP", // will set below
      qrBase64: "",
    });

    // ✅ secure token bound to ticket+event
    const qrToken = signQrToken(created._id, ev._id);

    // ✅ QR image encodes secure token
    const qrBase64 = await QRCode.toDataURL(qrToken);

    created.qrToken = qrToken;
    created.qrBase64 = qrBase64;
    await created.save();

    // ✅ increment ticketsSold
    ev.ticketsSold = sold + 1;
    await ev.save();

    return res.status(201).json({ message: "Booked", ticket: created });
  } catch (err) {
    console.error("Book ticket error:", err);
    return res.status(500).json({ message: "Server error (book ticket)" });
  }
});

// ✅ User orders list
// GET /api/tickets/mine
router.get("/mine", protect, async (req, res) => {
  try {
    const list = await Ticket.find({ user: req.user.id })
      .populate("event", "title city category venue startAt bannerImage price")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json(list);
  } catch (err) {
    console.error("Mine tickets error:", err);
    return res.status(500).json({ message: "Server error (mine tickets)" });
  }
});

// ✅ User cancel/remove own ticket
// POST /api/tickets/:id/cancel
// POST /api/tickets/:id/remove
const cancelTicketHandler = async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (!isAdmin(req) && String(t.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (t.status === "validated") {
      return res.status(400).json({ message: "Validated ticket cannot be removed" });
    }
    if (t.status === "cancelled") {
      return res.status(400).json({ message: "Ticket already removed" });
    }

    t.status = "cancelled";
    await t.save();

    // keep event sold counter in sync
    const ev = await Event.findById(t.event);
    if (ev) {
      const qty = Number(t.qty || 1);
      ev.ticketsSold = Math.max(0, Number(ev.ticketsSold || 0) - qty);
      await ev.save();
    }

    return res.json({ message: "Ticket removed", ticketId: String(t._id) });
  } catch (err) {
    console.error("Cancel ticket error:", err);
    return res.status(500).json({ message: "Server error (cancel ticket)" });
  }
};
router.post("/:id/cancel", protect, cancelTicketHandler);
router.post("/:id/remove", protect, cancelTicketHandler);

// ✅ Ticket details (user own OR admin)
// GET /api/tickets/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id)
      .populate("event")
      .populate("user", "name email profilePicture");

    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (!isAdmin(req) && String(t.user?._id) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    return res.json(t);
  } catch (err) {
    console.error("Ticket detail error:", err);
    return res.status(500).json({ message: "Server error (ticket detail)" });
  }
});

/**
 * ✅ Recommended Admin validate endpoint (SECURE)
 * POST /api/tickets/validate  { code }
 * - code should be the scanned qrToken (JWT string)
 */
router.post("/validate", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const code = String(req.body?.code || "").trim();
    if (!code) return res.status(400).json({ message: "code required" });

    const out = await validateQrTokenFlow({ code, adminUserId: req.user.id });
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error("Validate error:", err);
    return res.status(500).json({ message: "Server error (validate)" });
  }
});

/**
 * ✅ Backward compat endpoint
 * POST /api/tickets/validate-by-code { code }
 * Supports:
 * - qrToken (secure) -> uses same secure flow
 * - ticketId (legacy uuid) -> fallback
 */
router.post("/validate-by-code", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const code = String(req.body?.code || "").trim();
    if (!code) return res.status(400).json({ message: "code required" });

    // If it's a valid qrToken -> secure validate
    try {
      const payload = verifyQrToken(code);
      if (payload?.tid) {
        const out = await validateQrTokenFlow({ code, adminUserId: req.user.id });
        return res.status(out.status).json(out.body);
      }
    } catch {
      // not a jwt -> ignore and fallback below
    }

    // Legacy fallback: treat as old ticketId UUID
    const t = await Ticket.findOne({ ticketId: code })
      .populate("event")
      .populate("user", "name email profilePicture");

    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (t.status === "validated") {
      return res.status(409).json({
        ok: false,
        message: `Already Verified at ${t.scannedAt ? new Date(t.scannedAt).toLocaleString() : ""}`,
        ticket: t,
      });
    }

    const now = new Date();
    t.status = "validated";
    t.scannedAt = now;
    t.scannedBy = req.user.id;
    t.validatedAt = now;
    t.validatedBy = req.user.id;
    await t.save();

    return res.json({ ok: true, message: "Verified ✅", ticket: t });
  } catch (err) {
    console.error("Validate-by-code error:", err);
    return res.status(500).json({ message: "Server error (validate-by-code)" });
  }
});

// ✅ Admin validate by Mongo _id (backward-compat)
// POST /api/tickets/:id/validate
router.post("/:id/validate", protect, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const t = await Ticket.findById(req.params.id)
      .populate("event")
      .populate("user", "name email profilePicture");

    if (!t) return res.status(404).json({ message: "Ticket not found" });

    if (t.status === "validated") {
      return res.status(409).json({
        ok: false,
        message: `Already Verified at ${t.scannedAt ? new Date(t.scannedAt).toLocaleString() : ""}`,
        ticket: t,
      });
    }

    const now = new Date();
    t.status = "validated";
    t.scannedAt = now;
    t.scannedBy = req.user.id;
    t.validatedAt = now;
    t.validatedBy = req.user.id;
    await t.save();

    return res.json({ ok: true, message: "Verified ✅", ticket: t });
  } catch (err) {
    console.error("Validate error:", err);
    return res.status(500).json({ message: "Server error (validate)" });
  }
});

module.exports = router;
