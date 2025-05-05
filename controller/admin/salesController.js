const orderSchema = require("../../model/orderModel");
const userSchema = require("../../model/userModel");
const productSchema = require("../../model/productModal");
const categorySchema = require("../../model/categoryModel");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const httpStatus = require("../../utils/httpStatus");

const getDashboard = async (req, res) => {
  const { filter, from, to } = req.query;

  let startDate,
    endDate = new Date();

  if (filter === "custom") {
    const currentDate = new Date();
    const selectedStartDate = new Date(from);
    const selectedEndDate = new Date(to);

    if (selectedStartDate > currentDate || selectedEndDate > currentDate) {
      return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({
        message: "The selected dates cannot be in the future. Please choose valid dates.",
      });
    }

    startDate = selectedStartDate;
    endDate = selectedEndDate;
  } else {
    switch (filter) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "yearly":
        startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "custom":
        startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(0);
    }
  }

  const orders = await orderSchema.find({
    placedAt: { $gte: startDate, $lte: endDate },
    orderStatus: "Delivered",
  });

  let totalAmount = 0,
    couponDiscount = 0,
    offerDiscount = 0;

  orders.forEach((order) => {
    const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
    let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    if (nonCanceledProducts.length > 0) {
      orderAmount += 50;
    }

    orderAmount -= order.couponDiscount || 0;
    couponDiscount += order.couponDiscount || 0;
    offerDiscount += order.offerDiscount || 0;

    totalAmount += orderAmount;
  });

  const groupSalesData = (orders, filter) => {
    const grouped = {};

    orders.forEach((order) => {
      const date = new Date(order.placedAt);
      let key;

      switch (filter) {
        case "daily":
        case "custom":
          key = date.toLocaleDateString("en-CA");
          break;
        case "monthly":
          key = date.toLocaleString("default", { month: "short" });
          break;
        case "yearly":
          key = date.getFullYear();
          break;
        case "weekly":
          const weekNum = Math.ceil(date.getDate() / 7);
          key = `Week ${weekNum} ${date.toLocaleString("default", {
            month: "short",
          })}`;
          break;
        default:
          key = date.toISOString().split("T")[0];
      }

      const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
      let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (nonCanceledProducts.length > 0) {
        orderAmount += 50;
      }

      orderAmount -= order.couponDiscount || 0;

      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += orderAmount;
    });

    return Object.entries(grouped).map(([label, amount]) => ({
      label,
      amount,
    }));
  };

  const salesChartData = groupSalesData(orders, filter);

  const topSellingProducts = await getTopSelling();
  const topSellingCategories = await getTopSellingCategories();
  const topSellingBrands = await getTopSellingBrands();

  res.render("admin/dashboard", {
    totalAmount,
    orderCount: orders.length,
    totalRevenue: totalAmount,
    avgOrderValue: orders.length ? (totalAmount / orders.length).toFixed(2) : 0,
    userCount: await userSchema.countDocuments({ isBlocked: false }),
    productCount: await productSchema.countDocuments(),
    categoryCount: await categorySchema.countDocuments(),
    cancelledOrders: await orderSchema.countDocuments({
      orderStatus: "Canceled",
    }),
    totalReturns: await orderSchema.countDocuments({ orderStatus: "Returned" }),
    couponDiscount,
    discountTotal: offerDiscount,
    topSellingProducts,
    topSellingCategories,
    topSellingBrands,
    salesChartData,
    salesRange: filter || "custom",
    productRange: "Monthly",
    categoryRange: "Monthly",
    brandRange: "Monthly",
    filter: filter || "all",
  });
};
const getTopSelling = async () => {
  const result = await orderSchema.aggregate([
    { $unwind: "$products" },
    { $match: { "products.status": "Delivered" } },
    {
      $group: {
        _id: "$products.name",
        count: { $sum: "$products.quantity" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return result;
};

const getTopSellingCategories = async () => {
  const result = await orderSchema.aggregate([
    { $unwind: "$products" },
    { $match: { "products.status": "Delivered" } },
    {
      $group: {
        _id: "$products.category",
        count: { $sum: "$products.quantity" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return result;
};

const getTopSellingBrands = async () => {
  const result = await orderSchema.aggregate([
    { $unwind: "$products" },
    { $match: { "products.status": "Delivered" } },
    {
      $group: {
        _id: "$products.brand",
        count: { $sum: "$products.quantity" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return result;
};

const generatePDFReport = async (req, res) => {
  try {
    const { filter, from, to } = req.query;
    let startDate, endDate = new Date();

    switch (filter) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "yearly":
        startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "custom":
        startDate = new Date(from);
        endDate = new Date(to);
        break;
      default:
        startDate = new Date(0);
    }

    const orders = await orderSchema.find({
      placedAt: { $gte: startDate, $lte: endDate },
      orderStatus: "Delivered",
    });

    let totalAmount = 0;
    let couponDiscount = 0;
    let offerDiscount = 0;
    let orderCount = 0;

    const deliveredOrders = [];

    orders.forEach((order) => {
      const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
      let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (nonCanceledProducts.length > 0) {
        orderAmount += 50; 
      }

      orderAmount -= order.couponDiscount || 0;
      couponDiscount += order.couponDiscount || 0;
      offerDiscount += order.offerDiscount || 0;

      totalAmount += orderAmount;
      orderCount += 1;

      deliveredOrders.push({
        orderId: order.orderId,
        deliveredItemTotal: orderAmount,
        placedAt: order.placedAt,
        orderStatus: order.orderStatus,
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.pdf"
    );
    doc.pipe(res);

    const startX = 50;
    const formatDate = (date) =>
      `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Report Period:", { underline: true });
    doc.fontSize(12);
    if (filter === "daily") {
      doc.text(formatDate(startDate));
    } else {
      doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`);
    }
    doc.moveDown();

    doc.fontSize(12).text("Summary:", { underline: true });
    doc.moveDown(0.5);
    doc.text(`Total Orders: ${orderCount}`);
    doc.text(`Total Revenue: ₹${totalAmount.toFixed(2)}`);
    doc.text(`Coupon Discount: ₹${couponDiscount.toFixed(2)}`);
    doc.text(`Offer Discount: ₹${offerDiscount.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(12).text("Recent Orders:", { underline: true });
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold");
    let y = doc.y;
    doc.text("Order ID", startX, y, { width: 150 });
    doc.text("Amount", startX + 150, y, { width: 100, align: "right" });
    doc.text("Date", startX + 260, y, { width: 100, align: "right" });
    doc.text("Status", startX + 370, y, { width: 100, align: "right" });

    doc.moveDown(0.5);
    doc.font("Helvetica");
    doc.text(
      "---------------------------------------------------------------------------------",
      startX,
      doc.y
    );
    doc.moveDown(0.5);

    const recentOrders = deliveredOrders.slice(0, 5);

    if (recentOrders.length === 0) {
      doc.text("No orders found for the selected period.", startX, doc.y);
    } else {
      for (let order of recentOrders) {
        y = doc.y;
        doc.text(`#${order.orderId}`, startX, y, { width: 150 });
        doc.text(`₹${order.deliveredItemTotal.toFixed(2)}`, startX + 150, y, {
          width: 100,
          align: "right",
        });
        doc.text(formatDate(order.placedAt), startX + 260, y, {
          width: 100,
          align: "right",
        });
        doc.text(order.orderStatus, startX + 370, y, {
          width: 100,
          align: "right",
        });
        doc.moveDown();
      }
    }

    doc.moveDown(2);
    doc.fontSize(12).text("Generated by Cosmeta.com", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Error generating sales report PDF:", err);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .render("admin/admin500");
  }
};


const downloadPDF = async (req, res) => {
  try {
    const { filter, from, to } = req.query;
    let startDate, endDate = new Date();

    switch (filter) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "yearly":
        startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "custom":
        startDate = new Date(from);
        endDate = new Date(to);
        break;
      default:
        startDate = new Date(0);
    }

    const orders = await orderSchema.find({
      placedAt: { $gte: startDate, $lte: endDate },
      orderStatus: "Delivered",
    });

    let totalAmount = 0;
    let couponDiscount = 0;
    let offerDiscount = 0;
    let orderCount = 0;

    const deliveredOrders = [];

    orders.forEach((order) => {
      const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
      let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (nonCanceledProducts.length > 0) {
        orderAmount += 50; 
      }

      orderAmount -= order.couponDiscount || 0;
      couponDiscount += order.couponDiscount || 0;
      offerDiscount += order.offerDiscount || 0;

      totalAmount += orderAmount;
      orderCount += 1;

      deliveredOrders.push({
        orderId: order.orderId,
        deliveredItemTotal: orderAmount,
        placedAt: order.placedAt,
        orderStatus: order.orderStatus,
      });
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.pdf"
    );
    doc.pipe(res);

    const startX = 50;
    const formatDate = (date) =>
      `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    doc.fontSize(20).text("Sales Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Report Period:", { underline: true });
    doc.fontSize(12);
    if (filter === "daily") {
      doc.text(formatDate(startDate));
    } else {
      doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`);
    }
    doc.moveDown();

    doc.fontSize(12).text("Summary:", { underline: true });
    doc.moveDown(0.5);
    doc.text(`Total Orders: ${orderCount}`);
    doc.text(`Total Revenue: ₹${totalAmount.toFixed(2)}`);
    doc.text(`Coupon Discount: ₹${couponDiscount.toFixed(2)}`);
    doc.text(`Offer Discount: ₹${offerDiscount.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(12).text("Recent Orders:", { underline: true });
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold");
    let y = doc.y;
    doc.text("Order ID", startX, y, { width: 150 });
    doc.text("Amount", startX + 150, y, { width: 100, align: "right" });
    doc.text("Date", startX + 260, y, { width: 100, align: "right" });
    doc.text("Status", startX + 370, y, { width: 100, align: "right" });

    doc.moveDown(0.5);
    doc.font("Helvetica");
    doc.text(
      "---------------------------------------------------------------------------------",
      startX,
      doc.y
    );
    doc.moveDown(0.5);

    const recentOrders = deliveredOrders
      .sort((a, b) => b.placedAt - a.placedAt) 
      .slice(0, 5); 
    if (recentOrders.length === 0) {
      doc.text("No orders found for the selected period.", startX, doc.y);
    } else {
      for (let order of recentOrders) {
        y = doc.y;
        doc.text(`#${order.orderId}`, startX, y, { width: 150 });
        doc.text(`₹${order.deliveredItemTotal.toFixed(2)}`, startX + 150, y, {
          width: 100,
          align: "right",
        });
        doc.text(formatDate(order.placedAt), startX + 260, y, {
          width: 100,
          align: "right",
        });
        doc.text(order.orderStatus, startX + 370, y, {
          width: 100,
          align: "right",
        });
        doc.moveDown();
      }
    }

    doc.moveDown(2);
    doc.fontSize(12).text("Generated by Cosmeta.com", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Error generating sales report PDF:", err);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .render("admin/admin500");
  }
};




const downloadExcel = async (req, res) => {
  try {
    const { filter, from, to } = req.query;
    let startDate, endDate = new Date();

    switch (filter) {
      case "daily":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "yearly":
        startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "custom":
        startDate = new Date(from);
        endDate = new Date(to);
        break;
      default:
        startDate = new Date(0);
    }

    const orders = await orderSchema.find({
      placedAt: { $gte: startDate, $lte: endDate },
      orderStatus: "Delivered",
    });

    let totalAmount = 0;
    let couponDiscount = 0;
    let offerDiscount = 0;
    let orderCount = 0;

    const deliveredOrders = [];

    orders.forEach((order) => {
      const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
      let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (nonCanceledProducts.length > 0) {
        orderAmount += 50; 
      }

      orderAmount -= order.couponDiscount || 0;
      couponDiscount += order.couponDiscount || 0;
      offerDiscount += order.offerDiscount || 0;

      totalAmount += orderAmount;
      orderCount += 1;

      deliveredOrders.push({
        orderId: order.orderId,
        deliveredItemTotal: orderAmount,
        placedAt: order.placedAt,
        orderStatus: order.orderStatus,
        couponDiscount: order.couponDiscount || 0,
        offerDiscount: order.offerDiscount || 0,
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Coupon Discount", key: "coupon", width: 20 },
      { header: "Offer Discount", key: "offer", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Status", key: "status", width: 15 },
    ];

    worksheet.addRow(["Summary"]);
    worksheet.addRow(["Total Orders", orderCount]);
    worksheet.addRow(["Total Revenue", `₹${totalAmount.toFixed(2)}`]);
    worksheet.addRow(["Coupon Discount", `₹${couponDiscount.toFixed(2)}`]);
    worksheet.addRow(["Offer Discount", `₹${offerDiscount.toFixed(2)}`]);
    worksheet.addRow([]);

    worksheet.addRow(["Recent Orders"]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    const recentOrders = deliveredOrders
      .sort((a, b) => b.placedAt - a.placedAt)
      .slice(0, 5);

    if (recentOrders.length === 0) {
      worksheet.addRow(["No orders found for the selected period."]);
    } else {
      for (let order of recentOrders) {
        worksheet.addRow({
          orderId: order.orderId,
          amount: order.deliveredItemTotal.toFixed(2),
          coupon: order.couponDiscount.toFixed(2),
          offer: order.offerDiscount.toFixed(2),
          date: order.placedAt.toLocaleDateString(),
          status: order.orderStatus,
        });
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error downloading Excel report:", err);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .render("admin/admin500");
  }
};


const salesReport = async (req, res) => {
  try {
    const { filter, from, to } = req.query;
    let startDate, endDate = new Date();

    
    if (filter === "custom") {
      const currentDate = new Date();
      const selectedStartDate = new Date(from);
      const selectedEndDate = new Date(to);

      if (selectedStartDate > currentDate || selectedEndDate > currentDate) {
        return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({
          message: "The selected dates cannot be in the future. Please choose valid dates.",
        });
      }

      startDate = selectedStartDate;
      endDate = selectedEndDate;
    } else {
      switch (filter) {
        case "daily":
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case "weekly":
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "monthly":
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "yearly":
          startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0);
      }
    }

    const orders = await orderSchema.find({
      placedAt: { $gte: startDate, $lte: endDate },
      orderStatus: "Delivered",
    }).populate("user", "username");

    
    let totalAmount = 0, couponDiscount = 0, offerDiscount = 0;

    orders.forEach((order) => {
      const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
      let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (nonCanceledProducts.length > 0) {
        orderAmount += 50; 
      }

      orderAmount -= order.couponDiscount || 0;
      couponDiscount += order.couponDiscount || 0;
      offerDiscount += order.offerDiscount || 0;

      totalAmount += orderAmount;
    });

    const groupSalesData = (orders, filter) => {
      const grouped = {};

      orders.forEach((order) => {
        const date = new Date(order.placedAt);
        let key;

        switch (filter) {
          case "daily":
          case "custom":
            key = date.toLocaleDateString("en-CA");
            break;
          case "monthly":
            key = date.toLocaleString("default", { month: "short" });
            break;
          case "yearly":
            key = date.getFullYear();
            break;
          case "weekly":
            const weekNum = Math.ceil(date.getDate() / 7);
            key = `Week ${weekNum} ${date.toLocaleString("default", { month: "short" })}`;
            break;
          default:
            key = date.toISOString().split("T")[0];
        }

        const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
        let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

        if (nonCanceledProducts.length > 0) {
          orderAmount += 50;
        }

        orderAmount -= order.couponDiscount || 0;

        if (!grouped[key]) grouped[key] = 0;
        grouped[key] += orderAmount;
      });

      return Object.entries(grouped).map(([label, amount]) => ({ label, amount }));
    };

    const salesChartData = groupSalesData(orders, filter);

    
    const totalRevenue = totalAmount;
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? (totalAmount / orderCount).toFixed(2) : 0;

    const userCount = await userSchema.countDocuments({ isBlocked: false });
    const productCount = await productSchema.countDocuments();
    const categoryCount = await categorySchema.countDocuments();

    const cancelledOrders = await orderSchema.countDocuments({ orderStatus: "Canceled" });
    const totalReturns = await orderSchema.countDocuments({ orderStatus: "Returned" });

    const recentOrders = orders
      .sort((a, b) => b.placedAt - a.placedAt)
      .slice(0, 5);

    const formattedOrders = recentOrders.map((order) => {
      const nonCanceledProducts = order.products.filter(p => p.status !== 'Canceled');
      let orderAmount = nonCanceledProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

      if (nonCanceledProducts.length > 0) {
        orderAmount += 50; // Add shipping fee
      }

      orderAmount -= order.couponDiscount || 0;

      return {
        orderId: order.orderId,
        customerName: order.user?.username || "N/A",
        products: order.products.map((p) => ({ name: p.name, status: p.status })),
        amount: orderAmount,
        date: order.placedAt.toLocaleDateString(),
        status: order.orderStatus,
      };
    });

    res.render("admin/salesReport", {
      totalAmount,
      orderCount,
      totalRevenue,
      avgOrderValue,
      userCount,
      productCount,
      categoryCount,
      cancelledOrders,
      totalReturns,
      couponDiscount,
      offerDiscount,
      salesChartData,
      fromDate: from || "",
      toDate: to || "",
      salesRange: filter || "custom",
      recentOrders: formattedOrders,
    });

  } catch (err) {
    console.error("Error in salesReport:", err);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500");
  }
};




module.exports = {
  getDashboard,
  getTopSelling,
  generatePDFReport,
  downloadPDF,
  downloadExcel,
  salesReport,
  getTopSellingCategories,
  getTopSellingBrands,
};
