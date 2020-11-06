const express = require('express');
var Router = express.Router();

const mainController = require('../controllers/main.controller');
const mainValidate = require('../validate/main.validate');
const authMiddleware = require('../middleware/auth.middleware');

let initAPIs = (app) => {
	Router.use(authMiddleware.isAuth);
	Router.get('/get/room?:id', mainController.getRoomInfo);
	Router.get('/get/members/room?:id', mainController.getMembers);
	Router.get('/get/expense?:month?:year?:id', mainController.getExpense);
	Router.get('/get/all?:month?:year', mainController.getAll);
	Router.post(
		'/add/product',
		mainValidate.postProduct,
		mainController.postProduct
	);
	Router.post('/delete/product', mainController.deleteProduct);
	return app.use('/api', Router);
};

module.exports = initAPIs;
