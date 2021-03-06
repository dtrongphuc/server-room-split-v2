const mongoose = require('mongoose');
const moment = require('moment');
const User = require('../models/user.model');
const Room = require('../models/room.model');
const Purchase = require('../models/purchase.model');
const Bill = require('../models/bill.model');

let postProduct = async (req, res) => {
	const {
		userID,
		productName,
		productPrice,
		productQuantity,
		productDate,
		members,
	} = req.body;

	try {
		let user = await User.findById(userID);
		let date = productDate.split('-');
		let year = Number.parseInt(date[0]);
		let month = Number.parseInt(date[1]);
		let expense =
			members.length > 0
				? (productPrice * productQuantity) / members.length
				: 0;

		members.map(
			async (member) =>
				await updateBill(member, expense, user.room, month, year)
		);

		Purchase.create({
			user: user._id,
			room: user.room,
			date: productDate,
			productName: productName,
			price: productPrice,
			quantity: productQuantity,
			totalPrice: productPrice * productQuantity,
			members: members.map((member) => mongoose.Types.ObjectId(member)),
		});

		res.status(200).send({
			success: true,
		});
	} catch (err) {
		res.status(500).json(err);
	}
};

let updateBill = async (id, expense, room, month, year) => {
	let bill = await Bill.findOne({
		user: mongoose.Types.ObjectId(id),
		room: mongoose.Types.ObjectId(room),
		month: parseInt(month),
		year: parseInt(year),
	});

	if (!bill) {
		await Bill.create({
			user: mongoose.Types.ObjectId(id),
			room: mongoose.Types.ObjectId(room),
			month: month,
			year: year,
			expense: expense,
		});
	} else {
		await Bill.updateOne(
			{ _id: bill._id },
			{ $inc: { expense: +expense } }
		);
	}
};

let getHistory = async (userID, month, year) => {
	let dataMatched = await Purchase.aggregate([
		{
			$addFields: {
				month: { $month: '$date' },
				year: { $year: '$date' },
			},
		},
		{
			$match: {
				month: month,
				year: year,
				user: userID,
			},
		},
		{
			$project: {
				productName: 1,
				price: 1,
				quantity: 1,
				date: 1,
				totalPrice: 1,
				members: 1,
				_id: 1,
			},
		},
	]);

	let data = await Promise.all(
		dataMatched.map(async (item) => {
			let user = await User.populate(item, {
				path: 'members',
				select: 'realname -_id',
			});
			return {
				...user,
				members: user.members.map((member) => member.toObject()),
			};
		})
	);
	return data;
};

let getHistoryById = async (req, res) => {
	try {
		const { id, month, year } = req.query;
		let dataMatched = await Purchase.aggregate([
			{
				$addFields: {
					month: { $month: '$date' },
					year: { $year: '$date' },
				},
			},
			{
				$match: {
					month: +month,
					year: +year,
					user: mongoose.Types.ObjectId(id),
				},
			},
			{
				$project: {
					productName: 1,
					price: 1,
					quantity: 1,
					date: 1,
					totalPrice: 1,
					members: 1,
					_id: 1,
				},
			},
		]);

		let data = await Promise.all(
			dataMatched.map(async (item) => {
				let user = await User.populate(item, {
					path: 'members',
					select: 'realname -_id',
				});
				return {
					...user,
					members: user.members.map((member) => member.toObject()),
				};
			})
		);
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json(err);
	}
};

let getAll = async (req, res) => {
	try {
		const { data } = req.jwtDecoded;
		const { month, year } = req.query;
		let totalPricePurchase = 0;
		const currentUser = await User.findById(data._id);
		const users = await User.find({
			room: data.room,
			_id: { $ne: currentUser._id },
		});
		const room = await Room.findById(
			data.room,
			'name code price memberCount otherPrice -_id'
		).exec();

		let currentHistory = await getHistory(
			currentUser._id,
			parseInt(month),
			parseInt(year)
		);

		let currentBill = await Bill.find({
			user: currentUser._id,
			room: currentUser.room,
			month: parseInt(month),
			year: parseInt(year),
		});

		let priceOfCurrentUser = currentHistory.reduce((total, item) => {
			if (item.members.length === 0) {
				return total;
			}
			return total + item.totalPrice;
		}, 0);

		totalPricePurchase += priceOfCurrentUser;

		let currentUserData = {
			_id: currentUser._id,
			realname: currentUser.realname,
			purchase: currentHistory,
			priceOfMember: priceOfCurrentUser,
			expense: currentBill.length > 0 ? currentBill[0].expense : 0,
		};

		let membersData = await Promise.all(
			[...users].map(async (user) => {
				let history = await getHistory(
					user._id,
					parseInt(month),
					parseInt(year)
				);

				let bill = await Bill.find({
					user: user._id,
					room: user.room,
					month: parseInt(month),
					year: parseInt(year),
				});

				let priceOfMember = history.reduce((total, item) => {
					if (item.members.length === 0) {
						return total;
					}
					return total + item.totalPrice;
				}, 0);

				totalPricePurchase += priceOfMember;

				return {
					_id: user._id,
					realname: user.realname,
					purchase: history,
					priceOfMember: priceOfMember,
					expense: bill.length > 0 ? bill[0].expense : 0,
				};
			})
		);

		res.status(200).json({
			currentUser: currentUserData,
			membersData: [currentUserData].concat(membersData),
			room: {
				...room.toObject(),
				totalPrice: totalPricePurchase,
			},
		});
	} catch (err) {
		res.status(500).json(err);
	}
};

let deleteProduct = async (req, res) => {
	try {
		let id = req.body.productId;
		let purchase = await Purchase.findById({ _id: id });
		let purchaseClone = { ...purchase.toObject() };
		await Purchase.deleteOne({ _id: id });

		let expense =
			purchase.members.length > 0
				? purchase.totalPrice / purchase.members.length
				: 0;
		let date = purchase.date;
		let month = Number.parseInt(moment(date).format('M'));
		let year = Number.parseInt(moment(date).format('YYYY'));
		purchaseClone.members.forEach(async (member) => {
			await updateBill(member, -expense, purchaseClone.room, month, year);
		});

		return res.status(200).send({
			success: true,
		});
	} catch (error) {
		return res.status(403).send({
			success: false,
			error: {
				message: 'Not found.',
			},
		});
	}
};

let getRoomInfo = async (req, res) => {
	const { id } = req.query;
	try {
		if (!id) {
			throw new Error('Không có id được cung cấp');
		}
		let room = await Room.findById(id);
		if (!room) {
			return res.status(404).send({
				success: false,
				errors: {
					message: 'ID phòng không hợp lệ.',
				},
			});
		}
		return res.status(200).send({
			success: true,
			room,
		});
	} catch (error) {
		return res.status(404).send({
			success: false,
			errors: {
				message: 'ID phòng không hợp lệ.',
			},
		});
	}
};

let getMembers = async (req, res) => {
	const { id } = req.query;
	try {
		if (!id) {
			throw new Error('Không có id được cung cấp');
		}
		let room = await Room.findById(id);
		if (!room) {
			return res.status(404).send({
				success: false,
				errors: {
					message: 'ID phòng không hợp lệ.',
				},
			});
		}

		let members = await User.find(
			{ room: room._id },
			'_id realname active'
		);
		return res.status(200).send({
			success: true,
			members,
		});
	} catch (error) {
		return res.status(404).send({
			success: false,
			errors: {
				message: 'ID phòng không hợp lệ.',
			},
		});
	}
};

let expenseById = async (roomId, userId, month, year) => {
	try {
		let cBill = await Bill.findOne({
			user: userId,
			room: roomId,
			month: +month,
			year: +year,
		});

		return cBill && cBill.expense;
	} catch (error) {
		return error;
	}
};

let priceOfMonthById = async (roomId, userId, month, year) => {
	try {
		let byUser = await Purchase.aggregate([
			{
				$addFields: {
					month: { $month: '$date' },
					year: { $year: '$date' },
				},
			},
			{
				$match: {
					month: +month,
					year: +year,
					user: userId,
					room: roomId,
				},
			},
			{
				$project: {
					totalPrice: 1,
				},
			},
		]);
		let price = byUser.reduce((accumulator, item) => {
			return accumulator + item.totalPrice;
		}, 0);

		return price;
	} catch (error) {
		return res.status(404).json({
			success: false,
			errors: {
				message: error,
			},
		});
	}
};

let getPriceOfMonthById = async (req, res) => {
	try {
		const { roomId, userId, month, year } = req.query;
		let room = await Room.findById(roomId);
		let user = await User.findById(userId);
		if (!room || !user) {
			return res.status(404).json({
				success: false,
				errors: {
					message: 'RoomID hoặc UserID không hợp lệ',
				},
			});
		}
		let expense = await priceOfMonthById(room._id, user._id, month, year);

		return res.status(200).json({
			success: true,
			expense,
		});
	} catch (error) {
		return res.status(404).json({
			success: false,
			errors: {
				message: error,
			},
		});
	}
};

let getPayById = async (req, res) => {
	try {
		const { roomId, userId, month, year } = req.query;
		let room = await Room.findById(roomId);
		let user = await User.findById(userId);
		if (!room || !user) {
			return res.status(404).json({
				success: false,
				errors: {
					message: 'RoomID hoặc UserID không hợp lệ',
				},
			});
		}

		let expense = await priceOfMonthById(room._id, user._id, month, year);

		let billExpense = await expenseById(room._id, user._id, month, year);

		let payment = expense - billExpense;

		return res.status(200).json({
			success: true,
			payment,
		});
	} catch (error) {}
};

let getTotalExpense = async (req, res) => {
	const { id, month, year } = req.query;
	try {
		if (!id) {
			throw new Error('Không có id được cung cấp');
		}
		let room = await Room.findById(id);
		if (!room) {
			return res.status(404).send({
				success: false,
				errors: {
					message: 'ID phòng không hợp lệ.',
				},
			});
		}

		let bills = await Bill.find({
			room: room._id,
			month: +month,
			year: +year,
		});

		let totalExpense = await bills.reduce(async (accumulator, bill) => {
			let total = await accumulator;
			return total + (!!bill ? bill.expense : 0);
		}, Promise.resolve(0));

		return res.status(200).json({
			success: true,
			totalExpense,
		});
	} catch (error) {
		return res.status(404).json({
			success: false,
			errors: {
				message: error,
			},
		});
	}
};

let updateAccountStatus = async (req, res) => {
	try {
		const { userId, isActive } = req.body;

		await User.findByIdAndUpdate(
			userId,
			{
				active: isActive,
			},
			{ useFindAndModify: false }
		);

		return res.status(200).json({
			success: true,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
		});
	}
};

module.exports = {
	getAll,
	postProduct,
	getHistory,
	getHistoryById,
	deleteProduct,
	getRoomInfo,
	getMembers,
	getPriceOfMonthById,
	getTotalExpense,
	getPayById,
	updateAccountStatus,
};
