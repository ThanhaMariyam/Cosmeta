const walletHistorySchema = require("../../model/walletHistory");
const httpStatus = require("../../utils/httpStatus");
const mongoose = require("mongoose");

const getWalletTransaction = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    const matchStage = {};

    if (searchQuery) {
      matchStage.$expr = {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: searchQuery,
          options: "i",
        },
      };
    }

    const aggregation = [
      { $match: matchStage },
      { $sort: { transaction_date: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "wallets",
          localField: "wallet_id",
          foreignField: "_id",
          as: "wallet_id",
        },
      },
      { $unwind: "$wallet_id" },
      {
        $lookup: {
          from: "users",
          localField: "wallet_id.user_id",
          foreignField: "_id",
          as: "wallet_id.user_id",
        },
      },
      { $unwind: "$wallet_id.user_id" },
    ];

    const transactions = await walletHistorySchema.aggregate(aggregation);

    const countAggregation = [{ $match: matchStage }, { $count: "total" }];

    const countResult = await walletHistorySchema.aggregate(countAggregation);
    const totalTransactions = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalTransactions / limit);

    res.render("admin/userWallet", {
      transactions,
      currentPage: page,
      totalPages,
      searchQuery,
    });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching wallet transactions",
    });
  }
};

const getWalletTransactionDetails = async (req, res) => {
  try {
    const transaction = await walletHistorySchema
      .findById(req.params.id)
      .populate({
        path: "wallet_id",
        populate: {
          path: "user_id",
          model: "user",
        },
      });

    if (!transaction) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("admin/admin500")
    }

    res.render("admin/walletDetails", {
      transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

module.exports = {
  getWalletTransaction,
  getWalletTransactionDetails,
};
