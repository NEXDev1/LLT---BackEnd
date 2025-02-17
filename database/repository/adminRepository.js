const User = require("../models/User");
// const OrderSchema = require("../models/OrderSchema");
const RangeSchema = require("../models/RangeSchema");
const DrawTimeSchema = require("../models/DrawTimeSchema");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
// const { DateTime } = require("luxon");
const Order = require("../models/OrderSchema");
const Token = require("../models/TokenSchema");

const agentRegisterDB = async (
  name,
  userName,
  contactNumber,
  email,
  hashedPassword
) => {
  try {
    const newUser = new User({
      name,
      userName,
      contactNumber,
      email,
      password: hashedPassword,
      userRole: 2,
      status: true,
    });
    await newUser.save();
    return newUser;
  } catch (error) {
    console.error("Error during user registration:", error);
    throw error;
  }
};

const listAgentsDB = async (filter, pageNumber) => {
  try {
    // const perPage = 5;
    // const skip = (pageNumber - 1) * perPage;

    let filterCondition = {};
    if (filter === "active") {
      filterCondition = { status: true };
    } else if (filter === "inactive") {
      filterCondition = { status: false };
    }

    const users =
      filter === "all"
        ? await User.find({ userRole: 2 }) // .limit(perPage).skip(skip)
        : await User.find({ ...filterCondition, userRole: 2 });
    // .limit(perPage).skip(skip);

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

const agentProfileEditDB = async (
  _id,
  name,
  userName,
  email,
  contactNumber,
  status
) => {
  try {
    const updateUserinfo = { name, userName, email, contactNumber, status };
    const updatedAgent = await User.findByIdAndUpdate(_id, updateUserinfo, {
      new: true,
    });
    return updatedAgent;
  } catch (error) {
    console.error("Error editing agent profile:", error);
    throw error;
  }
};

const agentPasswordChangeDB = async (_id, password) => {
  try {
    console.log("agentPasswordChangeDB");
    const updateUserinfo = { password };
    const Agent = await User.findByIdAndUpdate(_id, updateUserinfo, {
      new: true,
    });
    console.log("DB", Agent);
    return Agent;
  } catch (error) {
    console.error("Error editing agent passoword:", error);
    throw error;
  }
};

const changeAgentStatusDB = async (id) => {
  try {
    const agent = await User.findOne({ _id: id });

    if (agent) {
      const updatedAgent = await User.findOneAndUpdate(
        { _id: id },
        { $set: { status: !agent.status } },
        { new: true }
      );
      return updatedAgent;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error changing agent status:", error);
    throw error;
  }
};

const listEntityDB = async (tokenNumberr, dateFilterr, drawTime) => {
  try {
    console.log("inn db", dateFilterr, drawTime);
    let tokenNumber = parseInt(tokenNumberr);

    let matchStage = {};

    if (tokenNumber) {
      matchStage.tokenNumber = tokenNumber;
    }
    if (drawTime) {
      matchStage.drawTime = drawTime;
    }
    if (dateFilterr) {
      const startDate = new Date(`${dateFilterr}T00:00:00.000Z`);
      const endDate = new Date(`${dateFilterr}T23:59:59.999Z`);
      matchStage.date = { $gte: startDate, $lte: endDate };
    }

    let aggregationPipeline = [
      {
        $lookup: {
          from: "tokens",
          localField: "_id",
          foreignField: "orderId",
          as: "token",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$token",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          date: 1,
          drawTime: 1,
          tokenId: "$token._id",
          tokenNumber: { $toInt: "$token.tokenNumber" },
          tokenCount: "$token.count",
          userFullName: "$user.name",
          username: "$user.userName",
          userEmail: "$user.email",
          userContactNumber: "$user.contactNumber",
        },
      },
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: null,
          totalCount: {
            $sum: {
              $toInt: "$tokenCount",
            },
          },
          data: {
            $push: "$$ROOT",
          },
        },
      },
    ];

    const list = await Order.aggregate(aggregationPipeline);

    console.log(list);
    if (!list) return null;

    return list;
  } catch (error) {
    throw error;
  }
};

const listOrderDB = async (tokenNumberr, dateFilterr, drawTime) => {
  try {
    console.log("inn db", dateFilterr, drawTime);
    let tokenNumber = parseInt(tokenNumberr);

    let matchStage = {};

    // if (tokenNumber) {
    //   matchStage.tokenNumber = tokenNumber;
    // }
    // if (drawTime) {
    //   matchStage.drawTime = drawTime;
    // }
    if (dateFilterr) {
      const startDate = new Date(`${dateFilterr}T00:00:00.000Z`);
      const endDate = new Date(`${dateFilterr}T23:59:59.999Z`);
      matchStage.date = { $gte: startDate, $lte: endDate };
    }
    if (drawTime) {
      matchStage.drawTime = drawTime;
    }

    let aggregationPipeline = [
      {
        $lookup: {
          from: "tokens",
          localField: "_id",
          foreignField: "orderId",
          as: "token",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          date: 1,
          drawTime: 1,
          userFullName: "$user.name",
          username: "$user.userName",
          userEmail: "$user.email",
          userContactNumber: "$user.contactNumber",
          token: 1,
        },
      },
      {
        $match: matchStage,
      },
    ];

    const list = await Order.aggregate(aggregationPipeline);

    console.log(list);
    if (!list) return null;

    return list;
  } catch (error) {
    throw error;
  }
};

const entityCumulativeDB = async (tokenNumberr, dateFilter, drawTime) => {
  try {
    let tokenNumber = parseInt(tokenNumberr);

    let matchStage = {};

    if (tokenNumber) {
      matchStage.tokenNumber = tokenNumber;
    }
    if (drawTime) {
      matchStage.drawTime = drawTime;
    }
    if (dateFilter) {
      const startDate = new Date(`${dateFilter}T00:00:00.000Z`);
      const endDate = new Date(`${dateFilter}T23:59:59.999Z`);
      matchStage.date = { $gte: startDate, $lte: endDate };
    }

    console.log("ms", matchStage);

    const pipeline = [
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: {
          path: "$order",
        },
      },
      {
        $group: {
          _id: "$tokenNumber",
          total: {
            $sum: {
              $toInt: "$count",
            },
          },
          orders: {
            $push: "$order",
          },
        },
      },
      {
        $unwind: {
          path: "$orders",
        },
      },
      {
        $project: {
          tokenNumber: "$_id",
          total: "$total",
          date: "$orders.date",
          drawtime: "$orders.drawtime",
        },
      },
      {
        $sort: {
          tokenNumber: 1,
        },
      },
      {
        $match: matchStage,
      },
    ];

    const results = await Token.aggregate(pipeline);
    return results;
  } catch (error) {
    throw error;
  }
};

const rangeSetupDB = async (startRange, endRange, color) => {
  try {
    const newRange = new RangeSchema({
      startRange,
      endRange,
      color,
    });
    const savedRange = await newRange.save();
    return savedRange;
  } catch (error) {
    throw error;
  }
};
const drawTimeSetupDB = async (drawTime) => {
  try {
    const newdrawTime = new DrawTimeSchema({
      drawTime,
    });
    const saveddrawTime = await newdrawTime.save();
    return saveddrawTime;
  } catch (error) {
    throw error;
  }
};

const rangeListDB = async () => {
  try {
    const ranges = await RangeSchema.find();
    return ranges;
  } catch (error) {
    throw error;
  }
};

const drawTimeRangeListDB = async () => {
  try {
    const currentDateTime = new Date();
    console.log("Current Time:", currentDateTime);

    const currentMinutes =
      currentDateTime.getHours() * 60 + currentDateTime.getMinutes();

    const drawTimeList = await DrawTimeSchema.aggregate([
      {
        $addFields: {
          drawTimeMinutes: {
            $add: [
              { $multiply: [{ $toInt: { $substr: ["$drawTime", 0, 2] } }, 60] },
              { $toInt: { $substr: ["$drawTime", 3, 2] } },
            ],
          },
        },
      },
      {
        $addFields: {
          timeDifference: {
            $cond: {
              if: { $gte: ["$drawTimeMinutes", currentMinutes] },
              then: { $subtract: ["$drawTimeMinutes", currentMinutes] },
              else: { $add: [1440, "$drawTimeMinutes"] }, // add 24 hours if the draw time is earlier
            },
          },
        },
      },
      { $sort: { timeDifference: 1 } },
      { $project: { _id: 1, drawTime: 1 } },
    ]);

    console.log("Sorted Draw Times:", drawTimeList);

    return drawTimeList;
  } catch (error) {
    throw error;
  }
};

const agentDataDB = async (id) => {
  try {
    let _id = new mongoose.Types.ObjectId(id);

    const agent = await User.findOne(_id);
    return agent;
  } catch (error) {
    throw error;
  }
};
const deleteEntityAdminDB = async (id) => {
  try {
    console.log("deleteAdminEntity in db ", id);
    const _id = new mongoose.Types.ObjectId(id);
    console.log(_id);
    const deleteItem = await UserData.deleteOne({ _id });
    return deleteItem;
  } catch (error) {
    console.error("Error fetching agent entities:", error);
    throw error;
  }
};
const deleteDrawTimeDB = async (id) => {
  try {
    console.log("deletedeleteDrawTimeDB in db ", id);
    const _id = new mongoose.Types.ObjectId(id);
    console.log(_id);
    const deleteItem = await DrawTimeSchema.deleteOne({ _id });
    return deleteItem;
  } catch (error) {
    console.error("Error fetching agent entities:", error);
    throw error;
  }
};
const deleteColourSettingsDB = async (id) => {
  try {
    console.log("deleteColourSettingsDB in db ", id);
    const _id = new mongoose.Types.ObjectId(id);
    console.log(_id);
    const deleteItem = await RangeSchema.deleteOne({ _id });
    return deleteItem;
  } catch (error) {
    console.error("Error fetching agent entities:", error);
    throw error;
  }
};
const deleteUserDB = async (id) => {
  try {
    console.log("deleteUserDB in db ", id);
    const _id = new mongoose.Types.ObjectId(id);
    console.log(_id);

    // Add await here
    const tickets = await UserData.deleteMany({ userId: _id });
    console.log(tickets);

    const deleteItem = await User.deleteOne({ _id });
    return deleteItem;
  } catch (error) {
    console.error("Error fetching agent entities:", error);
    throw error;
  }
};

module.exports = {
  agentRegisterDB,
  listAgentsDB,
  agentProfileEditDB,
  changeAgentStatusDB,
  agentPasswordChangeDB,
  listEntityDB,
  listOrderDB,
  entityCumulativeDB,
  rangeSetupDB,
  rangeListDB,
  agentDataDB,
  deleteEntityAdminDB,
  drawTimeRangeListDB,
  drawTimeSetupDB,
  deleteDrawTimeDB,
  deleteColourSettingsDB,
  deleteUserDB,
};
