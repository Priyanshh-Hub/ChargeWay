const express = require("express");
const ExcelJS = require("exceljs");
const User    = require("../models/User");
const Station = require("../models/Station");
const Booking = require("../models/Booking");
const Review  = require("../models/Review");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

const CO2_PER_KWH = 0.82; // kg CO₂ saved per kWh vs petrol

const styleHeader = (worksheet, columns) => {
  worksheet.addRow(columns.map(c => c.header));
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0066CC" } };
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border    = { bottom: { style: "medium", color: { argb: "FF004499" } } };
  });
  headerRow.height = 24;
  columns.forEach((col, i) => { worksheet.getColumn(i + 1).width = col.width || 18; });
};

// GET /api/report/excel
router.get("/excel", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const workbook    = new ExcelJS.Workbook();
    workbook.creator  = "ChargeWay System";
    workbook.created  = new Date();

    const users    = await User.find({}, "-password").sort({ joinDate: -1 });
    const stations = await Station.find().populate("managerId", "name");
    const bookings = await Booking.find()
      .populate("userId",    "name email")
      .populate("stationId", "name")
      .sort({ createdAt: -1 });
    const reviews  = await Review.find()
      .populate("userId",    "name email")
      .populate("stationId", "name address")
      .sort({ createdAt: -1 });

    // ── Sheet 1: Summary ──────────────────────────────────────
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.getColumn(1).width = 32;
    summarySheet.getColumn(2).width = 24;

    const titleRow = summarySheet.addRow(["⚡ ChargeWay — System Report"]);
    titleRow.getCell(1).font      = { bold: true, size: 16, color: { argb: "FF0066CC" } };
    titleRow.getCell(1).alignment = { horizontal: "center" };
    summarySheet.mergeCells("A1:B1");
    summarySheet.addRow([`Generated: ${new Date().toLocaleString()}`, ""]);
    summarySheet.addRow([]);

    const completedBookings = bookings.filter(b => b.status === "Completed");
    const totalRev    = completedBookings.reduce((s, b) => s + (b.totalCost  || 0), 0);
    const totalEnergy = completedBookings.reduce((s, b) => s + (b.energyKwh || 0), 0);
    const totalCO2    = totalEnergy * CO2_PER_KWH;
    const avgRating   = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2)
      : "N/A";

    [
      ["Total Users",                      users.filter(u => u.role === "User").length],
      ["Total Station Managers",           users.filter(u => u.role === "Station Manager").length],
      ["Total Stations",                   stations.length],
      ["Online Stations",                  stations.filter(s => s.status === "Online").length],
      ["Total Chargers",                   stations.reduce((s, st) => s + (st.chargers?.length || 0), 0)],
      ["Total Bookings",                   bookings.length],
      ["Completed Sessions",               completedBookings.length],
      ["Upcoming Bookings",                bookings.filter(b => b.status === "Upcoming").length],
      ["Cancelled Bookings",               bookings.filter(b => b.status === "Cancelled").length],
      ["Total Revenue (₹)",               totalRev.toFixed(2)],
      ["Total Energy Dispensed (kWh)",     totalEnergy.toFixed(2)],
      ["Total CO₂ Saved (kg)",            totalCO2.toFixed(2)],
      ["CO₂ Saved (tonnes)",              (totalCO2 / 1000).toFixed(3)],
      ["Total Reviews",                    reviews.length],
      ["Platform Average Rating",          avgRating],
      ["EVs Registered",                   users.filter(u => u.car).length],
    ].forEach(([label, value]) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(1).font      = { bold: true };
      row.getCell(2).alignment = { horizontal: "right" };
      row.eachCell(cell => {
        cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        cell.alignment = { ...cell.alignment, vertical: "middle" };
      });
      row.height = 20;
    });

    // ── Sheet 2: Bookings ──────────────────────────────────────
    const bookingsSheet = workbook.addWorksheet("Bookings");
    styleHeader(bookingsSheet, [
      { header: "Invoice No.",    width: 16 },
      { header: "User",           width: 22 },
      { header: "Station",        width: 22 },
      { header: "Charger #",      width: 10 },
      { header: "Vehicle No.",    width: 15 },
      { header: "Date",           width: 13 },
      { header: "Time Slot",      width: 12 },
      { header: "Duration (min)", width: 14 },
      { header: "Energy (kWh)",   width: 13 },
      { header: "Rate (₹/kWh)",  width: 13 },
      { header: "Platform Fee",   width: 13 },
      { header: "Total (₹)",     width: 12 },
      { header: "CO₂ Saved (kg)",width: 14 },
      { header: "Status",         width: 12 },
      { header: "Payment",        width: 14 },
    ]);
    const statusColors = { Completed: "FFD1FAE5", Upcoming: "FFDBEAFE", Cancelled: "FFFEE2E2" };
    let invoiceCounter = 1;
    bookings.forEach((b, idx) => {
      const year      = new Date(b.createdAt || b.date || Date.now()).getFullYear();
      const invoiceNo = b.status === "Completed"
        ? (b.invoiceNo || `CW-${year}-${String(invoiceCounter++).padStart(4, "0")}`)
        : `BKG-${String(idx + 1).padStart(4, "0")}`;
      const co2Saved  = b.status === "Completed" ? ((b.energyKwh || 0) * CO2_PER_KWH).toFixed(3) : "—";

      const row = bookingsSheet.addRow([
        invoiceNo,
        b.userId?.name  || "—",
        b.stationName   || b.stationId?.name || "—",
        b.chargerId, b.vehicleNumber, b.date, b.timeSlot,
        b.duration, b.energyKwh, b.costPerKwh, b.platformFee, b.totalCost,
        co2Saved,
        b.status, b.paymentMethod,
      ]);
      row.eachCell(cell => {
        cell.alignment = { vertical: "middle" };
        if (statusColors[b.status]) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusColors[b.status] } };
        }
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
    });

    // ── Sheet 3: Station Performance ──────────────────────────
    const perfSheet = workbook.addWorksheet("Station Performance");
    styleHeader(perfSheet, [
      { header: "Station",          width: 24 },
      { header: "Address",          width: 30 },
      { header: "Manager",          width: 20 },
      { header: "Status",           width: 12 },
      { header: "Price (₹/kWh)",   width: 14 },
      { header: "Total Chargers",   width: 14 },
      { header: "Total Sessions",   width: 14 },
      { header: "Revenue (₹)",     width: 14 },
      { header: "Energy (kWh)",     width: 13 },
      { header: "CO₂ Saved (kg)",  width: 14 },
      { header: "Avg Rating",       width: 12 },
      { header: "Total Reviews",    width: 13 },
      { header: "Facilities",       width: 30 },
    ]);
    for (const s of stations) {
      const stBk  = completedBookings.filter(b =>
        String(b.stationId?._id || b.stationId) === String(s._id)
      );
      const stRev = reviews.filter(r =>
        String(r.stationId?._id || r.stationId) === String(s._id)
      );
      const revenue  = stBk.reduce((sum, b) => sum + (b.totalCost  || 0), 0);
      const energy   = stBk.reduce((sum, b) => sum + (b.energyKwh  || 0), 0);
      const co2      = energy * CO2_PER_KWH;
      const avgRat   = stRev.length > 0
        ? (stRev.reduce((sum, r) => sum + r.rating, 0) / stRev.length).toFixed(2)
        : "No reviews";

      const row = perfSheet.addRow([
        s.name, s.address,
        s.managerId?.name || "Unassigned",
        s.status, s.price_per_kwh,
        s.chargers?.length || 0,
        stBk.length,
        revenue.toFixed(2),
        energy.toFixed(2),
        co2.toFixed(2),
        avgRat,
        stRev.length,
        (s.facilities || []).join(", "),
      ]);
      row.eachCell(cell => {
        cell.alignment = { vertical: "middle" };
        cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
      // Highlight top earner
      if (revenue === Math.max(...stations.map(st => {
        const bks = completedBookings.filter(b => String(b.stationId?._id || b.stationId) === String(st._id));
        return bks.reduce((s, b) => s + (b.totalCost || 0), 0);
      })) && revenue > 0) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };
        });
      }
    }

    // ── Sheet 4: Reviews ──────────────────────────────────────
    const reviewsSheet = workbook.addWorksheet("Reviews");
    styleHeader(reviewsSheet, [
      { header: "Review No.",  width: 12 },
      { header: "Station",     width: 24 },
      { header: "User",        width: 20 },
      { header: "Email",       width: 26 },
      { header: "Rating",      width: 10 },
      { header: "Stars",       width: 12 },
      { header: "Comment",     width: 40 },
      { header: "Date",        width: 14 },
    ]);
    const ratingColors = { 5: "FFD1FAE5", 4: "FFD1FAE5", 3: "FFFFF9C4", 2: "FFFEE2E2", 1: "FFFEE2E2" };
    reviews.forEach((r, i) => {
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const row = reviewsSheet.addRow([
        `RVW-${String(i + 1).padStart(4, "0")}`,
        r.stationId?.name    || "—",
        r.userId?.name       || "—",
        r.userId?.email      || "—",
        r.rating,
        stars,
        r.comment || "—",
        new Date(r.createdAt).toLocaleDateString(),
      ]);
      row.eachCell(cell => {
        cell.alignment = { vertical: "middle" };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: ratingColors[r.rating] || "FFFFFFFF" } };
        cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
      // Star column in gold
      row.getCell(6).font = { color: { argb: "FFCA8A04" }, bold: true };
    });

    // ── Sheet 5: EV Fleet ────────────────────────────────────
    const fleetSheet = workbook.addWorksheet("EV Fleet");
    styleHeader(fleetSheet, [
      { header: "Owner",          width: 22 },
      { header: "Email",          width: 28 },
      { header: "Phone",          width: 15 },
      { header: "Brand",          width: 16 },
      { header: "Model",          width: 20 },
      { header: "Vehicle No.",    width: 16 },
      { header: "Battery (kWh)", width: 14 },
      { header: "Range (km)",     width: 13 },
      { header: "Efficiency",     width: 14 },
      { header: "Total Sessions", width: 14 },
      { header: "Total Spent (₹)",width: 14 },
      { header: "Total kWh",      width: 12 },
      { header: "CO₂ Saved (kg)", width: 14 },
    ]);
    const evUsers = users.filter(u => u.car);
    for (const u of evUsers) {
      const uBk      = completedBookings.filter(b =>
        String(b.userId?._id || b.userId) === String(u._id)
      );
      const spent    = uBk.reduce((s, b) => s + (b.totalCost  || 0), 0);
      const energy   = uBk.reduce((s, b) => s + (b.energyKwh  || 0), 0);
      const co2      = energy * CO2_PER_KWH;

      fleetSheet.addRow([
        u.name, u.email, u.phone || "—",
        u.car.brand, u.car.model,
        u.car.vehicleNumber || "—",
        u.car.battery_kwh   || "—",
        u.car.range_km      || "—",
        u.car.efficiency ? `${u.car.efficiency} km/kWh` : "—",
        uBk.length,
        spent.toFixed(2),
        energy.toFixed(2),
        co2.toFixed(2),
      ]).eachCell(cell => {
        cell.alignment = { vertical: "middle" };
        cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
    }

    // ── Sheet 6: Users ───────────────────────────────────────
    const usersSheet = workbook.addWorksheet("Users");
    styleHeader(usersSheet, [
      { header: "User No.",    width: 12 },
      { header: "Name",        width: 22 },
      { header: "Email",       width: 28 },
      { header: "Phone",       width: 15 },
      { header: "Role",        width: 18 },
      { header: "Status",      width: 12 },
      { header: "Joined",      width: 14 },
      { header: "Car",         width: 22 },
      { header: "Vehicle No.", width: 16 },
    ]);
    users.forEach((u, i) => {
      usersSheet.addRow([
        `USR-${String(i + 1).padStart(4, "0")}`,
        u.name, u.email, u.phone || "—", u.role,
        u.isActive ? "Active" : "Suspended",
        u.joinDate ? new Date(u.joinDate).toLocaleDateString() : "—",
        u.car ? `${u.car.brand} ${u.car.model}` : "—",
        u.car?.vehicleNumber || "—",
      ]).eachCell(cell => {
        cell.alignment = { vertical: "middle" };
        cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
    });

    // ── Sheet 7: Stations ────────────────────────────────────
    const stationsSheet = workbook.addWorksheet("Stations");
    styleHeader(stationsSheet, [
      { header: "Station No.",   width: 14 },
      { header: "Name",          width: 22 },
      { header: "Address",       width: 32 },
      { header: "Latitude",      width: 12 },
      { header: "Longitude",     width: 12 },
      { header: "Status",        width: 12 },
      { header: "Manager",       width: 22 },
      { header: "Price/kWh (₹)",width: 14 },
      { header: "Total Chargers",width: 15 },
      { header: "Available",     width: 12 },
      { header: "Facilities",    width: 28 },
    ]);
    stations.forEach((s, i) => {
      const available = s.chargers.filter(c => c.status === "Available").length;
      stationsSheet.addRow([
        `STN-${String(i + 1).padStart(4, "0")}`,
        s.name, s.address, s.lat, s.lng, s.status,
        s.managerId?.name || "Unassigned",
        s.price_per_kwh, s.chargers.length, available,
        (s.facilities || []).join(", "),
      ]).eachCell(cell => {
        cell.alignment = { vertical: "middle" };
        cell.border    = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
    });

    // ── Sheet 8: Monthly Analytics ───────────────────────────
    const analyticsSheet = workbook.addWorksheet("Monthly Analytics");
    styleHeader(analyticsSheet, [
      { header: "Month",          width: 14 },
      { header: "Revenue (₹)",   width: 15 },
      { header: "Sessions",       width: 12 },
      { header: "New Users",      width: 12 },
      { header: "Energy (kWh)",   width: 13 },
      { header: "CO₂ Saved (kg)",width: 14 },
    ]);
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d          = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
      const start      = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
      const end        = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const bks        = await Booking.find({ status: "Completed", date: { $gte: start, $lte: end } });
      const rev        = bks.reduce((s, b) => s + (b.totalCost  || 0), 0);
      const energy     = bks.reduce((s, b) => s + (b.energyKwh  || 0), 0);
      const co2        = energy * CO2_PER_KWH;
      const newUsers   = await User.countDocuments({
        joinDate: { $gte: new Date(start), $lte: new Date(end) }, role: "User"
      });
      analyticsSheet.addRow([monthLabel, rev.toFixed(2), bks.length, newUsers, energy.toFixed(2), co2.toFixed(2)]);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=ChargeWay_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel report error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;